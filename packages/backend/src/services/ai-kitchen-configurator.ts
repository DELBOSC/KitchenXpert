/**
 * AI Kitchen Configurator Service
 *
 * Ce service utilise l'IA pour générer automatiquement des configurations
 * de cuisine optimales basées sur:
 * - Les dimensions exactes de la pièce fournies par l'utilisateur
 * - Le catalogue de produits (meubles et électroménager) avec leurs dimensions précises
 * - Les contraintes d'ergonomie (triangle de travail, hauteurs, espacements)
 * - Les préférences de style et de budget
 */

import crypto from 'crypto';
import type { CatalogItem, ProductDimensions, ProductType } from './catalog-service';

// ============================================================================
// TYPES - Dimensions et Configuration de la Pièce
// ============================================================================

export interface RoomSpecifications {
  /** Largeur de la pièce en cm */
  width: number;
  /** Profondeur de la pièce en cm */
  depth: number;
  /** Hauteur sous plafond en cm */
  height: number;
  /** Unité de mesure */
  unit: 'cm' | 'mm' | 'inch';
  /** Forme de la pièce */
  shape: RoomShape;
  /** Points du polygone pour les formes custom (en cm) */
  customShape?: Point2D[];
  /** Obstacles et contraintes */
  constraints: RoomConstraint[];
  /** Emplacements des prises et arrivées d'eau */
  utilities: UtilityPoint[];
}

export type RoomShape =
  | 'rectangular'
  | 'L-shaped'
  | 'U-shaped'
  | 'galley'
  | 'peninsula'
  | 'island'
  | 'custom';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z: number;
}

export interface RoomConstraint {
  type: ConstraintType;
  position: Point2D;
  dimensions?: { width: number; height: number; depth?: number };
  side?: WallSide;
}

export type ConstraintType =
  | 'door'
  | 'window'
  | 'pillar'
  | 'chimney'
  | 'radiator'
  | 'beam'
  | 'alcove'
  | 'step';

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface UtilityPoint {
  type: 'electrical' | 'water_inlet' | 'water_outlet' | 'gas' | 'ventilation';
  position: Point2D;
  wallSide?: WallSide;
  height?: number;
}

// ============================================================================
// TYPES - Préférences Utilisateur
// ============================================================================

