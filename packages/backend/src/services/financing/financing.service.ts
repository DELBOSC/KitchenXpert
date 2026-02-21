import { z } from 'zod';
import { prisma } from '../../database/client';
import { AnthropicService } from '../ai/anthropic.service';
import { SYSTEM_PROMPTS } from '../ai/prompt-templates';
import _logger from '../../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FinancingProvider {
  id: string;
  name: string;
  rates: Record<number, number>; // duration -> annual rate %
  minAmount: number;
  maxAmount: number;
}

export interface ProviderOption {
  providerId: string;
  providerName: string;
  rate: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
}

export interface DurationResult {
  months: number;
  providers: ProviderOption[];
  bestOption: ProviderOption;
}

export interface FinancingSimulationResult {
  id: string;
  totalAmount: number;
  downPayment: number;
  loanAmount: number;
  durations: DurationResult[];
  bestOverall: {
    providerId: string;
    providerName: string;
    months: number;
    rate: number;
    monthlyPayment: number;
    totalCost: number;
    totalInterest: number;
  };
  createdAt: Date;
}

export type IncomeBracket = 'tres_modeste' | 'modeste' | 'intermediaire' | 'superieur';

export type EquipmentType =
  | 'chauffe_eau_thermodynamique'
  | 'pompe_a_chaleur'
  | 'isolation_murs'
  | 'isolation_combles'
  | 'fenetre_double_vitrage'
  | 'chaudiere_condensation'
  | 'ventilation_double_flux'
  | 'panneau_solaire';

export interface EcoAidsResult {
  maprimerenov: {
    eligible: boolean;
    amount: number;
    bracket: IncomeBracket;
    details: string;
  };
  cee: {
    eligible: boolean;
    amount: number;
    details: string;
    perEquipment: Array<{ type: EquipmentType; amount: number }>;
  };
  tvaReduite: {
    applicable: boolean;
    rate: number;
    normalRate: number;
    savings: number;
    details: string;
  };
  ecoPtz: {
    eligible: boolean;
    maxAmount: number;
    interestRate: number;
    maxDurationMonths: number;
    details: string;
  };
  totalAids: number;
  netCostAfterAids: number;
}

export interface ProjectBudgetData {
  totalBudget: number;
  categories: Array<{
    name: string;
    currentAmount: number;
  }>;
  style?: string;
  roomSizeM2?: number;
  isRenovation?: boolean;
}

