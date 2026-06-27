/**
 * Data Normalizer Service
 *
 * Normalizes and validates scraped product data before storage.
 * Ensures consistency across different brand sources.
 */

import crypto from 'crypto';
import { z } from 'zod';
import type { CreateCabinetInput, CabinetType, CabinetCategory } from '../models/cabinet.js';
import type { CreateWorktopInput, WorktopMaterial, WorktopFinish } from '../models/worktop.js';
import type { CreateFacadeInput, FacadeStyle, FacadeMaterial } from '../models/facade.js';
import type { CreateHandleInput, HandleStyle, HandleMaterial } from '../models/handle.js';
import type { CreateApplianceInput, ApplianceType } from '../models/appliance.js';
import type { CreateAccessoryInput, AccessoryType } from '../models/accessory.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants & Mappings
// ═══════════════════════════════════════════════════════════════════════════

// Standard dimension values (in mm)
const STANDARD_CABINET_WIDTHS = [150, 200, 300, 400, 450, 500, 600, 800, 900, 1000, 1200];
const STANDARD_CABINET_HEIGHTS = [720, 780, 900, 1000, 2000, 2100, 2200];
const STANDARD_CABINET_DEPTHS = [320, 350, 560, 580, 600];

const STANDARD_WORKTOP_THICKNESSES = [12, 20, 30, 38, 40, 60];
const STANDARD_WORKTOP_DEPTHS = [600, 620, 650, 900, 1200];

// French to English mappings for cabinet types
const CABINET_TYPE_MAPPING: Record<string, CabinetType> = {
  // French
  bas: 'base_standard',
  'meuble bas': 'base_standard',
  'élément bas': 'base_standard',
  haut: 'wall_standard',
  'meuble haut': 'wall_standard',
  'élément haut': 'wall_standard',
  colonne: 'tall_pantry',
  armoire: 'tall_pantry',
  dressing: 'tall_pantry',
  angle: 'base_corner',
  'angle bas': 'base_corner',
  'angle haut': 'wall_corner',
  tour: 'tall_oven',
  'colonne four': 'tall_oven',
  // English
  base: 'base_standard',
  wall: 'wall_standard',
  tall: 'tall_pantry',
  corner: 'base_corner',
  tower: 'tall_oven',
};

const CABINET_CATEGORY_MAPPING: Record<string, CabinetCategory> = {
  // French
  standard: 'base',
  tiroir: 'base',
  tiroirs: 'base',
  évier: 'base',
  'sous-évier': 'base',
  'sous évier': 'base',
  plaque: 'base',
  'table de cuisson': 'base',
  four: 'tall',
  'colonne four': 'tall',
  réfrigérateur: 'tall',
  frigo: 'tall',
  'lave-vaisselle': 'base',
  lv: 'base',
  rangement: 'base',
  aménagement: 'base',
  blind: 'base',
  aveugle: 'base',
  // English
  base: 'base',
  wall: 'wall',
  tall: 'tall',
  corner: 'corner',
  island: 'island',
  drawer: 'base',
  sink: 'base',
  hob: 'base',
  oven: 'tall',
  fridge: 'tall',
  dishwasher: 'base',
  storage: 'base',
};

const WORKTOP_MATERIAL_MAPPING: Record<string, WorktopMaterial> = {
  // French terms
  stratifié: 'laminate',
  mélaminé: 'laminate',
  'bois massif': 'wood_solid',
  bois: 'wood_solid',
  chêne: 'wood_solid',
  noyer: 'wood_solid',
  placage: 'wood_veneer',
  silestone: 'quartz',
  granit: 'granite',
  marbre: 'marble',
  céramique: 'ceramic',
  dekton: 'ceramic',
  neolith: 'ceramic',
  acier: 'stainless',
  inox: 'stainless',
  fenix: 'compact',
  verre: 'glass',
  krion: 'corian',
  béton: 'concrete',
  'béton ciré': 'concrete',
  // English / shared terms
  laminate: 'laminate',
  wood_solid: 'wood_solid',
  wood_veneer: 'wood_veneer',
  quartz: 'quartz',
  granite: 'granite',
  marble: 'marble',
  ceramic: 'ceramic',
  stainless: 'stainless',
  compact: 'compact',
  glass: 'glass',
  corian: 'corian',
  concrete: 'concrete',
};

