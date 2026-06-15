/**
 * Catalog type -> specifications mapping (CLAUDE.md §15.8 — fix hybride Phase 1).
 *
 * Les SKU ingérés (EPREL/Castorama/…) ont `categoryId = NULL` mais portent leur
 * type dans `specifications` :
 *   - `specifications.productType`  (TOUS : appliance/cabinet/worktop/sink/…)
 *   - `specifications.applianceGroup` (EPREL : dishwashers2019/…)
 * Ce module mappe le `type` extrait par l'IA vers ces champs pour débloquer la
 * recherche SANS toucher la donnée (Phase 2 = vrai categoryId à l'ingestion).
 */

export interface SpecFilter {
  applianceGroups?: string[];
  productTypes?: string[];
}

const APPLIANCE: SpecFilter = { productTypes: ['appliance'] };
const DISHWASHER: SpecFilter = { applianceGroups: ['dishwashers2019'] };
const FRIDGE: SpecFilter = { applianceGroups: ['refrigeratingappliances2019'] };
const OVEN: SpecFilter = { applianceGroups: ['ovens'] };
const HOOD: SpecFilter = { applianceGroups: ['rangehoods'] };
const CABINET: SpecFilter = { productTypes: ['cabinet'] };
const WORKTOP: SpecFilter = { productTypes: ['worktop'] };
const SINK: SpecFilter = { productTypes: ['sink'] };
const TAP: SpecFilter = { productTypes: ['tap'] };
const LIGHTING: SpecFilter = { productTypes: ['lighting'] };
const HARDWARE: SpecFilter = { productTypes: ['handle'] };
const ACCESSORY: SpecFilter = { productTypes: ['accessory'] };
const FACADE: SpecFilter = { productTypes: ['facade'] };

/** Type IA (+ synonymes FR, clés normalisées lowercase) -> filtres spec. */
export const TYPE_TO_SPEC_FILTERS: Record<string, SpecFilter> = {
  // Électroménager (EPREL)
  appliance: APPLIANCE,
  'électroménager': APPLIANCE,
  electromenager: APPLIANCE,
  dishwasher: DISHWASHER,
  'lave-vaisselle': DISHWASHER,
  fridge: FRIDGE,
  refrigerator: FRIDGE,
  frigo: FRIDGE,
  'réfrigérateur': FRIDGE,
  refrigerateur: FRIDGE,
  oven: OVEN,
  four: OVEN,
  hood: HOOD,
  hotte: HOOD,
  // cooktop / microwave : RETIRÉS volontairement (aucun groupe EPREL ingéré ;
  // un fallback "appliance" polluerait les résultats). À activer quand
  // cookinghobs / microwaves2019 seront ingérés.

  // Meuble (Castorama/IKEA/Lapeyre)
  cabinet: CABINET,
  caisson: CABINET,
  meuble: CABINET,
  base: CABINET,
  wall: CABINET,
  tall: CABINET,
  base_cabinet: CABINET,
  wall_cabinet: CABINET,
  tall_cabinet: CABINET,
  worktop: WORKTOP,
  countertop: WORKTOP,
  'plan de travail': WORKTOP,
  sink: SINK,
  'évier': SINK,
  evier: SINK,
  tap: TAP,
  faucet: TAP,
  robinet: TAP,
  mitigeur: TAP,
  lighting: LIGHTING,
  'éclairage': LIGHTING,
  eclairage: LIGHTING,
  luminaire: LIGHTING,
  hardware: HARDWARE,
  'poignée': HARDWARE,
  poignee: HARDWARE,
  accessory: ACCESSORY,
  accessoire: ACCESSORY,
  facade: FACADE,
  'façade': FACADE,
};

/**
 * Construit la clause `OR` pour un filtre type :
 *  - TOUJOURS le filtre legacy `category.name contains type` (backward + forward
 *    compat : un type inconnu retombe sur CE seul filtre, jamais un OR vide).
 *  - + si le type est mappé : `specifications.applianceGroup`/`productType`.
 */
export function buildTypeWhereOr(rawType: string): Record<string, unknown>[] {
  const or: Record<string, unknown>[] = [
    { category: { name: { contains: rawType, mode: 'insensitive' } } },
  ];
  const spec = TYPE_TO_SPEC_FILTERS[rawType.toLowerCase().trim()];
  if (spec) {
    for (const g of spec.applianceGroups ?? []) {
      or.push({ specifications: { path: ['applianceGroup'], equals: g } });
    }
    for (const pt of spec.productTypes ?? []) {
      or.push({ specifications: { path: ['productType'], equals: pt } });
    }
  }
  return or;
}