export interface UserPreferences {
  /** Budget minimum et maximum */
  budget?: BudgetRange;
  /** Style préféré */
  style?: KitchenStyle;
  /** Priorités fonctionnelles */
  priorities?: FunctionalPriority[];
  /** Électroménagers obligatoires */
  requiredAppliances?: ApplianceRequirement[];
  /** Couleurs préférées */
  colorPreferences?: ColorPreference;
  /** Type de rangement préféré */
  storagePreferences?: StoragePreference;
  /** Contraintes d'accessibilité */
  accessibility?: AccessibilityRequirements;
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

export type KitchenStyle =
  | 'modern'
  | 'contemporary'
  | 'traditional'
  | 'scandinavian'
  | 'industrial'
  | 'minimalist'
  | 'rustic'
  | 'mediterranean';

export type FunctionalPriority =
  | 'cooking_space'      // Espace de cuisson étendu
  | 'storage'            // Maximum de rangement
  | 'workspace'          // Grand plan de travail
  | 'social'             // Cuisine ouverte/conviviale
  | 'efficiency'         // Triangle de travail optimal
  | 'family_friendly';   // Adapté aux familles

export interface ApplianceRequirement {
  type: ApplianceType;
  quantity: number;
  minWidth?: number;
  preferredBrand?: string;
  features?: string[];
}

export type ApplianceType =
  | 'refrigerator'
  | 'freezer'
  | 'oven'
  | 'cooktop'
  | 'range'
  | 'dishwasher'
  | 'microwave'
  | 'hood'
  | 'wine_cooler'
  | 'coffee_machine'
  | 'washer'
  | 'dryer';

export interface ColorPreference {
  cabinetColor?: string;
  countertopColor?: string;
  accentColor?: string;
  appliance_finish?: 'stainless' | 'black' | 'white' | 'custom';
}

export interface StoragePreference {
  drawerPreference: 'standard' | 'deep' | 'mixed';
  cornerSolution: 'lazy_susan' | 'blind_corner' | 'diagonal' | 'none';
  upperCabinets: 'standard' | 'tall' | 'none';
  pantry: boolean;
}

export interface AccessibilityRequirements {
  wheelchairAccessible: boolean;
  lowerWorkSurface: boolean;
  pullOutShelves: boolean;
  touchFaucets: boolean;
  contrastColors: boolean;
}

// ============================================================================
// TYPES - Configuration Générée
// ============================================================================

export interface KitchenConfiguration {
  id: string;
  name: string;
  description: string;
  layoutType: LayoutType;
  /** Score global de la configuration (0-100) */
  score: number;
  /** Détail des scores */
  scoreBreakdown: ScoreBreakdown;
  /** Items placés dans la configuration */
  placements: ItemPlacement[];
  /** Sections de plan de travail */
  countertopSections: CountertopSection[];
  /** Triangle de travail calculé */
  workTriangle: WorkTriangleAnalysis;
  /** Estimation des coûts */
  costEstimate: CostEstimate;
  /** Statistiques de la configuration */
  statistics: ConfigurationStatistics;
  /** Recommandations d'amélioration */
  recommendations: Recommendation[];
  /** Métadonnées de génération */
  generationMetadata: GenerationMetadata;
}

export type LayoutType =
  | 'I-shaped'    // Linéaire sur un mur
  | 'L-shaped'    // En L sur deux murs adjacents
  | 'U-shaped'    // En U sur trois murs
  | 'G-shaped'    // En G avec péninsule
  | 'parallel'    // Cuisine couloir
  | 'island'      // Avec îlot central
  | 'peninsula';  // Avec péninsule

export interface ScoreBreakdown {
  ergonomics: number;      // Triangle de travail, hauteurs, accessibilité
  functionality: number;   // Rangement, plan de travail, équipements
  aesthetics: number;      // Style, harmonie, proportions
  budget: number;          // Rapport qualité/prix
  spaceUtilization: number; // Utilisation de l'espace disponible
}

export interface ItemPlacement {
  id: string;
  catalogItemId: string;
  catalogItem: CatalogItem;
  position: Point3D;
  rotation: number; // Degrés (0, 90, 180, 270)
  wallSide?: WallSide;
  zone: KitchenZone;
  connections?: PlacementConnection[];
  alternativeItems?: string[]; // IDs de produits alternatifs
}

export type KitchenZone =
  | 'cooking'      // Zone cuisson
  | 'preparation'  // Zone préparation
  | 'cleaning'     // Zone lavage
  | 'storage'      // Zone stockage
  | 'cold'         // Zone froid
  | 'service';     // Zone service/repas

export interface PlacementConnection {
  type: 'electrical' | 'water' | 'gas' | 'ventilation';
  utilityPointId?: string;
  requiresExtension: boolean;
  extensionLength?: number;
}

export interface CountertopSection {
  id: string;
  points: Point2D[];
  material: string;
  color: string;
  thickness: number;
  area: number;
  cutouts: Cutout[];
  edgeProfiles: EdgeProfile[];
}

export interface Cutout {
  type: 'sink' | 'cooktop' | 'pop_up_outlet' | 'custom';
  position: Point2D;
  dimensions: { width: number; depth: number };
  itemId?: string;
}

export interface EdgeProfile {
  side: 'front' | 'back' | 'left' | 'right';
  profile: 'square' | 'beveled' | 'bullnose' | 'ogee' | 'waterfall';
}

export interface WorkTriangleAnalysis {
  sink: Point2D;
  cooktop: Point2D;
  refrigerator: Point2D;
  distances: {
    sinkToCooktop: number;
    cooktopToRefrigerator: number;
    refrigeratorToSink: number;
    total: number;
  };
  isOptimal: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface CostEstimate {
  cabinets: number;
  appliances: number;
  countertops: number;
  installation: number;
  accessories: number;
  total: number;
  currency: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface ConfigurationStatistics {
  totalCabinets: number;
  baseCabinets: number;
  wallCabinets: number;
  tallCabinets: number;
  totalAppliances: number;
  countertopArea: number;      // en cm²
  storageVolume: number;       // en litres
  workSurfaceLength: number;   // en cm linéaire
  floorSpaceCovered: number;   // en cm²
  spaceUtilization: number;    // en %
}

export interface Recommendation {
  type: 'improvement' | 'alternative' | 'warning' | 'tip';
  priority: 'low' | 'medium' | 'high';
  category: 'ergonomics' | 'storage' | 'appliances' | 'safety' | 'budget' | 'style';
  message: string;
  action?: RecommendedAction;
}

export interface RecommendedAction {
  type: 'replace' | 'add' | 'remove' | 'move';
  itemId?: string;
  suggestedItemId?: string;
  suggestedPosition?: Point3D;
}

export interface GenerationMetadata {
  generatedAt: Date;
  processingTime: number;
  algorithmVersion: string;
  catalogItemsEvaluated: number;
  configurationsGenerated: number;
  selectedConfiguration: number;
}

// ============================================================================
// TYPES - Repository et Services
// ============================================================================

export interface AIConfiguratorRepository {
  getCatalogItems(filters?: CatalogFilters): Promise<CatalogItem[]>;
  getCabinetsByDimensions(width: number, depth: number, height: number, tolerance: number): Promise<CatalogItem[]>;
  getAppliancesByType(type: ApplianceType, maxWidth?: number): Promise<CatalogItem[]>;
  saveConfiguration(config: KitchenConfiguration): Promise<KitchenConfiguration>;
  getConfigurationHistory(userId: string): Promise<KitchenConfiguration[]>;
}

export interface CatalogFilters {
  types?: ProductType[];
  brands?: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
}

// ============================================================================
// CONSTANTES - Règles d'Ergonomie
// ============================================================================

const ERGONOMIC_RULES = {
  // Triangle de travail (en cm)
  workTriangle: {
    minTotalDistance: 400,
    maxTotalDistance: 790,
    minLegDistance: 120,
    maxLegDistance: 270,
  },
  // Hauteurs standards (en cm)
  heights: {
    baseCabinetHeight: 87,
    counterHeight: 90,
    wallCabinetBottomMin: 135,
    wallCabinetBottomStandard: 145,
    cookingSurfaceMax: 90,
    sinkHeight: 88,
  },
  // Espaces de circulation (en cm)
  clearance: {
    minPassage: 90,
    minWorkPassage: 120,
    minApplianceFront: 100,
    minOvenOpening: 100,
    minDishwasherOpening: 70,
    minRefrigeratorOpening: 90,
  },
  // Distances minimales (en cm)
  minDistances: {
    cooktopToSink: 40,
    cooktopToRefrigerator: 40,
    cooktopToWall: 40,
    sinkToCorner: 30,
    dishwasherToSink: 60,
  },
  // Dimensions standards des meubles (en cm)
  standardWidths: [30, 40, 45, 50, 60, 80, 90, 100, 120],
  standardDepths: {
    base: 60,
    wall: 35,
    tall: 60,
  },
};

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

export class AIKitchenConfiguratorService {
  constructor(private repository: AIConfiguratorRepository) {}

  /**
   * Génère plusieurs configurations de cuisine optimales
   * basées sur les spécifications de la pièce et les préférences utilisateur
   */
  async generateConfigurations(
    roomSpecs: RoomSpecifications,
    preferences: UserPreferences,
    options?: GenerationOptions
  ): Promise<ConfigurationResult> {
    const startTime = Date.now();
    const maxConfigs = options?.maxConfigurations || 5;

    // 1. Analyser les dimensions et contraintes de la pièce
    const roomAnalysis = this.analyzeRoom(roomSpecs);

    // 2. Déterminer les layouts possibles
    const possibleLayouts = this.determinePossibleLayouts(roomAnalysis, preferences);

    // 3. Récupérer les items du catalogue compatibles
    const catalogItems = await this.fetchCompatibleCatalogItems(
      roomAnalysis,
      preferences
    );

    // 4. Générer les configurations pour chaque layout
    const configurations: KitchenConfiguration[] = [];

    for (const layout of possibleLayouts) {
      const config = await this.generateConfigurationForLayout(
        layout,
        roomAnalysis,
        catalogItems,
        preferences
      );

      if (config) {
        configurations.push(config);
      }

      if (configurations.length >= maxConfigs) break;
    }

    // 5. Scorer et trier les configurations
    const scoredConfigs = configurations
      .map(config => ({
        ...config,
        score: this.calculateOverallScore(config, preferences),
      }))
      .sort((a, b) => b.score - a.score);

    const processingTime = Date.now() - startTime;

    return {
      configurations: scoredConfigs,
      roomAnalysis,
      metadata: {
        generatedAt: new Date(),
        processingTime,
        algorithmVersion: '2.0.0',
        catalogItemsEvaluated: catalogItems.length,
        configurationsGenerated: configurations.length,
        selectedConfiguration: 0,
      },
    };
  }

  /**
   * Analyse les dimensions et caractéristiques de la pièce
   */
  private analyzeRoom(specs: RoomSpecifications): RoomAnalysis {
    // Convertir en cm si nécessaire
    const width = this.convertToCm(specs.width, specs.unit);
    const depth = this.convertToCm(specs.depth, specs.unit);
    const height = this.convertToCm(specs.height, specs.unit);

    // Calculer la surface au sol
    const floorArea = width * depth;

    // Calculer le périmètre utilisable (excluant les contraintes)
    const walls = this.calculateWalls(width, depth, specs.constraints);
    const usableWallLength = walls.reduce((sum, w) => sum + w.usableLength, 0);

    // Identifier les zones possibles pour les différents éléments
    const placementZones = this.identifyPlacementZones(walls, specs.utilities);

    return {
      dimensions: { width, depth, height },
      floorArea,
      walls,
      usableWallLength,
      placementZones,
      constraints: specs.constraints,
      utilities: specs.utilities,
      shape: specs.shape,
    };
  }

  /**
   * Détermine les layouts possibles selon l'espace disponible
   */
  private determinePossibleLayouts(
    roomAnalysis: RoomAnalysis,
    preferences: UserPreferences
  ): LayoutType[] {
    const layouts: LayoutType[] = [];
    const { width, depth } = roomAnalysis.dimensions;
    const minWidth = 200; // cm

    // Cuisine linéaire (I) - toujours possible si au moins un mur
    if (roomAnalysis.usableWallLength >= minWidth) {
      layouts.push('I-shaped');
    }

    // Cuisine en L - nécessite deux murs adjacents
    if (width >= 240 && depth >= 240) {
      layouts.push('L-shaped');
    }

    // Cuisine en U - nécessite trois murs
    if (width >= 300 && depth >= 180) {
      layouts.push('U-shaped');
    }

    // Cuisine parallèle (couloir) - nécessite deux murs face à face
    if (depth >= 180 && width >= 200) {
      layouts.push('parallel');
    }

    // Cuisine avec îlot - nécessite beaucoup d'espace
    if (width >= 400 && depth >= 350 && roomAnalysis.floorArea >= 15_000_00) {
      layouts.push('island');
    }

    // Cuisine avec péninsule
    if (width >= 350 && depth >= 280) {
      layouts.push('peninsula');
    }

    // Filtrer selon les préférences sociales
    if (preferences.priorities?.includes('social') && !layouts.includes('island')) {
      // Prioriser les layouts ouverts
      const socialLayouts: LayoutType[] = ['island', 'peninsula', 'L-shaped'];
      return layouts.filter(l => socialLayouts.includes(l)).length > 0
        ? layouts.filter(l => socialLayouts.includes(l))
        : layouts;
    }

    return layouts;
  }

  /**
   * Récupère les items du catalogue compatibles avec les contraintes
   */
  private async fetchCompatibleCatalogItems(
    roomAnalysis: RoomAnalysis,
    preferences: UserPreferences
  ): Promise<CatalogItem[]> {
    const filters: CatalogFilters = {
      inStock: true,
    };

    // Filtrer par budget si spécifié
    if (preferences.budget) {
      filters.priceMin = 0;
      filters.priceMax = preferences.budget.max * 0.7; // 70% du budget pour les items individuels
    }

    const allItems = await this.repository.getCatalogItems(filters);

    // Filtrer les items qui rentrent physiquement dans l'espace
    return allItems.filter(item => {
      if (!item.dimensions) return false;

      // Vérifier que le meuble peut rentrer
      const itemWidth = this.getDimensionValue(item.dimensions, 'width');
      const itemDepth = this.getDimensionValue(item.dimensions, 'depth');
      const itemHeight = this.getDimensionValue(item.dimensions, 'height');

      // Le meuble doit pouvoir tenir sur au moins un mur
      const canFitOnWall = roomAnalysis.walls.some(
        wall => wall.usableLength >= itemWidth
      );

      // La profondeur ne doit pas bloquer le passage
      const passageRemaining = roomAnalysis.dimensions.depth - itemDepth;
      const hasEnoughPassage = passageRemaining >= ERGONOMIC_RULES.clearance.minPassage;

      // La hauteur doit être compatible avec le plafond
      const heightOk = itemHeight <= roomAnalysis.dimensions.height - 5;

      return canFitOnWall && hasEnoughPassage && heightOk;
    });
  }

  /**
   * Génère une configuration pour un layout spécifique
   */
  private async generateConfigurationForLayout(
    layout: LayoutType,
    roomAnalysis: RoomAnalysis,
    catalogItems: CatalogItem[],
    preferences: UserPreferences
  ): Promise<KitchenConfiguration | null> {
    // Catégoriser les items du catalogue
    const categorizedItems = this.categorizeItems(catalogItems);

    // Placer les éléments obligatoires en premier (évier, plaque, frigo)
    const essentialPlacements = await this.placeEssentialItems(
      layout,
      roomAnalysis,
      categorizedItems,
      preferences
    );

    if (!essentialPlacements) {
      return null; // Impossible de placer les éléments essentiels
    }

    // Optimiser le triangle de travail
    const optimizedPlacements = this.optimizeWorkTriangle(
      essentialPlacements,
      roomAnalysis
    );

    // Compléter avec les meubles de rangement
    const fullPlacements = await this.placeCabinets(
      layout,
      roomAnalysis,
      optimizedPlacements,
      categorizedItems,
      preferences
    );

    // Ajouter les accessoires et finitions
    const finalPlacements = this.addAccessoriesAndFinishes(
      fullPlacements,
      preferences
    );

    // Générer les sections de plan de travail
    const countertopSections = this.generateCountertopSections(
      finalPlacements,
      preferences
    );

    // Calculer le triangle de travail final
    const workTriangle = this.calculateWorkTriangle(finalPlacements);

    // Estimer les coûts
    const costEstimate = this.estimateCosts(
      finalPlacements,
      countertopSections,
      preferences
    );

    // Générer les statistiques
    const statistics = this.calculateStatistics(
      finalPlacements,
      countertopSections,
      roomAnalysis
    );

    // Générer les recommandations
    const recommendations = this.generateRecommendations(
      finalPlacements,
      workTriangle,
      preferences,
      roomAnalysis
    );

    const configId = this.generateId();

    return {
      id: configId,
      name: this.generateConfigName(layout),
      description: this.generateDescription(layout, statistics),
      layoutType: layout,
      score: 0, // Sera calculé plus tard
      scoreBreakdown: this.calculateScoreBreakdown(
        finalPlacements,
        workTriangle,
        statistics,
        costEstimate,
        preferences
      ),
      placements: finalPlacements,
      countertopSections,
      workTriangle,
      costEstimate,
      statistics,
      recommendations,
      generationMetadata: {
        generatedAt: new Date(),
        processingTime: 0,
        algorithmVersion: '2.0.0',
        catalogItemsEvaluated: catalogItems.length,
        configurationsGenerated: 1,
        selectedConfiguration: 0,
      },
    };
  }

  /**
   * Place les éléments essentiels (évier, plaque de cuisson, réfrigérateur)
   */
  private async placeEssentialItems(
    layout: LayoutType,
    roomAnalysis: RoomAnalysis,
    items: CategorizedItems,
    preferences: UserPreferences
  ): Promise<ItemPlacement[] | null> {
    const placements: ItemPlacement[] = [];

    // Trouver l'évier
    const sink = this.selectBestItem(items.sinks, preferences);
    if (!sink) return null;

    // Trouver la plaque de cuisson
    const cooktop = this.selectBestItem(items.cooktops, preferences);
    if (!cooktop) return null;

    // Trouver le réfrigérateur
    const refrigerator = this.selectBestItem(items.refrigerators, preferences);
    if (!refrigerator) return null;

    // Trouver les positions optimales selon le layout
    const positions = this.calculateEssentialPositions(
      layout,
      roomAnalysis,
      {
        sinkWidth: this.getDimensionValue(sink.dimensions, 'width'),
        cooktopWidth: this.getDimensionValue(cooktop.dimensions, 'width'),
        refrigeratorWidth: this.getDimensionValue(refrigerator.dimensions, 'width'),
      }
    );

    // Placement de l'évier (près de l'arrivée d'eau si possible)
    const waterInlet = roomAnalysis.utilities.find(u => u.type === 'water_inlet');
    const sinkPosition = waterInlet
      ? this.adjustPositionToUtility(positions.sink, waterInlet)
      : positions.sink;

    placements.push({
      id: this.generateId(),
      catalogItemId: sink.id,
      catalogItem: sink,
      position: { ...sinkPosition, z: ERGONOMIC_RULES.heights.baseCabinetHeight },
      rotation: 0,
      wallSide: this.getWallSideForPosition(sinkPosition, roomAnalysis),
      zone: 'cleaning',
      connections: [{
        type: 'water',
        utilityPointId: waterInlet?.type,
        requiresExtension: !waterInlet || this.distance2D(sinkPosition, waterInlet.position) > 100,
        extensionLength: waterInlet ? this.distance2D(sinkPosition, waterInlet.position) : undefined,
      }],
    });

    // Placement de la plaque de cuisson
    const gasPoint = roomAnalysis.utilities.find(u => u.type === 'gas');
    const electricalPoint = roomAnalysis.utilities.find(u => u.type === 'electrical');

    placements.push({
      id: this.generateId(),
      catalogItemId: cooktop.id,
      catalogItem: cooktop,
      position: { ...positions.cooktop, z: ERGONOMIC_RULES.heights.counterHeight },
      rotation: 0,
      wallSide: this.getWallSideForPosition(positions.cooktop, roomAnalysis),
      zone: 'cooking',
      connections: gasPoint ? [{
        type: 'gas',
        utilityPointId: gasPoint.type,
        requiresExtension: this.distance2D(positions.cooktop, gasPoint.position) > 50,
      }] : [{
        type: 'electrical',
        utilityPointId: electricalPoint?.type,
        requiresExtension: !electricalPoint || this.distance2D(positions.cooktop, electricalPoint.position) > 150,
      }],
    });

    // Placement du réfrigérateur
    placements.push({
      id: this.generateId(),
      catalogItemId: refrigerator.id,
      catalogItem: refrigerator,
      position: { ...positions.refrigerator, z: 0 },
      rotation: 0,
      wallSide: this.getWallSideForPosition(positions.refrigerator, roomAnalysis),
      zone: 'cold',
      connections: [{
        type: 'electrical',
        requiresExtension: !electricalPoint || this.distance2D(positions.refrigerator, electricalPoint.position) > 200,
      }],
    });

    return placements;
  }

  /**
   * Optimise le triangle de travail
   */
  private optimizeWorkTriangle(
    placements: ItemPlacement[],
    _roomAnalysis: RoomAnalysis
  ): ItemPlacement[] {
    const sink = placements.find(p => p.zone === 'cleaning');
    const cooktop = placements.find(p => p.zone === 'cooking');
    const refrigerator = placements.find(p => p.zone === 'cold');

    if (!sink || !cooktop || !refrigerator) return placements;

    // Calculer le triangle actuel
    const currentTriangle = this.calculateWorkTriangle(placements);

    // Si le triangle est déjà optimal, ne rien faire
    if (currentTriangle.isOptimal) return placements;

    // Sinon, tenter des ajustements
    const optimized = [...placements];

    // Essayer de rapprocher les éléments si le triangle est trop grand
    if (currentTriangle.distances.total > ERGONOMIC_RULES.workTriangle.maxTotalDistance) {
      // Logique d'optimisation...
    }

    return optimized;
  }

  /**
   * Place les meubles de rangement
   */
  private async placeCabinets(
    _layout: LayoutType,
    roomAnalysis: RoomAnalysis,
    existingPlacements: ItemPlacement[],
    items: CategorizedItems,
    preferences: UserPreferences
  ): Promise<ItemPlacement[]> {
    const placements = [...existingPlacements];

    // Calculer l'espace restant sur chaque mur
    const remainingSpaces = this.calculateRemainingSpaces(
      roomAnalysis.walls,
      existingPlacements
    );

    // Priorité des meubles (utilisé dans findBestFitCabinets)
    // const cabinetPriority = this.prioritizeCabinets(preferences);

    // Placer les meubles bas
    for (const space of remainingSpaces) {
      const bestFitCabinets = this.findBestFitCabinets(
        space,
        items.baseCabinets,
        preferences
      );

      for (const cabinet of bestFitCabinets) {
        const position = this.calculateCabinetPosition(
          space,
          cabinet,
          placements
        );

        if (position) {
          placements.push({
            id: this.generateId(),
            catalogItemId: cabinet.id,
            catalogItem: cabinet,
            position,
            rotation: space.rotation,
            wallSide: space.wallSide,
            zone: 'storage',
          });

          // Mettre à jour l'espace restant
          space.usedWidth += this.getDimensionValue(cabinet.dimensions, 'width');
        }
      }
    }

    // Placer les meubles hauts
    for (const space of remainingSpaces) {
      if (preferences.storagePreferences?.upperCabinets === 'none') continue;

      const bestFitWallCabinets = this.findBestFitCabinets(
        space,
        items.wallCabinets,
        preferences
      );

      for (const cabinet of bestFitWallCabinets) {
        // Vérifier qu'il n'y a pas de fenêtre en dessous
        const hasWindow = roomAnalysis.constraints.some(
          c => c.type === 'window' && c.side === space.wallSide
        );
        if (hasWindow) continue;

        const position = this.calculateWallCabinetPosition(
          space,
          cabinet,
          placements
        );

        if (position) {
          placements.push({
            id: this.generateId(),
            catalogItemId: cabinet.id,
            catalogItem: cabinet,
            position,
            rotation: space.rotation,
            wallSide: space.wallSide,
            zone: 'storage',
          });
        }
      }
    }

    // Placer les colonnes si possible
    if (items.tallCabinets.length > 0) {
      const tallCabinetSpace = remainingSpaces.find(
        s => s.width >= 60 && s.allowTallCabinets
      );

      if (tallCabinetSpace) {
        const tallCabinet = this.selectBestItem(items.tallCabinets, preferences);
        if (tallCabinet) {
          placements.push({
            id: this.generateId(),
            catalogItemId: tallCabinet.id,
            catalogItem: tallCabinet,
            position: {
              x: tallCabinetSpace.startX,
              y: tallCabinetSpace.y,
              z: 0,
            },
            rotation: tallCabinetSpace.rotation,
            wallSide: tallCabinetSpace.wallSide,
            zone: 'storage',
          });
        }
      }
    }

    return placements;
  }

  /**
   * Ajoute les accessoires et finitions
   */
  private addAccessoriesAndFinishes(
    placements: ItemPlacement[],
    _preferences: UserPreferences
  ): ItemPlacement[] {
    // Ajouter les poignées selon le style
    // Ajouter les éclairages sous meubles
    // Ajouter les plinthes
    return placements;
  }

  /**
   * Génère les sections de plan de travail
   */
  private generateCountertopSections(
    placements: ItemPlacement[],
    preferences: UserPreferences
  ): CountertopSection[] {
    const sections: CountertopSection[] = [];
    const baseCabinets = placements.filter(p =>
      p.catalogItem.type === 'cabinet' && p.position.z === ERGONOMIC_RULES.heights.baseCabinetHeight
    );

    // Grouper les meubles bas par mur
    const cabinetsByWall = this.groupByWall(baseCabinets);

    for (const [wallSide, cabinets] of Object.entries(cabinetsByWall)) {
      if (cabinets.length === 0) continue;

      // Calculer les points du plan de travail
      const points = this.calculateCountertopPoints(cabinets);

      // Identifier les découpes nécessaires
      const cutouts: Cutout[] = [];

      const sink = placements.find(p => p.zone === 'cleaning');
      if (sink && sink.wallSide === wallSide) {
        cutouts.push({
          type: 'sink',
          position: { x: sink.position.x, y: sink.position.y },
          dimensions: {
            width: this.getDimensionValue(sink.catalogItem.dimensions, 'width') - 10,
            depth: this.getDimensionValue(sink.catalogItem.dimensions, 'depth') - 10,
          },
          itemId: sink.id,
        });
      }

      const cooktop = placements.find(p => p.zone === 'cooking');
      if (cooktop && cooktop.wallSide === wallSide) {
        cutouts.push({
          type: 'cooktop',
          position: { x: cooktop.position.x, y: cooktop.position.y },
          dimensions: {
            width: this.getDimensionValue(cooktop.catalogItem.dimensions, 'width') - 5,
            depth: this.getDimensionValue(cooktop.catalogItem.dimensions, 'depth') - 5,
          },
          itemId: cooktop.id,
        });
      }

      sections.push({
        id: this.generateId(),
        points,
        material: preferences.colorPreferences?.countertopColor ? 'quartz' : 'laminate',
        color: preferences.colorPreferences?.countertopColor || '#FFFFFF',
        thickness: 3,
        area: this.calculatePolygonArea(points),
        cutouts,
        edgeProfiles: [
          { side: 'front', profile: 'bullnose' },
        ],
      });
    }

    return sections;
  }

  /**
   * Calcule le triangle de travail
   */
  private calculateWorkTriangle(placements: ItemPlacement[]): WorkTriangleAnalysis {
    const sink = placements.find(p => p.zone === 'cleaning');
    const cooktop = placements.find(p => p.zone === 'cooking');
    const refrigerator = placements.find(p => p.zone === 'cold');

    const defaultAnalysis: WorkTriangleAnalysis = {
      sink: { x: 0, y: 0 },
      cooktop: { x: 0, y: 0 },
      refrigerator: { x: 0, y: 0 },
      distances: {
        sinkToCooktop: 0,
        cooktopToRefrigerator: 0,
        refrigeratorToSink: 0,
        total: 0,
      },
      isOptimal: false,
      score: 0,
      issues: ['Éléments du triangle de travail manquants'],
      suggestions: [],
    };

    if (!sink || !cooktop || !refrigerator) return defaultAnalysis;

    const sinkPos = { x: sink.position.x, y: sink.position.y };
    const cooktopPos = { x: cooktop.position.x, y: cooktop.position.y };
    const refrigeratorPos = { x: refrigerator.position.x, y: refrigerator.position.y };

    const sinkToCooktop = this.distance2D(sinkPos, cooktopPos);
    const cooktopToRefrigerator = this.distance2D(cooktopPos, refrigeratorPos);
    const refrigeratorToSink = this.distance2D(refrigeratorPos, sinkPos);
    const total = sinkToCooktop + cooktopToRefrigerator + refrigeratorToSink;

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Vérifier les distances
    const { minTotalDistance, maxTotalDistance, minLegDistance, maxLegDistance } = ERGONOMIC_RULES.workTriangle;

    if (total < minTotalDistance) {
      issues.push('Triangle de travail trop compact');
      suggestions.push('Espacer davantage les éléments principaux');
    }
    if (total > maxTotalDistance) {
      issues.push('Triangle de travail trop étendu');
      suggestions.push('Rapprocher les éléments principaux pour réduire les déplacements');
    }
    if (sinkToCooktop < minLegDistance) {
      issues.push('Évier et plaque de cuisson trop proches');
    }
    if (sinkToCooktop > maxLegDistance) {
      issues.push('Évier et plaque de cuisson trop éloignés');
    }

    const isOptimal =
      total >= minTotalDistance &&
      total <= maxTotalDistance &&
      sinkToCooktop >= minLegDistance &&
      sinkToCooktop <= maxLegDistance &&
      cooktopToRefrigerator >= minLegDistance &&
      cooktopToRefrigerator <= maxLegDistance &&
      refrigeratorToSink >= minLegDistance &&
      refrigeratorToSink <= maxLegDistance;

    // Score de 0 à 100
    let score = 100;
    if (!isOptimal) {
      if (total < minTotalDistance || total > maxTotalDistance) score -= 30;
      if (sinkToCooktop < minLegDistance || sinkToCooktop > maxLegDistance) score -= 15;
      if (cooktopToRefrigerator < minLegDistance || cooktopToRefrigerator > maxLegDistance) score -= 15;
      if (refrigeratorToSink < minLegDistance || refrigeratorToSink > maxLegDistance) score -= 15;
    }

    return {
      sink: sinkPos,
      cooktop: cooktopPos,
      refrigerator: refrigeratorPos,
      distances: {
        sinkToCooktop,
        cooktopToRefrigerator,
        refrigeratorToSink,
        total,
      },
      isOptimal,
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  }

  /**
   * Estime les coûts de la configuration
   */
  private estimateCosts(
    placements: ItemPlacement[],
    countertops: CountertopSection[],
    preferences: UserPreferences
  ): CostEstimate {
    let cabinets = 0;
    let appliances = 0;

    for (const placement of placements) {
      const price = placement.catalogItem.price?.amount || 0;
      if (placement.catalogItem.type === 'cabinet') {
        cabinets += price;
      } else {
        appliances += price;
      }
    }

    // Estimer le coût du plan de travail (prix au m²)
    const countertopPricePerSqM = 200; // € par m² en moyenne
    const totalCountertopArea = countertops.reduce((sum, c) => sum + c.area, 0) / 10000; // cm² to m²
    const countertopsCost = totalCountertopArea * countertopPricePerSqM;

    // Estimer le coût d'installation (15-20% du total)
    const subtotal = cabinets + appliances + countertopsCost;
    const installation = subtotal * 0.17;

    // Accessoires (poignées, éclairage, etc.)
    const accessories = cabinets * 0.05;

    return {
      cabinets,
      appliances,
      countertops: countertopsCost,
      installation,
      accessories,
      total: subtotal + installation + accessories,
      currency: preferences.budget?.currency || 'EUR',
      confidence: this.calculateCostConfidence(placements),
    };
  }

  /**
   * Calcule les statistiques de la configuration
   */
  private calculateStatistics(
    placements: ItemPlacement[],
    countertops: CountertopSection[],
    roomAnalysis: RoomAnalysis
  ): ConfigurationStatistics {
    const cabinets = placements.filter(p => p.catalogItem.type === 'cabinet');
    const baseCabinets = cabinets.filter(p => p.position.z === ERGONOMIC_RULES.heights.baseCabinetHeight);
    const wallCabinets = cabinets.filter(p => p.position.z >= ERGONOMIC_RULES.heights.wallCabinetBottomMin);
    const tallCabinets = cabinets.filter(p => {
      const height = this.getDimensionValue(p.catalogItem.dimensions, 'height');
      return height > 180;
    });

    const countertopArea = countertops.reduce((sum, c) => sum + c.area, 0);

    // Calculer le volume de rangement
    let storageVolume = 0;
    for (const cabinet of cabinets) {
      const w = this.getDimensionValue(cabinet.catalogItem.dimensions, 'width');
      const h = this.getDimensionValue(cabinet.catalogItem.dimensions, 'height');
      const d = this.getDimensionValue(cabinet.catalogItem.dimensions, 'depth');
      storageVolume += (w * h * d) / 1000; // Convertir cm³ en litres
    }

    // Calculer la surface au sol couverte
    let floorSpaceCovered = 0;
    for (const placement of placements) {
      const w = this.getDimensionValue(placement.catalogItem.dimensions, 'width');
      const d = this.getDimensionValue(placement.catalogItem.dimensions, 'depth');
      floorSpaceCovered += w * d;
    }

    return {
      totalCabinets: cabinets.length,
      baseCabinets: baseCabinets.length,
      wallCabinets: wallCabinets.length,
      tallCabinets: tallCabinets.length,
      totalAppliances: placements.length - cabinets.length,
      countertopArea,
      storageVolume,
      workSurfaceLength: countertopArea / ERGONOMIC_RULES.standardDepths.base,
      floorSpaceCovered,
      spaceUtilization: (floorSpaceCovered / roomAnalysis.floorArea) * 100,
    };
  }

  /**
   * Génère les recommandations d'amélioration
   */
  private generateRecommendations(
    placements: ItemPlacement[],
    workTriangle: WorkTriangleAnalysis,
    preferences: UserPreferences,
    roomAnalysis: RoomAnalysis
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Recommandations basées sur le triangle de travail
    for (const issue of workTriangle.issues) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        category: 'ergonomics',
        message: issue,
      });
    }

    for (const suggestion of workTriangle.suggestions) {
      recommendations.push({
        type: 'tip',
        priority: 'medium',
        category: 'ergonomics',
        message: suggestion,
      });
    }

    // Recommandations de rangement
    const storageItems = placements.filter(p => p.zone === 'storage');
    if (storageItems.length < 5 && preferences.priorities?.includes('storage')) {
      recommendations.push({
        type: 'improvement',
        priority: 'high',
        category: 'storage',
        message: 'Le rangement est limité. Considérez des meubles hauts supplémentaires ou une colonne.',
      });
    }

    // Recommandations de sécurité
    const cooktop = placements.find(p => p.zone === 'cooking');
    if (cooktop) {
      // Vérifier la distance au mur
      const distanceToWall = Math.min(
        cooktop.position.x,
        roomAnalysis.dimensions.width - cooktop.position.x
      );
      if (distanceToWall < ERGONOMIC_RULES.minDistances.cooktopToWall) {
        recommendations.push({
          type: 'warning',
          priority: 'high',
          category: 'safety',
          message: `La plaque de cuisson est trop proche du mur (${distanceToWall}cm). Minimum recommandé: ${ERGONOMIC_RULES.minDistances.cooktopToWall}cm.`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Calcule le score détaillé
   */
  private calculateScoreBreakdown(
    placements: ItemPlacement[],
    workTriangle: WorkTriangleAnalysis,
    statistics: ConfigurationStatistics,
    costEstimate: CostEstimate,
    preferences: UserPreferences
  ): ScoreBreakdown {
    // Ergonomie (basé sur le triangle de travail)
    const ergonomics = workTriangle.score;

    // Fonctionnalité (rangement, équipements)
    let functionality = 50;
    if (statistics.storageVolume > 500) functionality += 20;
    if (statistics.totalAppliances >= 3) functionality += 15;
    if (statistics.countertopArea > 10000) functionality += 15;

    // Esthétique (proportions, harmonie)
    let aesthetics = 70;
    // Bonus si tous les éléments sont de la même marque
    const brands = new Set(placements.map(p => p.catalogItem.brand));
    if (brands.size <= 2) aesthetics += 15;

    // Budget (respect du budget)
    let budget = 100;
    if (preferences.budget) {
      if (costEstimate.total > preferences.budget.max) {
        budget = Math.max(0, 100 - ((costEstimate.total - preferences.budget.max) / preferences.budget.max) * 100);
      } else if (costEstimate.total < preferences.budget.min) {
        budget = 80; // Sous le budget minimum peut indiquer une qualité moindre
      }
    }

    // Utilisation de l'espace
    const spaceUtilization = Math.min(100, statistics.spaceUtilization * 2);

    return {
      ergonomics,
      functionality: Math.min(100, functionality),
      aesthetics,
      budget,
      spaceUtilization,
    };
  }

  /**
   * Calcule le score global
   */
  private calculateOverallScore(
    config: KitchenConfiguration,
    preferences: UserPreferences
  ): number {
    const weights = {
      ergonomics: 0.25,
      functionality: 0.25,
      aesthetics: 0.15,
      budget: 0.20,
      spaceUtilization: 0.15,
    };

    // Ajuster les poids selon les priorités
    if (preferences.priorities?.includes('storage')) {
      weights.functionality = 0.30;
      weights.aesthetics = 0.10;
    }
    if (preferences.priorities?.includes('efficiency')) {
      weights.ergonomics = 0.35;
      weights.spaceUtilization = 0.10;
    }

    const { scoreBreakdown } = config;

    return Math.round(
      scoreBreakdown.ergonomics * weights.ergonomics +
      scoreBreakdown.functionality * weights.functionality +
      scoreBreakdown.aesthetics * weights.aesthetics +
      scoreBreakdown.budget * weights.budget +
      scoreBreakdown.spaceUtilization * weights.spaceUtilization
    );
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES
  // ============================================================================

  private convertToCm(value: number, unit: 'cm' | 'mm' | 'inch'): number {
    switch (unit) {
      case 'mm': return value / 10;
      case 'inch': return value * 2.54;
      default: return value;
    }
  }

  private calculateWalls(
    width: number,
    depth: number,
    constraints: RoomConstraint[]
  ): WallInfo[] {
    const walls: Array<{ side: WallSide; length: number; usableLength: number; startX: number; y: number; rotation: number }> = [
      { side: 'north', length: width, usableLength: width, startX: 0, y: 0, rotation: 0 },
      { side: 'east', length: depth, usableLength: depth, startX: width, y: 0, rotation: 90 },
      { side: 'south', length: width, usableLength: width, startX: 0, y: depth, rotation: 180 },
      { side: 'west', length: depth, usableLength: depth, startX: 0, y: 0, rotation: 270 },
    ];
    return walls.map(wall => {
      const wallConstraints = constraints.filter(c => c.side === wall.side);
      const usedLength = wallConstraints.reduce(
        (sum, c) => sum + (c.dimensions?.width || 100),
        0
      );
      return { ...wall, usableLength: wall.length - usedLength };
    });
  }

  private identifyPlacementZones(
    walls: WallInfo[],
    utilities: UtilityPoint[]
  ): PlacementZone[] {
    const zones: PlacementZone[] = [];

    for (const wall of walls) {
      const wallUtilities = utilities.filter(u => u.wallSide === wall.side);

      zones.push({
        wallSide: wall.side,
        startX: wall.startX,
        y: wall.y,
        width: wall.usableLength,
        rotation: wall.rotation,
        hasWater: wallUtilities.some(u => u.type === 'water_inlet'),
        hasGas: wallUtilities.some(u => u.type === 'gas'),
        hasElectrical: wallUtilities.some(u => u.type === 'electrical'),
        allowTallCabinets: true,
        usedWidth: 0,
      });
    }

    return zones;
  }

  private categorizeItems(items: CatalogItem[]): CategorizedItems {
    return {
      baseCabinets: items.filter(i => i.type === 'cabinet' && i.category === 'base'),
      wallCabinets: items.filter(i => i.type === 'cabinet' && i.category === 'wall'),
      tallCabinets: items.filter(i => i.type === 'cabinet' && i.category === 'tall'),
      sinks: items.filter(i => i.type === 'sink'),
      cooktops: items.filter(i => i.type === 'appliance' && i.category === 'cooktop'),
      ovens: items.filter(i => i.type === 'appliance' && i.category === 'oven'),
      refrigerators: items.filter(i => i.type === 'appliance' && i.category === 'refrigerator'),
      dishwashers: items.filter(i => i.type === 'appliance' && i.category === 'dishwasher'),
      hoods: items.filter(i => i.type === 'appliance' && i.category === 'hood'),
      other: items.filter(i => !['cabinet', 'sink', 'appliance'].includes(i.type)),
    };
  }

  private selectBestItem(
    items: CatalogItem[],
    preferences: UserPreferences
  ): CatalogItem | undefined {
    if (items.length === 0) return undefined;

    let filtered = items;

    // Filtrer par budget si spécifié
    if (preferences.budget) {
      filtered = filtered.filter(
        i => !i.price || i.price.amount <= preferences.budget!.max * 0.3
      );
    }

    // Trier par score (disponibilité, rating, prix)
    return filtered.sort((a, b) => {
      const scoreA = (a.rating?.average || 0) + (a.availability.inStock ? 10 : 0);
      const scoreB = (b.rating?.average || 0) + (b.availability.inStock ? 10 : 0);
      return scoreB - scoreA;
    })[0];
  }

  private calculateEssentialPositions(
    layout: LayoutType,
    roomAnalysis: RoomAnalysis,
    sizes: { sinkWidth: number; cooktopWidth: number; refrigeratorWidth: number }
  ): { sink: Point2D; cooktop: Point2D; refrigerator: Point2D } {
    const { width, depth } = roomAnalysis.dimensions;

    switch (layout) {
      case 'L-shaped':
        return {
          sink: { x: width / 3, y: 30 },
          cooktop: { x: 30, y: depth / 3 },
          refrigerator: { x: 30, y: depth - 60 },
        };

      case 'U-shaped':
        return {
          sink: { x: width / 2, y: 30 },
          cooktop: { x: 30, y: depth / 2 },
          refrigerator: { x: width - 60, y: depth / 2 },
        };

      case 'island':
        return {
          sink: { x: width / 2, y: 30 },
          cooktop: { x: width / 2, y: depth / 2 },
          refrigerator: { x: 30, y: depth / 2 },
        };

      case 'I-shaped':
      default:
        return {
          sink: { x: width / 2, y: 30 },
          cooktop: { x: width / 2 + sizes.sinkWidth + 60, y: 30 },
          refrigerator: { x: width - sizes.refrigeratorWidth - 30, y: 30 },
        };
    }
  }

  private getDimensionValue(dimensions: ProductDimensions, key: 'width' | 'height' | 'depth'): number {
    return dimensions[key] || 60;
  }

  private distance2D(p1: Point2D, p2: Point2D): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private calculatePolygonArea(points: Point2D[]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      if (p1 && p2) {
        area += p1.x * p2.y - p2.x * p1.y;
      }
    }
    return Math.abs(area) / 2;
  }

  private generateId(): string {
    return crypto.randomBytes(12).toString('base64url');
  }

  private generateConfigName(layout: LayoutType): string {
    const names: Record<LayoutType, string> = {
      'I-shaped': 'Cuisine Linéaire',
      'L-shaped': 'Cuisine en L',
      'U-shaped': 'Cuisine en U',
      'G-shaped': 'Cuisine en G',
      'parallel': 'Cuisine Couloir',
      'island': 'Cuisine avec Îlot',
      'peninsula': 'Cuisine avec Péninsule',
    };
    return names[layout] || 'Configuration Personnalisée';
  }

  private generateDescription(layout: LayoutType, stats: ConfigurationStatistics): string {
    return `Configuration ${layout} avec ${stats.totalCabinets} meubles, ` +
           `${stats.totalAppliances} électroménagers et ${(stats.countertopArea / 10000).toFixed(1)}m² de plan de travail.`;
  }

  private adjustPositionToUtility(position: Point2D, utility: UtilityPoint): Point2D {
    const maxDistance = 100;
    const distance = this.distance2D(position, utility.position);

    if (distance <= maxDistance) {
      return utility.position;
    }

    return position;
  }

  private getWallSideForPosition(position: Point2D, roomAnalysis: RoomAnalysis): WallSide {
    const { width, depth } = roomAnalysis.dimensions;

    if (position.y < 60) return 'north';
    if (position.y > depth - 60) return 'south';
    if (position.x < 60) return 'west';
    if (position.x > width - 60) return 'east';

    return 'north';
  }

  private calculateRemainingSpaces(
    walls: WallInfo[],
    placements: ItemPlacement[]
  ): PlacementZone[] {
    return walls.map(wall => {
      const wallPlacements = placements.filter(p => p.wallSide === wall.side);
      const usedWidth = wallPlacements.reduce(
        (sum, p) => sum + this.getDimensionValue(p.catalogItem.dimensions, 'width'),
        0
      );

      return {
        wallSide: wall.side,
        startX: wall.startX,
        y: wall.y,
        width: wall.usableLength - usedWidth,
        rotation: wall.rotation,
        hasWater: false,
        hasGas: false,
        hasElectrical: true,
        allowTallCabinets: true,
        usedWidth,
      };
    });
  }

  private findBestFitCabinets(
    space: PlacementZone,
    cabinets: CatalogItem[],
    _preferences: UserPreferences
  ): CatalogItem[] {
    const result: CatalogItem[] = [];
    let remainingWidth = space.width - space.usedWidth;

    const sortedCabinets = [...cabinets].sort((a, b) => {
      const widthA = this.getDimensionValue(a.dimensions, 'width');
      const widthB = this.getDimensionValue(b.dimensions, 'width');
      return widthB - widthA;
    });

    for (const cabinet of sortedCabinets) {
      const cabinetWidth = this.getDimensionValue(cabinet.dimensions, 'width');

      if (cabinetWidth <= remainingWidth) {
        result.push(cabinet);
        remainingWidth -= cabinetWidth;
      }

      if (remainingWidth < 30) break;
    }

    return result;
  }

  private calculateCabinetPosition(
    space: PlacementZone,
    cabinet: CatalogItem,
    _existingPlacements: ItemPlacement[]
  ): Point3D | null {
    const cabinetWidth = this.getDimensionValue(cabinet.dimensions, 'width');

    let x = space.startX + space.usedWidth;

    if (x + cabinetWidth > space.startX + space.width) {
      return null;
    }

    return {
      x,
      y: space.y,
      z: ERGONOMIC_RULES.heights.baseCabinetHeight,
    };
  }

  private calculateWallCabinetPosition(
    space: PlacementZone,
    cabinet: CatalogItem,
    _existingPlacements: ItemPlacement[]
  ): Point3D | null {
    const cabinetWidth = this.getDimensionValue(cabinet.dimensions, 'width');

    let x = space.startX + space.usedWidth;

    if (x + cabinetWidth > space.startX + space.width) {
      return null;
    }

    return {
      x,
      y: space.y,
      z: ERGONOMIC_RULES.heights.wallCabinetBottomStandard,
    };
  }

  private groupByWall(placements: ItemPlacement[]): Record<string, ItemPlacement[]> {
    const grouped: Record<string, ItemPlacement[]> = {};

    for (const placement of placements) {
      const wall = placement.wallSide || 'unknown';
      if (!grouped[wall]) grouped[wall] = [];
      grouped[wall].push(placement);
    }

    return grouped;
  }

  private calculateCountertopPoints(cabinets: ItemPlacement[]): Point2D[] {
    if (cabinets.length === 0) return [];

    const sorted = [...cabinets].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    const depth = ERGONOMIC_RULES.standardDepths.base;
    const overhang = 3;

    return [
      { x: first.position.x - overhang, y: first.position.y - overhang },
      { x: last.position.x + this.getDimensionValue(last.catalogItem.dimensions, 'width') + overhang, y: first.position.y - overhang },
      { x: last.position.x + this.getDimensionValue(last.catalogItem.dimensions, 'width') + overhang, y: first.position.y + depth + overhang },
      { x: first.position.x - overhang, y: first.position.y + depth + overhang },
    ];
  }

  private calculateCostConfidence(placements: ItemPlacement[]): 'low' | 'medium' | 'high' {
    const itemsWithPrices = placements.filter(p => p.catalogItem.price?.amount);
    const ratio = itemsWithPrices.length / placements.length;

    if (ratio > 0.8) return 'high';
    if (ratio > 0.5) return 'medium';
    return 'low';
  }
}

// ============================================================================
// TYPES SUPPLÉMENTAIRES
// ============================================================================

interface RoomAnalysis {
  dimensions: { width: number; depth: number; height: number };
  floorArea: number;
  walls: WallInfo[];
  usableWallLength: number;
  placementZones: PlacementZone[];
  constraints: RoomConstraint[];
  utilities: UtilityPoint[];
  shape: RoomShape;
}

interface WallInfo {
  side: WallSide;
  length: number;
  usableLength: number;
  startX: number;
  y: number;
  rotation: number;
}

interface PlacementZone {
  wallSide: WallSide;
  startX: number;
  y: number;
  width: number;
  rotation: number;
  hasWater: boolean;
  hasGas: boolean;
  hasElectrical: boolean;
  allowTallCabinets: boolean;
  usedWidth: number;
}

interface CategorizedItems {
  baseCabinets: CatalogItem[];
  wallCabinets: CatalogItem[];
  tallCabinets: CatalogItem[];
  sinks: CatalogItem[];
  cooktops: CatalogItem[];
  ovens: CatalogItem[];
  refrigerators: CatalogItem[];
  dishwashers: CatalogItem[];
  hoods: CatalogItem[];
  other: CatalogItem[];
}

export interface GenerationOptions {
  maxConfigurations?: number;
  includeIsland?: boolean;
  prioritizeErgonomics?: boolean;
}

export interface ConfigurationResult {
  configurations: KitchenConfiguration[];
  roomAnalysis: RoomAnalysis;
  metadata: GenerationMetadata;
}

export class AIConfiguratorError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AIConfiguratorError';
  }
}

export function createAIKitchenConfiguratorService(
  repository: AIConfiguratorRepository
): AIKitchenConfiguratorService {
  return new AIKitchenConfiguratorService(repository);
}

export default AIKitchenConfiguratorService;