const WORKTOP_FINISH_MAPPING: Record<string, WorktopFinish> = {
  mat: 'matte',
  mate: 'matte',
  brillant: 'gloss',
  poli: 'polished',
  satiné: 'satin',
  brossé: 'brushed',
  texturé: 'textured',
  flammé: 'textured',
  brut: 'matte',
  huilé: 'satin',
  matte: 'matte',
  gloss: 'gloss',
  polished: 'polished',
  satin: 'satin',
  brushed: 'brushed',
  textured: 'textured',
};

const FACADE_STYLE_MAPPING: Record<string, FacadeStyle> = {
  moderne: 'flat',
  contemporain: 'flat',
  classique: 'classic',
  traditionnel: 'classic',
  rustique: 'rustic',
  campagne: 'rustic',
  shaker: 'shaker',
  'sans poignée': 'handleless',
  gola: 'handleless',
  intégré: 'handleless',
  industriel: 'flat',
  scandinave: 'flat',
  minimaliste: 'slab',
  flat: 'flat',
  classic: 'classic',
  rustic: 'rustic',
  handleless: 'handleless',
  slab: 'slab',
  beaded: 'beaded',
};

const FACADE_MATERIAL_MAPPING: Record<string, FacadeMaterial> = {
  laqué: 'lacquer_matte',
  laque: 'lacquer_matte',
  'laqué mat': 'lacquer_matte',
  'laqué brillant': 'lacquer_gloss',
  'laqué satiné': 'lacquer_satin',
  mélaminé: 'melamine',
  stratifié: 'laminate',
  'bois massif': 'solid_wood',
  bois: 'veneer',
  placage: 'veneer',
  chêne: 'veneer',
  acrylique: 'acrylic',
  polymère: 'acrylic',
  thermoformé: 'pet',
  pvc: 'pet',
  verre: 'glass',
  aluminium: 'glass',
  alu: 'glass',
  inox: 'glass',
  acier: 'glass',
  béton: 'ceramic',
  céramique: 'ceramic',
  fenix: 'fenix',
  lacquer_matte: 'lacquer_matte',
  lacquer_gloss: 'lacquer_gloss',
  lacquer_satin: 'lacquer_satin',
  melamine: 'melamine',
  laminate: 'laminate',
  solid_wood: 'solid_wood',
  veneer: 'veneer',
  acrylic: 'acrylic',
  pet: 'pet',
  glass: 'glass',
  ceramic: 'ceramic',
};

const APPLIANCE_TYPE_MAPPING: Record<string, ApplianceType> = {
  // French
  four: 'oven_single',
  'four encastrable': 'oven_single',
  'four double': 'oven_double',
  'four compact': 'oven_compact',
  'four vapeur': 'steam_oven',
  'micro-ondes': 'microwave',
  'micro ondes': 'microwave',
  'micro-ondes combiné': 'microwave_combi',
  réfrigérateur: 'fridge_integrated',
  frigo: 'fridge_integrated',
  'réfrigérateur américain': 'fridge_american',
  congélateur: 'freezer',
  combiné: 'fridge_freezer',
  'lave-vaisselle': 'dishwasher_full',
  'lave vaisselle': 'dishwasher_full',
  'lave-vaisselle 45': 'dishwasher_compact',
  plaque: 'hob_induction',
  'plaque de cuisson': 'hob_induction',
  'table de cuisson': 'hob_induction',
  induction: 'hob_induction',
  gaz: 'hob_gas',
  vitrocéramique: 'hob_ceramic',
  'plaque mixte': 'hob_mixed',
  hotte: 'hood_wall',
  'hotte aspirante': 'hood_wall',
  'hotte îlot': 'hood_island',
  'hotte intégrée': 'hood_integrated',
  'hotte plafond': 'hood_ceiling',
  'hotte escamotable': 'hood_downdraft',
  évier: 'sink_single',
  'évier double': 'sink_double',
  robinet: 'tap_standard',
  mitigeur: 'tap_standard',
  'mitigeur douchette': 'tap_pull_out',
  'robinet eau bouillante': 'tap_boiling',
  'cave à vin': 'wine_cooler',
  cafetière: 'coffee_machine',
  'machine à café': 'coffee_machine',
  'tiroir chauffant': 'warming_drawer',
  // English
  oven_single: 'oven_single',
  oven_double: 'oven_double',
  oven_compact: 'oven_compact',
  microwave: 'microwave',
  microwave_combi: 'microwave_combi',
  steam_oven: 'steam_oven',
  fridge_integrated: 'fridge_integrated',
  fridge_freezer: 'fridge_freezer',
  fridge_american: 'fridge_american',
  freezer: 'freezer',
  dishwasher_full: 'dishwasher_full',
  dishwasher_compact: 'dishwasher_compact',
  hob_induction: 'hob_induction',
  hob_gas: 'hob_gas',
  hob_ceramic: 'hob_ceramic',
  hob_mixed: 'hob_mixed',
  hood_wall: 'hood_wall',
  hood_island: 'hood_island',
  hood_integrated: 'hood_integrated',
  hood_ceiling: 'hood_ceiling',
  hood_downdraft: 'hood_downdraft',
  sink_single: 'sink_single',
  sink_double: 'sink_double',
  sink_1_5: 'sink_1_5',
  tap_standard: 'tap_standard',
  tap_pull_out: 'tap_pull_out',
  tap_boiling: 'tap_boiling',
  tap_filtered: 'tap_filtered',
  wine_cooler: 'wine_cooler',
  coffee_machine: 'coffee_machine',
  warming_drawer: 'warming_drawer',
  waste_disposal: 'waste_disposal',
};