export interface BudgetAdvice {
  recommendations: Array<{
    category: string;
    suggestedAmount: number;
    suggestedPercentage: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  totalSuggested: number;
  savingsTips: string[];
  warnings: string[];
}

// ─── Input DTOs ─────────────────────────────────────────────────────────────

export interface SimulateDto {
  totalAmount: number;
  downPayment: number;
  kitchenId?: string;
  projectId?: string;
}

export interface EcoAidsDto {
  totalAmount: number;
  incomeBracket: IncomeBracket;
  householdSize: number;
  equipmentTypes: EquipmentType[];
  isRenovation: boolean;
  buildingAge?: number; // years since construction
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DURATIONS = [12, 24, 36, 48, 60] as const;

const PROVIDERS: FinancingProvider[] = [
  {
    id: 'cetelem',
    name: 'Cetelem',
    rates: { 12: 3.9, 24: 4.5, 36: 5.1, 48: 5.5, 60: 5.9 },
    minAmount: 1000,
    maxAmount: 75000,
  },
  {
    id: 'sofinco',
    name: 'Sofinco',
    rates: { 12: 4.2, 24: 4.8, 36: 5.2, 48: 5.7, 60: 6.1 },
    minAmount: 1000,
    maxAmount: 50000,
  },
  {
    id: 'cofidis',
    name: 'Cofidis',
    rates: { 12: 3.5, 24: 4.1, 36: 4.7, 48: 5.1, 60: 5.5 },
    minAmount: 500,
    maxAmount: 35000,
  },
];

/**
 * MaPrimeRenov income thresholds (per household size, Ile-de-France / Other regions).
 * Simplified: using national average thresholds.
 */
const MAPRIMENOV_THRESHOLDS: Record<IncomeBracket, { maxPerPerson: number; maxAid: number }> = {
  tres_modeste: { maxPerPerson: 16229, maxAid: 11000 },
  modeste: { maxPerPerson: 19805, maxAid: 7000 },
  intermediaire: { maxPerPerson: 29148, maxAid: 3500 },
  superieur: { maxPerPerson: 999999, maxAid: 0 },
};

/** CEE amounts per equipment type (in EUR) */
const CEE_AMOUNTS: Record<EquipmentType, { min: number; max: number }> = {
  chauffe_eau_thermodynamique: { min: 150, max: 200 },
  pompe_a_chaleur: { min: 2500, max: 4000 },
  isolation_murs: { min: 8, max: 12 }, // per m2
  isolation_combles: { min: 10, max: 15 }, // per m2
  fenetre_double_vitrage: { min: 40, max: 80 }, // per unit
  chaudiere_condensation: { min: 800, max: 1200 },
  ventilation_double_flux: { min: 300, max: 500 },
  panneau_solaire: { min: 1500, max: 2500 },
};

// ─── AI Response Schema ─────────────────────────────────────────────────────

const BudgetAdviceSchema = z.object({
  recommendations: z.array(z.object({
    category: z.string().max(100),
    suggestedAmount: z.number().min(0),
    suggestedPercentage: z.number().min(0).max(100),
    reason: z.string().max(500),
    priority: z.enum(['high', 'medium', 'low']),
  })).max(15),
  totalSuggested: z.number().min(0),
  savingsTips: z.array(z.string().max(300)).max(10),
  warnings: z.array(z.string().max(300)).max(10),
});

// ─── Service ────────────────────────────────────────────────────────────────

/** Sanitize user input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .slice(0, 200);
}

export class FinancingService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  /**
   * Standard amortization formula: monthly payment for a fixed-rate loan.
   */
  calculateMonthlyPayment(amount: number, annualRate: number, months: number): number {
    if (amount <= 0 || months <= 0) return 0;
    if (annualRate <= 0) return amount / months;

    const monthlyRate = annualRate / 100 / 12;
    const payment = amount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
    return Math.round(payment * 100) / 100;
  }

  /**
   * Run a full financing simulation across all providers and durations.
   * Saves the best option to the database.
   */
  async simulate(userId: string, data: SimulateDto): Promise<FinancingSimulationResult> {
    const loanAmount = data.totalAmount - data.downPayment;

    if (loanAmount <= 0) {
      throw new Error('Loan amount must be positive after down payment');
    }

    const durations: DurationResult[] = [];
    let bestOverall: FinancingSimulationResult['bestOverall'] | null = null;

    for (const months of DURATIONS) {
      const providers: ProviderOption[] = [];

      for (const provider of PROVIDERS) {
        // Skip providers that don't support this amount
        if (loanAmount < provider.minAmount || loanAmount > provider.maxAmount) {
          continue;
        }

        const rate = provider.rates[months];
        if (rate === undefined) continue;

        const monthlyPayment = this.calculateMonthlyPayment(loanAmount, rate, months);
        const totalCost = Math.round(monthlyPayment * months * 100) / 100;
        const totalInterest = Math.round((totalCost - loanAmount) * 100) / 100;

        const option: ProviderOption = {
          providerId: provider.id,
          providerName: provider.name,
          rate,
          monthlyPayment,
          totalCost,
          totalInterest,
        };

        providers.push(option);

        // Track the best overall option (lowest total cost)
        if (!bestOverall || totalCost < bestOverall.totalCost) {
          bestOverall = {
            ...option,
            months,
          };
        }
      }

      if (providers.length > 0) {
        // Sort by total cost (lowest first)
        providers.sort((a, b) => a.totalCost - b.totalCost);

        durations.push({
          months,
          providers,
          bestOption: providers[0]!,
        });
      }
    }

    if (!bestOverall) {
      throw new Error('No financing provider available for this amount');
    }

    // Save the best simulation to the database
    const simulation = await prisma.financingSimulation.create({
      data: {
        userId,
        kitchenId: data.kitchenId || null,
        projectId: data.projectId || null,
        totalAmount: data.totalAmount,
        downPayment: data.downPayment,
        loanAmount,
        interestRate: bestOverall.rate,
        durationMonths: bestOverall.months,
        monthlyPayment: bestOverall.monthlyPayment,
        totalCost: bestOverall.totalCost,
        provider: bestOverall.providerId,
        status: 'simulation',
      },
    });

    return {
      id: simulation.id,
      totalAmount: data.totalAmount,
      downPayment: data.downPayment,
      loanAmount,
      durations,
      bestOverall,
      createdAt: simulation.createdAt,
    };
  }

