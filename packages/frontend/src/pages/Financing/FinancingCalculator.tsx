import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { api } from '../../services/api/api';
import { API_ENDPOINTS } from '../../services/api/endpoints';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProviderOption {
  providerId: string;
  providerName: string;
  rate: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
}

interface DurationResult {
  months: number;
  providers: ProviderOption[];
  bestOption: ProviderOption;
}

interface SimulationResult {
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
  createdAt: string;
}

interface FinancingProvider {
  id: string;
  name: string;
  rates: Record<number, number>;
  minAmount: number;
  maxAmount: number;
}

interface EcoAidsResult {
  maprimerenov: {
    eligible: boolean;
    amount: number;
    bracket: string;
    details: string;
  };
  cee: {
    eligible: boolean;
    amount: number;
    details: string;
    perEquipment: Array<{ type: string; amount: number }>;
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

type IncomeBracket = 'tres_modeste' | 'modeste' | 'intermediaire' | 'superieur';

type EquipmentType =
  | 'chauffe_eau_thermodynamique'
  | 'pompe_a_chaleur'
  | 'isolation_murs'
  | 'isolation_combles'
  | 'fenetre_double_vitrage'
  | 'chaudiere_condensation'
  | 'ventilation_double_flux'
  | 'panneau_solaire';

// ─── Constants ──────────────────────────────────────────────────────────────

const DURATIONS = [12, 24, 36, 48, 60] as const;

const INCOME_BRACKETS: Array<{ value: IncomeBracket; label: string }> = [
  { value: 'tres_modeste', label: 'Tres modeste' },
  { value: 'modeste', label: 'Modeste' },
  { value: 'intermediaire', label: 'Intermediaire' },
  { value: 'superieur', label: 'Superieur' },
];

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentType; label: string }> = [
  { value: 'chauffe_eau_thermodynamique', label: 'Chauffe-eau thermodynamique' },
  { value: 'pompe_a_chaleur', label: 'Pompe a chaleur' },
  { value: 'isolation_murs', label: 'Isolation des murs' },
  { value: 'isolation_combles', label: 'Isolation des combles' },
  { value: 'fenetre_double_vitrage', label: 'Fenetres double vitrage' },
  { value: 'chaudiere_condensation', label: 'Chaudiere a condensation' },
  { value: 'ventilation_double_flux', label: 'Ventilation double flux' },
  { value: 'panneau_solaire', label: 'Panneaux solaires' },
];

// ─── Helper ─────────────────────────────────────────────────────────────────

/** Format a price as monthly installment string */
export function formatMonthlyPrice(price: number, months: number = 36, annualRate: number = 4.7): string {
  if (price <= 0 || months <= 0) {return '0 EUR/mois';}
  const monthlyRate = annualRate / 100 / 12;
  const monthly = price * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  return `${Math.round(monthly)} EUR/mois`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyDecimal(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FinancingCalculator(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Abort controller ref for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Section 1: Project Cost Input ──────────────────────────────────────
  const initialAmount = Number(searchParams.get('amount')) || 15000;
  const [totalAmount, setTotalAmount] = useState<number>(initialAmount);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(10);
  const downPayment = useMemo(() => Math.round(totalAmount * downPaymentPercent / 100), [totalAmount, downPaymentPercent]);
  const loanAmount = useMemo(() => totalAmount - downPayment, [totalAmount, downPayment]);

  // ── Section 2: Financing Simulation ────────────────────────────────────
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(36);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [simulationError, setSimulationError] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);

  // ── Section 3: Eco Aids ────────────────────────────────────────────────
  const [incomeBracket, setIncomeBracket] = useState<IncomeBracket>('intermediaire');
  const [householdSize, setHouseholdSize] = useState<number>(2);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType[]>([]);
  const [isRenovation, setIsRenovation] = useState<boolean>(true);
  const [buildingAge, setBuildingAge] = useState<number>(20);
  const [ecoAids, setEcoAids] = useState<EcoAidsResult | null>(null);
  const [ecoAidsLoading, setEcoAidsLoading] = useState<boolean>(false);
  const [ecoAidsError, setEcoAidsError] = useState<string>('');

  // ── Providers ──────────────────────────────────────────────────────────
  const [providers, setProviders] = useState<FinancingProvider[]>([]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ── Load providers on mount ────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function fetchProviders() {
      try {
        const response = await api.get<FinancingProvider[]>(API_ENDPOINTS.FINANCING.PROVIDERS, {
          signal: controller.signal,
        });
        if (response.success && response.data) {
          setProviders(response.data);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
      }
    }

    fetchProviders();

    return () => {
      controller.abort();
    };
  }, []);

  // ── Simulate financing ─────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    if (loanAmount <= 0) {return;}

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setSimulationLoading(true);
    setSimulationError('');

    try {
      const response = await api.post<SimulationResult>(
        API_ENDPOINTS.FINANCING.SIMULATE,
        {
          totalAmount,
          downPayment,
          kitchenId: searchParams.get('kitchenId') || undefined,
          projectId: searchParams.get('projectId') || undefined,
        },
        { signal: controller.signal },
      );

      if (response.success && response.data) {
        setSimulation(response.data);
      } else {
        setSimulationError(response.error?.message || t('financing.simulationError', 'Failed to run simulation'));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {return;}
      setSimulationError(t('financing.networkError', 'Network error. Please try again.'));
    } finally {
      setSimulationLoading(false);
    }
  }, [totalAmount, downPayment, loanAmount, searchParams, t, retryCount]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // ── Calculate eco aids ─────────────────────────────────────────────────
  const calculateEcoAids = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setEcoAidsLoading(true);
    setEcoAidsError('');

    try {
      const response = await api.post<EcoAidsResult>(
        API_ENDPOINTS.FINANCING.ECO_AIDS,
        {
          totalAmount,
          incomeBracket,
          householdSize,
          equipmentTypes: selectedEquipment,
          isRenovation,
          buildingAge: isRenovation ? buildingAge : undefined,
        },
        { signal: controller.signal },
      );

      if (response.success && response.data) {
        setEcoAids(response.data);
      } else {
        setEcoAidsError(response.error?.message || t('financing.ecoAidsError', 'Failed to calculate eco aids'));
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {return;}
      setEcoAidsError(t('financing.networkError', 'Network error. Please try again.'));
    } finally {
      setEcoAidsLoading(false);
    }
  }, [totalAmount, incomeBracket, householdSize, selectedEquipment, isRenovation, buildingAge, t]);

  // ── Get selected duration data ─────────────────────────────────────────
  const selectedDurationData = useMemo(() => {
    if (!simulation) {return null;}
    return simulation.durations.find(d => d.months === selectedDuration) || null;
  }, [simulation, selectedDuration]);

  // ── Toggle equipment type ──────────────────────────────────────────────
  const toggleEquipment = (equipType: EquipmentType) => {
    setSelectedEquipment(prev =>
      prev.includes(equipType)
        ? prev.filter(e => e !== equipType)
        : [...prev, equipType]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('financing.title', 'Calculateur de financement')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('financing.subtitle', 'Simulez votre financement, comparez les offres et decouvrez vos aides.')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Left Column: Inputs ──────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Section 1: Project Cost Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financing.projectCost', 'Cout du projet')}
            </h2>

            {/* Total Amount */}
            <div className="mb-4">
              <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('financing.totalAmount', 'Montant total (EUR)')}
              </label>
              <input
                id="totalAmount"
                type="number"
                min={500}
                max={200000}
                step={500}
                value={totalAmount}
                onChange={e => setTotalAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Down Payment Slider */}
            <div className="mb-4">
              <label htmlFor="downPaymentSlider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('financing.downPayment', 'Apport personnel')}: {downPaymentPercent}% ({formatCurrency(downPayment)})
              </label>
              <input
                id="downPaymentSlider"
                type="range"
                min={0}
                max={50}
                step={5}
                value={downPaymentPercent}
                onChange={e => setDownPaymentPercent(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Calculated Loan Amount */}
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('financing.loanAmount', 'Montant a financer')}
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(loanAmount)}
              </div>
            </div>
          </div>

          {/* Eco Aids Input */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financing.ecoAidsTitle', 'Aides ecologiques')}
            </h2>

            {/* Income Bracket */}
            <div className="mb-4">
              <label htmlFor="incomeBracket" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('financing.incomeBracket', "Tranche de revenus")}
              </label>
              <select
                id="incomeBracket"
                value={incomeBracket}
                onChange={e => setIncomeBracket(e.target.value as IncomeBracket)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {INCOME_BRACKETS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            {/* Household Size */}
            <div className="mb-4">
              <label htmlFor="householdSize" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('financing.householdSize', 'Taille du foyer')}
              </label>
              <input
                id="householdSize"
                type="number"
                min={1}
                max={20}
                value={householdSize}
                onChange={e => setHouseholdSize(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Renovation toggle */}
            <div className="mb-4 flex items-center gap-3">
              <input
                id="isRenovation"
                type="checkbox"
                checked={isRenovation}
                onChange={e => setIsRenovation(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              />
              <label htmlFor="isRenovation" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('financing.isRenovation', 'Projet de renovation')}
              </label>
            </div>

            {/* Building Age */}
            {isRenovation && (
              <div className="mb-4">
                <label htmlFor="buildingAge" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('financing.buildingAge', 'Age du logement (annees)')}
                </label>
                <input
                  id="buildingAge"
                  type="number"
                  min={0}
                  max={500}
                  value={buildingAge}
                  onChange={e => setBuildingAge(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Equipment Checkboxes */}
            <div className="mb-4">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('financing.equipmentTypes', 'Equipements eligibles')}
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(opt.value)}
                      onChange={() => toggleEquipment(opt.value)}
                      className="h-4 w-4 text-green-600 rounded border-gray-300 dark:border-gray-600 focus:ring-green-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={calculateEcoAids}
              disabled={ecoAidsLoading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors"
            >
              {ecoAidsLoading
                ? t('common.loading', 'Chargement...')
                : t('financing.calculateAids', 'Calculer mes aides')}
            </button>

            {ecoAidsError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{ecoAidsError}</p>
            )}
          </div>
        </div>

        {/* ─── Right Column: Results ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 2: Financing Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('financing.financingOptions', 'Options de financement')}
            </h2>

            {simulationLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-gray-500 dark:text-gray-400">
                  {t('financing.simulating', 'Simulation en cours...')}
                </span>
              </div>
            )}

            {simulationError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <p className="text-red-700 dark:text-red-400">{simulationError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount(c => c + 1)}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
                >
                  {t('common.tryAgain', 'Reessayer')}
                </button>
              </div>
            )}

            {simulation && !simulationLoading && (
              <>
                {/* Duration Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {DURATIONS.map(months => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setSelectedDuration(months)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedDuration === months
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {months} {t('financing.months', 'mois')}
                    </button>
                  ))}
                </div>

                {/* Provider Comparison Table */}
                {selectedDurationData && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                            {t('financing.provider', 'Organisme')}
                          </th>
                          <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                            {t('financing.rate', 'TAEG')}
                          </th>
                          <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                            {t('financing.monthly', 'Mensualite')}
                          </th>
                          <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                            {t('financing.totalCost', 'Cout total')}
                          </th>
                          <th className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-right">
                            {t('financing.totalInterest', 'Interets')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDurationData.providers.map((provider, _idx) => {
                          const isBest = provider.providerId === selectedDurationData.bestOption.providerId;
                          return (
                            <tr
                              key={provider.providerId}
                              className={`border-b border-gray-100 dark:border-gray-700 ${
                                isBest ? 'bg-green-50 dark:bg-green-900/20' : ''
                              }`}
                            >
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {provider.providerName}
                                  </span>
                                  {isBest && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                                      {t('financing.bestOffer', 'Meilleure offre')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 text-right text-gray-900 dark:text-white">
                                {provider.rate.toFixed(1)}%
                              </td>
                              <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">
                                {formatCurrencyDecimal(provider.monthlyPayment)}
                              </td>
                              <td className="py-3 text-right text-gray-900 dark:text-white">
                                {formatCurrency(provider.totalCost)}
                              </td>
                              <td className="py-3 text-right text-red-600 dark:text-red-400">
                                +{formatCurrency(provider.totalInterest)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Monthly Payment Chart (visual bar representation) */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('financing.paymentByDuration', 'Mensualite par duree (meilleure offre)')}
                  </h3>
                  <div className="space-y-3">
                    {simulation.durations.map(d => {
                      const maxMonthly = Math.max(...simulation.durations.map(dur => dur.bestOption.monthlyPayment));
                      const widthPercent = maxMonthly > 0 ? (d.bestOption.monthlyPayment / maxMonthly) * 100 : 0;

                      return (
                        <div key={d.months} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right">
                            {d.months} {t('financing.moAbbrev', 'mo')}
                          </span>
                          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full rounded-full flex items-center justify-end pr-2 text-xs font-medium text-white transition-all ${
                                selectedDuration === d.months
                                  ? 'bg-blue-600'
                                  : 'bg-blue-400 dark:bg-blue-500'
                              }`}
                              style={{ width: `${Math.max(widthPercent, 15)}%` }}
                            >
                              {formatCurrencyDecimal(d.bestOption.monthlyPayment)}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">
                            {d.bestOption.providerName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Section 3: Eco Aids Results */}
          {ecoAids && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('financing.ecoAidsResults', 'Vos aides disponibles')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* MaPrimeRenov */}
                <div className={`rounded-lg border p-4 ${
                  ecoAids.maprimerenov.eligible
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">MaPrimeRenov</div>
                  <div className={`text-2xl font-bold mt-1 ${
                    ecoAids.maprimerenov.eligible
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {ecoAids.maprimerenov.eligible ? formatCurrency(ecoAids.maprimerenov.amount) : t('financing.notEligible', 'Non eligible')}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ecoAids.maprimerenov.details}</p>
                </div>

                {/* CEE */}
                <div className={`rounded-lg border p-4 ${
                  ecoAids.cee.eligible
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">CEE</div>
                  <div className={`text-2xl font-bold mt-1 ${
                    ecoAids.cee.eligible
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {ecoAids.cee.eligible ? formatCurrency(ecoAids.cee.amount) : t('financing.notEligible', 'Non eligible')}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ecoAids.cee.details}</p>
                </div>

                {/* TVA Reduite */}
                <div className={`rounded-lg border p-4 ${
                  ecoAids.tvaReduite.applicable
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('financing.tvaReduite', 'TVA Reduite')}
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${
                    ecoAids.tvaReduite.applicable
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {ecoAids.tvaReduite.applicable
                      ? `${ecoAids.tvaReduite.rate}% (-${formatCurrency(ecoAids.tvaReduite.savings)})`
                      : t('financing.standardRate', 'Taux standard 20%')}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ecoAids.tvaReduite.details}</p>
                </div>

                {/* Eco-PTZ */}
                <div className={`rounded-lg border p-4 ${
                  ecoAids.ecoPtz.eligible
                    ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                }`}>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Eco-PTZ</div>
                  <div className={`text-2xl font-bold mt-1 ${
                    ecoAids.ecoPtz.eligible
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {ecoAids.ecoPtz.eligible
                      ? `${t('financing.eligible', 'Eligible')} (${formatCurrency(ecoAids.ecoPtz.maxAmount)} max)`
                      : t('financing.notEligible', 'Non eligible')}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ecoAids.ecoPtz.details}</p>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('financing.totalAids', 'Total des aides')}
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(ecoAids.totalAids)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {t('financing.netCost', 'Cout net apres aides')}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(ecoAids.netCostAfterAids)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Summary Card */}
          {simulation && (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-4">
                {t('financing.summary', 'Recapitulatif')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Best monthly payment */}
                <div className="text-center">
                  <div className="text-sm opacity-80">
                    {t('financing.yourKitchenAt', 'Votre cuisine a')}
                  </div>
                  <div className="text-4xl font-bold mt-1">
                    {formatCurrencyDecimal(simulation.bestOverall.monthlyPayment)}
                  </div>
                  <div className="text-sm opacity-80 mt-1">
                    / {t('financing.perMonth', 'mois')} ({simulation.bestOverall.months} {t('financing.months', 'mois')})
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    {simulation.bestOverall.providerName} - {simulation.bestOverall.rate}%
                  </div>
                </div>

                {/* Cash vs Credit comparison */}
                <div className="text-center">
                  <div className="text-sm opacity-80">
                    {t('financing.cashVsCredit', 'Comptant vs Credit')}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-lg">
                      <span className="opacity-80">{t('financing.cash', 'Cash')}:</span>{' '}
                      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="text-lg">
                      <span className="opacity-80">{t('financing.credit', 'Credit')}:</span>{' '}
                      <span className="font-semibold">{formatCurrency(simulation.bestOverall.totalCost + downPayment)}</span>
                    </div>
                    <div className="text-xs opacity-60">
                      ({t('financing.totalInterestLabel', 'interets')}: +{formatCurrency(simulation.bestOverall.totalInterest)})
                    </div>
                  </div>
                </div>

                {/* Net after aids */}
                <div className="text-center">
                  <div className="text-sm opacity-80">
                    {t('financing.netAfterAids', 'Net apres aides')}
                  </div>
                  <div className="text-3xl font-bold mt-1">
                    {ecoAids
                      ? formatCurrency(ecoAids.netCostAfterAids)
                      : formatCurrency(totalAmount)}
                  </div>
                  {ecoAids && ecoAids.totalAids > 0 && (
                    <div className="text-sm opacity-80 mt-1">
                      (-{formatCurrency(ecoAids.totalAids)} {t('financing.inAids', "d'aides")})
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/certified-quotes')}
                  className="px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {t('financing.requestQuote', 'Demander un devis certifie')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/financing')}
                  className="px-6 py-3 bg-blue-500/30 text-white font-medium rounded-lg hover:bg-blue-500/50 transition-colors border border-white/30"
                >
                  {t('financing.newSimulation', 'Nouvelle simulation')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