// Color normalization
const COLOR_NORMALIZATION: Record<string, string> = {
  // French to standardized
  blanc: 'white',
  noir: 'black',
  gris: 'grey',
  anthracite: 'anthracite',
  beige: 'beige',
  crème: 'cream',
  marron: 'brown',
  brun: 'brown',
  bleu: 'blue',
  vert: 'green',
  rouge: 'red',
  jaune: 'yellow',
  orange: 'orange',
  rose: 'pink',
  violet: 'purple',
  taupe: 'taupe',
  chêne: 'oak',
  noyer: 'walnut',
  wengé: 'wenge',
  naturel: 'natural',
};

// ═══════════════════════════════════════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════════════════════════════════════

const dimensionSchema = z.object({
  width: z.number().min(50).max(3000).optional(),
  height: z.number().min(50).max(3000).optional(),
  depth: z.number().min(50).max(1500).optional(),
});

const priceSchema = z.number().min(0).max(100000).optional();

// ═══════════════════════════════════════════════════════════════════════════
// Normalizer Class
// ═══════════════════════════════════════════════════════════════════════════

export interface NormalizationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  changes: string[];
}

export class DataNormalizer {
  private brandId: string;

  constructor(brandId: string) {
    this.brandId = brandId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cabinet Normalization
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeCabinet(input: Partial<CreateCabinetInput>): NormalizationResult<CreateCabinetInput> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: string[] = [];

    try {
      // Generate reference if missing
      const reference = input.reference || this.generateReference('CAB');
      if (!input.reference) {
        changes.push('Generated reference');
      }

      // Normalize type
      const type = this.normalizeCabinetType(input.type);
      if (type !== input.type) {
        changes.push(`Normalized type: ${input.type} -> ${type}`);
      }

      // Normalize category
      const category = this.normalizeCabinetCategory(input.category);
      if (category !== input.category) {
        changes.push(`Normalized category: ${input.category} -> ${category}`);
      }

      // Normalize and validate dimensions
      const dimensions = this.normalizeDimensions(
        input.width,
        input.height,
        input.depth,
        'cabinet'
      );
      if (dimensions.width !== input.width)
        changes.push(`Adjusted width: ${input.width} -> ${dimensions.width}`);
      if (dimensions.height !== input.height)
        changes.push(`Adjusted height: ${input.height} -> ${dimensions.height}`);
      if (dimensions.depth !== input.depth)
        changes.push(`Adjusted depth: ${input.depth} -> ${dimensions.depth}`);

      // Validate required fields
      if (!input.name?.trim()) {
        errors.push('Name is required');
      }

      if (!dimensions.width) {
        errors.push('Width is required');
      }

      if (!dimensions.height) {
        errors.push('Height is required');
      }

      // Validate URL
      if (!input.url?.trim()) {
        errors.push('URL is required');
      }

      // Normalize price
      const priceHT = this.normalizePrice(input.priceHT);
      const priceTTC = this.normalizePrice(input.priceTTC);

      // Calculate missing price if possible
      let finalPriceHT = priceHT;
      let finalPriceTTC = priceTTC;
      if (priceHT && !priceTTC) {
        finalPriceTTC = Math.round(priceHT * 1.2 * 100) / 100; // 20% TVA
        changes.push('Calculated TTC from HT');
      } else if (priceTTC && !priceHT) {
        finalPriceHT = Math.round((priceTTC / 1.2) * 100) / 100;
        changes.push('Calculated HT from TTC');
      }

      // Normalize name
      const name = this.normalizeName(input.name || '');

      // Normalize description
      const description = this.normalizeDescription(input.description);

      // Normalize images
      const imageThumbnails = this.normalizeImageUrls(input.imageThumbnails || []);
      const imageMain = input.imageMain || imageThumbnails[0];

      if (errors.length > 0) {
        return { success: false, errors, warnings, changes };
      }

      const normalized: CreateCabinetInput = {
        brandId: input.brandId || this.brandId,
        collectionId: input.collectionId,
        externalId: input.externalId,
        reference,
        name,
        description,
        type: type as CabinetType,
        category: category as CabinetCategory,
        width: dimensions.width!,
        height: dimensions.height!,
        depth: dimensions.depth || 580,
        widthMin: input.widthMin,
        widthMax: input.widthMax,
        heightAdjustable: input.heightAdjustable,
        doors: input.doors || 0,
        drawers: input.drawers || 0,
        shelves: input.shelves || 0,
        hasPullOut: input.hasPullOut,
        hasCarousel: input.hasCarousel,
        bins: input.bins,
        applianceTypes: input.applianceTypes,
        sinkCompatible: input.sinkCompatible,
        hobCompatible: input.hobCompatible,
        extractorCompatible: input.extractorCompatible,
        priceHT: finalPriceHT,
        priceTTC: finalPriceTTC,
        priceType: input.priceType,
        availableFinishes: input.availableFinishes,
        availableColors: input.availableColors,
        imageMain,
        imageThumbnails,
        imageTechnical: input.imageTechnical,
        model3D: input.model3D,
        url: input.url!,
        tags: input.tags,
      };

      return { success: true, data: normalized, errors, warnings, changes };
    } catch (error) {
      errors.push(`Normalization error: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings, changes };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Worktop Normalization
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeWorktop(input: Partial<CreateWorktopInput>): NormalizationResult<CreateWorktopInput> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: string[] = [];

    try {
      const reference = input.reference || this.generateReference('WKT');
      if (!input.reference) changes.push('Generated reference');

      // Normalize material
      const material = this.normalizeWorktopMaterial(input.material);
      if (material !== input.material) {
        changes.push(`Normalized material: ${input.material} -> ${material}`);
      }

      // Normalize thicknesses
      const thicknesses =
        input.thicknesses?.map((t) => this.normalizeWorktopThickness(t) || t) || [];

      // Validate
      if (!input.name?.trim()) errors.push('Name is required');
      if (!material) errors.push('Material is required');
      if (!input.url?.trim()) errors.push('URL is required');

      const name = this.normalizeName(input.name || '');
      const images = this.normalizeImageUrls(input.images || []);

      // Normalize prices
      const pricePerSquareMeter = this.normalizePrice(input.pricePerSquareMeter);
      const pricePerMeter = this.normalizePrice(input.pricePerMeter);

      if (errors.length > 0) {
        return { success: false, errors, warnings, changes };
      }

      const normalized: CreateWorktopInput = {
        brandId: input.brandId || this.brandId,
        reference,
        name,
        description: this.normalizeDescription(input.description),
        material: material as WorktopMaterial,
        materialDetail: input.materialDetail,
        thicknesses,
        depths: input.depths,
        maxLength: input.maxLength,
        finishes: input.finishes,
        colors: input.colors,
        heatResistant: input.heatResistant,
        scratchResistant: input.scratchResistant,
        stainResistant: input.stainResistant,
        foodSafe: input.foodSafe,
        antibacterial: input.antibacterial,
        pricePerMeter,
        pricePerSquareMeter,
        priceType: input.priceType,
        images,
        url: input.url!,
      };

      return { success: true, data: normalized, errors, warnings, changes };
    } catch (error) {
      errors.push(`Normalization error: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings, changes };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Facade Normalization
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeFacade(input: Partial<CreateFacadeInput>): NormalizationResult<CreateFacadeInput> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: string[] = [];

    try {
      const reference = input.reference || this.generateReference('FAC');
      if (!input.reference) changes.push('Generated reference');

      // Normalize style
      const style = this.normalizeFacadeStyle(input.style);
      if (style !== input.style) {
        changes.push(`Normalized style: ${input.style} -> ${style}`);
      }

      // Normalize material
      const material = this.normalizeFacadeMaterial(input.material);
      if (material !== input.material) {
        changes.push(`Normalized material: ${input.material} -> ${material}`);
      }

      if (!input.name?.trim()) errors.push('Name is required');
      if (!input.type) errors.push('Type is required');
      if (!input.url?.trim()) errors.push('URL is required');

      const name = this.normalizeName(input.name || '');
      const images = this.normalizeImageUrls(input.images || []);

      if (errors.length > 0) {
        return { success: false, errors, warnings, changes };
      }

      const normalized: CreateFacadeInput = {
        brandId: input.brandId || this.brandId,
        collectionId: input.collectionId,
        reference,
        name,
        description: this.normalizeDescription(input.description),
        type: input.type!,
        style: style as FacadeStyle,
        material: material as FacadeMaterial,
        thickness: input.thickness || 18,
        finishes: input.finishes,
        colors: input.colors,
        edgingType: input.edgingType,
        edgingThickness: input.edgingThickness,
        pricePerSquareMeter: this.normalizePrice(input.pricePerSquareMeter),
        doorPrices: input.doorPrices,
        priceType: input.priceType,
        images,
        url: input.url!,
      };

      return { success: true, data: normalized, errors, warnings, changes };
    } catch (error) {
      errors.push(`Normalization error: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings, changes };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Handle Normalization
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeHandle(input: Partial<CreateHandleInput>): NormalizationResult<CreateHandleInput> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: string[] = [];

    try {
      const reference = input.reference || this.generateReference('HDL');
      if (!input.reference) changes.push('Generated reference');

      if (!input.name?.trim()) errors.push('Name is required');
      if (!input.type) errors.push('Type is required');
      if (!input.material) errors.push('Material is required');
      if (!input.url?.trim()) errors.push('URL is required');

      const name = this.normalizeName(input.name || '');
      const images = this.normalizeImageUrls(input.images || []);

      if (errors.length > 0) {
        return { success: false, errors, warnings, changes };
      }

      const normalized: CreateHandleInput = {
        brandId: input.brandId || this.brandId,
        reference,
        name,
        description: this.normalizeDescription(input.description),
        type: input.type!,
        style: input.style,
        material: input.material!,
        finish: input.finish,
        length: input.length,
        width: input.width,
        projection: input.projection,
        colors: input.colors,
        priceUnit: this.normalizePrice(input.priceUnit),
        pricePack: this.normalizePrice(input.pricePack),
        packQuantity: input.packQuantity,
        priceType: input.priceType,
        images,
        url: input.url!,
      };

      return { success: true, data: normalized, errors, warnings, changes };
    } catch (error) {
      errors.push(`Normalization error: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings, changes };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Appliance Normalization
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeAppliance(
    input: Partial<CreateApplianceInput>
  ): NormalizationResult<CreateApplianceInput> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: string[] = [];

    try {
      const reference = input.reference || this.generateReference('APP');
      if (!input.reference) changes.push('Generated reference');

      // Normalize type
      const type = this.normalizeApplianceType(input.type);
      if (type !== input.type) {
        changes.push(`Normalized type: ${input.type} -> ${type}`);
      }

      if (!input.name?.trim()) errors.push('Name is required');
      if (!type) errors.push('Type is required');
      if (!input.manufacturerBrand?.trim()) errors.push('Manufacturer brand is required');
      if (!input.url?.trim()) errors.push('URL is required');

      const name = this.normalizeName(input.name || '');
      const images = this.normalizeImageUrls(input.images || []);

      // Normalize energy class
      const energyClass = this.normalizeEnergyClass(input.energyClass);

      if (errors.length > 0) {
        return { success: false, errors, warnings, changes };
      }

      const normalized: CreateApplianceInput = {
        brandId: input.brandId || this.brandId,
        manufacturerBrand: input.manufacturerBrand!,
        reference,
        name,
        description: this.normalizeDescription(input.description),
        type: type as ApplianceType,
        width: input.width || 0,
        height: input.height || 0,
        depth: input.depth || 0,
        cutoutWidth: input.cutoutWidth,
        cutoutDepth: input.cutoutDepth,
        energyClass: energyClass as CreateApplianceInput['energyClass'],
        capacity: input.capacity,
        power: input.power,
        noiseLevel: input.noiseLevel,
        programs: input.programs,
        connectivity: input.connectivity,
        priceTTC: this.normalizePrice(input.priceTTC),
        priceType: input.priceType,
        inclusion: input.inclusion,
        images,
        url: input.url!,
      };

      return { success: true, data: normalized, errors, warnings, changes };
    } catch (error) {
      errors.push(`Normalization error: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings, changes };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Accessory Normalization
  // ═══════════════════════════════════════════════════════════════════════════

  normalizeAccessory(
    input: Partial<CreateAccessoryInput>
  ): NormalizationResult<CreateAccessoryInput> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const changes: string[] = [];

    try {
      const reference = input.reference || this.generateReference('ACC');
      if (!input.reference) changes.push('Generated reference');

      if (!input.name?.trim()) errors.push('Name is required');
      if (!input.type) errors.push('Type is required');
      if (!input.url?.trim()) errors.push('URL is required');

      const name = this.normalizeName(input.name || '');
      const images = this.normalizeImageUrls(input.images || []);

      if (errors.length > 0) {
        return { success: false, errors, warnings, changes };
      }

      const normalized: CreateAccessoryInput = {
        brandId: input.brandId || this.brandId,
        reference,
        name,
        description: this.normalizeDescription(input.description),
        type: input.type!,
        width: input.width,
        height: input.height,
        depth: input.depth,
        cabinetTypes: input.cabinetTypes,
        cabinetWidths: input.cabinetWidths,
        universalFit: input.universalFit,
        priceTTC: this.normalizePrice(input.priceTTC),
        priceType: input.priceType,
        images,
        url: input.url!,
      };

      return { success: true, data: normalized, errors, warnings, changes };
    } catch (error) {
      errors.push(`Normalization error: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings, changes };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private generateReference(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `${this.brandId.toUpperCase()}-${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }

  private normalizeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^[a-z]/, (c) => c.toUpperCase());
  }

  private normalizeDescription(description?: string): string | undefined {
    if (!description) return undefined;
    return description
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');
  }

  private normalizeCabinetType(type?: string): CabinetType {
    if (!type) return 'base_standard';
    const lower = type.toLowerCase().trim();
    return CABINET_TYPE_MAPPING[lower] || 'base_standard';
  }

  private normalizeCabinetCategory(category?: string): CabinetCategory {
    if (!category) return 'base';
    const lower = category.toLowerCase().trim();
    return CABINET_CATEGORY_MAPPING[lower] || 'base';
  }

  private normalizeWorktopMaterial(material?: string): WorktopMaterial {
    if (!material) return 'laminate';
    const lower = material.toLowerCase().trim();
    return WORKTOP_MATERIAL_MAPPING[lower] || 'laminate';
  }

  private normalizeWorktopFinish(finish?: string): WorktopFinish {
    if (!finish) return 'matte';
    const lower = finish.toLowerCase().trim();
    return WORKTOP_FINISH_MAPPING[lower] || 'matte';
  }

  private normalizeFacadeStyle(style?: string): FacadeStyle {
    if (!style) return 'flat';
    const lower = style.toLowerCase().trim();
    return FACADE_STYLE_MAPPING[lower] || 'flat';
  }

  private normalizeFacadeMaterial(material?: string): FacadeMaterial {
    if (!material) return 'melamine';
    const lower = material.toLowerCase().trim();
    return FACADE_MATERIAL_MAPPING[lower] || 'melamine';
  }

  private normalizeApplianceType(type?: string): ApplianceType {
    if (!type) return 'oven_single';
    const lower = type.toLowerCase().trim();
    return APPLIANCE_TYPE_MAPPING[lower] || 'oven_single';
  }

  private normalizeDimensions(
    width?: number,
    height?: number,
    depth?: number,
    type: 'cabinet' | 'appliance' = 'cabinet'
  ): { width?: number; height?: number; depth?: number } {
    const result: { width?: number; height?: number; depth?: number } = {};

    if (width) {
      // Snap to nearest standard width if close
      const nearestWidth = STANDARD_CABINET_WIDTHS.reduce((prev, curr) =>
        Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
      );
      result.width = Math.abs(nearestWidth - width) <= 10 ? nearestWidth : width;
    }

    if (height) {
      const nearestHeight = STANDARD_CABINET_HEIGHTS.reduce((prev, curr) =>
        Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
      );
      result.height = Math.abs(nearestHeight - height) <= 10 ? nearestHeight : height;
    }

    if (depth) {
      const nearestDepth = STANDARD_CABINET_DEPTHS.reduce((prev, curr) =>
        Math.abs(curr - depth) < Math.abs(prev - depth) ? curr : prev
      );
      result.depth = Math.abs(nearestDepth - depth) <= 10 ? nearestDepth : depth;
    }

    return result;
  }

  private normalizeWorktopThickness(thickness?: number): number | undefined {
    if (!thickness) return undefined;

    const nearest = STANDARD_WORKTOP_THICKNESSES.reduce((prev, curr) =>
      Math.abs(curr - thickness) < Math.abs(prev - thickness) ? curr : prev
    );

    return Math.abs(nearest - thickness) <= 2 ? nearest : thickness;
  }

  private normalizeStandardDepths(depths?: number[]): number[] {
    if (!depths || depths.length === 0) return [600];

    return depths.map((d) => {
      const nearest = STANDARD_WORKTOP_DEPTHS.reduce((prev, curr) =>
        Math.abs(curr - d) < Math.abs(prev - d) ? curr : prev
      );
      return Math.abs(nearest - d) <= 10 ? nearest : d;
    });
  }

  private normalizePrice(price?: number): number | undefined {
    if (price === undefined || price === null) return undefined;
    if (isNaN(price) || price < 0) return undefined;

    // Round to 2 decimal places
    return Math.round(price * 100) / 100;
  }

  private normalizeColor(color?: string): string | undefined {
    if (!color) return undefined;

    const lower = color.toLowerCase().trim();
    return COLOR_NORMALIZATION[lower] || color;
  }

  private normalizeColors(
    colors: Array<{ name: string; code?: string; hex?: string }>
  ): Array<{ name: string; code?: string; hex?: string }> {
    return colors.map((c) => ({
      ...c,
      name: this.normalizeColor(c.name) || c.name,
    }));
  }

  private normalizeEnergyClass(energyClass?: string): string | undefined {
    if (!energyClass) return undefined;

    // Standardize energy class format
    const upper = energyClass.toUpperCase().trim();

    // Modern EU energy labels: A to G
    if (/^[A-G]$/.test(upper)) return upper;

    // Old EU labels with + (convert to new)
    if (upper === 'A+++') return 'A';
    if (upper === 'A++') return 'B';
    if (upper === 'A+') return 'C';

    return upper;
  }

  private normalizeImageUrls(urls: string[]): string[] {
    return urls
      .filter((url) => url && url.trim())
      .map((url) => {
        let normalized = url.trim();

        // Fix protocol-relative URLs
        if (normalized.startsWith('//')) {
          normalized = 'https:' + normalized;
        }

        // Remove tracking parameters
        try {
          const urlObj = new URL(normalized);
          [
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_content',
            'utm_term',
            'fbclid',
            'gclid',
          ].forEach((param) => {
            urlObj.searchParams.delete(param);
          });
          normalized = urlObj.toString();
        } catch {
          // Invalid URL, return as-is
        }

        return normalized;
      })
      .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Factory Function
// ═══════════════════════════════════════════════════════════════════════════

export function createDataNormalizer(brandId: string): DataNormalizer {
  return new DataNormalizer(brandId);
}

export default DataNormalizer;