  /**
   * Calculate eco aids (MaPrimeRenov, CEE, TVA reduite, eco-PTZ).
   */
  async calculateEcoAids(data: EcoAidsDto): Promise<EcoAidsResult> {
    // ── MaPrimeRenov ─────────────────────────────────────────────
    const bracket = data.incomeBracket;
    const thresholds = MAPRIMENOV_THRESHOLDS[bracket];
    const maprimeAmount = thresholds ? thresholds.maxAid : 0;

    const maprimerenov = {
      eligible: maprimeAmount > 0 && data.isRenovation,
      amount: data.isRenovation ? Math.min(maprimeAmount, data.totalAmount * 0.5) : 0,
      bracket,
      details: maprimeAmount > 0 && data.isRenovation
        ? `MaPrimeRenov: aide jusqu'a ${maprimeAmount} EUR pour le profil ${bracket.replace('_', ' ')}`
        : 'Non eligible (profil superieur ou logement neuf)',
    };

    // ── CEE ──────────────────────────────────────────────────────
    const perEquipment: EcoAidsResult['cee']['perEquipment'] = [];
    let ceeTotal = 0;

    for (const equipType of data.equipmentTypes) {
      const amounts = CEE_AMOUNTS[equipType];
      if (amounts) {
        // Use the average of min/max as the estimated amount
        const avgAmount = Math.round((amounts.min + amounts.max) / 2);
        perEquipment.push({ type: equipType, amount: avgAmount });
        ceeTotal += avgAmount;
      }
    }

    const cee = {
      eligible: perEquipment.length > 0,
      amount: ceeTotal,
      details: perEquipment.length > 0
        ? `CEE: ${ceeTotal} EUR pour ${perEquipment.length} equipement(s) eligibles`
        : 'Aucun equipement eligible aux CEE selectionne',
      perEquipment,
    };

    // ── TVA Reduite ──────────────────────────────────────────────
    let tvaRate = 20;
    let tvaDetails = 'TVA standard 20%';
    const hasEnergyEquipment = data.equipmentTypes.some(t =>
      ['pompe_a_chaleur', 'chauffe_eau_thermodynamique', 'chaudiere_condensation', 'panneau_solaire'].includes(t)
    );

    if (data.isRenovation && data.buildingAge && data.buildingAge > 2) {
      if (hasEnergyEquipment) {
        tvaRate = 5.5;
        tvaDetails = 'TVA reduite 5.5% pour renovation energetique (logement > 2 ans)';
      } else {
        tvaRate = 10;
        tvaDetails = "TVA intermediaire 10% pour travaux d'amelioration (logement > 2 ans)";
      }
    }

    const normalTvaAmount = data.totalAmount * 0.2;
    const reducedTvaAmount = data.totalAmount * (tvaRate / 100);
    const tvaSavings = Math.round((normalTvaAmount - reducedTvaAmount) * 100) / 100;

    const tvaReduite = {
      applicable: tvaRate < 20,
      rate: tvaRate,
      normalRate: 20,
      savings: tvaSavings > 0 ? tvaSavings : 0,
      details: tvaDetails,
    };

    // ── Eco-PTZ ──────────────────────────────────────────────────
    const ecoEligible = data.isRenovation && hasEnergyEquipment && data.buildingAge !== undefined && data.buildingAge > 2;
    const ecoPtz = {
      eligible: ecoEligible,
      maxAmount: ecoEligible ? 50000 : 0,
      interestRate: 0,
      maxDurationMonths: ecoEligible ? 240 : 0, // 20 years max
      details: ecoEligible
        ? "Eco-PTZ: pret a taux zero jusqu'a 50 000 EUR pour renovation energetique"
        : 'Non eligible (renovation energetique requise, logement > 2 ans)',
    };

    // ── Totals ───────────────────────────────────────────────────
    const totalAids = maprimerenov.amount + cee.amount + tvaReduite.savings;
    const netCostAfterAids = Math.max(0, Math.round((data.totalAmount - totalAids) * 100) / 100);

    return {
      maprimerenov,
      cee,
      tvaReduite,
      ecoPtz,
      totalAids: Math.round(totalAids * 100) / 100,
      netCostAfterAids,
    };
  }

  /**
   * Return the list of financing providers with their current rates.
   */
  getProviders(): FinancingProvider[] {
    return PROVIDERS;
  }

  /**
   * AI-powered budget allocation recommendations.
   */
  async getAIBudgetAdvice(userId: string, projectData: ProjectBudgetData): Promise<BudgetAdvice> {
    const safeStyle = sanitizeInput(projectData.style);
    const categorySummary = projectData.categories
      .map(c => `${sanitizeInput(c.name)}: ${c.currentAmount} EUR`)
      .join(', ');

    const startTime = Date.now();

    const result = await this.anthropic.generateJSON<BudgetAdvice>({
      system: SYSTEM_PROMPTS.FINANCING_ADVISOR,
      messages: [
        {
          role: 'user',
          content: `Budget total: ${projectData.totalBudget} EUR
Style: ${safeStyle || 'non specifie'}
Surface: ${projectData.roomSizeM2 || 'non specifiee'} m2
Renovation: ${projectData.isRenovation ? 'oui' : 'non'}
Repartition actuelle: ${categorySummary}

Donne-moi des recommandations de repartition budgetaire optimale par poste (meubles, electromenager, plan de travail, pose, plomberie, electricite, etc.). Indique les postes prioritaires et des astuces pour economiser.
Reponds en JSON avec le format: { "recommendations": [...], "totalSuggested": number, "savingsTips": [...], "warnings": [...] }`,
        },
      ],
      maxTokens: 2048,
      parse: (text: string) => {
        const parsed = JSON.parse(text);
        return BudgetAdviceSchema.parse(parsed);
      },
    });

    const durationMs = Date.now() - startTime;

    // Log usage
    await this.anthropic.logUsage(
      userId,
      'anthropic',
      'claude-sonnet-4-5-20250929',
      result.inputTokens,
      result.outputTokens,
      durationMs,
      { feature: 'financing_budget_advice' },
    );

    return result.data;
  }

  /**
   * Retrieve the current user's simulation history.
   */
  async getMySimulations(userId: string): Promise<Array<{
    id: string;
    totalAmount: number;
    downPayment: number;
    loanAmount: number;
    interestRate: number;
    durationMonths: number;
    monthlyPayment: number;
    totalCost: number;
    provider: string | null;
    status: string;
    createdAt: Date;
  }>> {
    const simulations = await prisma.financingSimulation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return simulations;
  }

  /**
   * Get a single simulation by ID (with ownership check).
   */
  async getSimulationById(userId: string, simulationId: string, isAdmin: boolean): Promise<{
    id: string;
    userId: string;
    kitchenId: string | null;
    projectId: string | null;
    totalAmount: number;
    downPayment: number;
    loanAmount: number;
    interestRate: number;
    durationMonths: number;
    monthlyPayment: number;
    totalCost: number;
    provider: string | null;
    ecoAids: unknown;
    status: string;
    createdAt: Date;
  } | null> {
    const simulation = await prisma.financingSimulation.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) return null;

    // Ownership check
    if (simulation.userId !== userId && !isAdmin) {
      return null;
    }

    return simulation;
  }
}

export const financingService = new FinancingService();
export default FinancingService;
