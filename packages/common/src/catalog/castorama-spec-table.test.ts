import { parseSpecTable } from './castorama-spec-table';

/** Construit une table specifications Castorama a partir de paires label/valeur. */
const table = (rows: Array<[string, string]>): string =>
  `<html><body><table class="border-t-size-0" aria-labelledby="specifications"><tbody>${rows
    .map(([l, v]) => `<tr><th class="x">${l}</th><td class="y">${v}</td></tr>`)
    .join('')}</tbody></table></body></html>`;

describe('parseSpecTable', () => {
  it('cabinet : 3 cotes valides -> width/height/depth + conf 1.0', () => {
    const r = parseSpecTable(
      table([['Hauteur (cm)', '90cm'], ['Largeur (cm)', '61cm'], ['Profondeur (cm)', '56cm']]),
      'cabinet',
    );
    expect(r.heightMm).toBe(900);
    expect(r.widthMm).toBe(610);
    expect(r.depthMm).toBe(560);
    expect(r.dimCount).toBe(3);
    expect(r.confidence).toBe(1.0);
    expect(r.qualityFlags).toHaveLength(0);
    expect(r.rawMeasureText).toContain('Hauteur (cm):90cm');
  });

  it('worktop : Profondeur=300 -> width (longueur), PAS depth (sanity catch)', () => {
    const r = parseSpecTable(table([['Profondeur (cm)', '300cm']]), 'worktop');
    expect(r.widthMm).toBe(3000); // 300cm > 150 -> longueur -> widthMm
    expect(r.depthMm).toBeNull();
    expect(r.dimCount).toBe(1);
    expect(r.confidence).toBe(0.4);
  });

  it('worktop : Profondeur=60 (<80) -> depth ; Longueur -> width', () => {
    const r = parseSpecTable(
      table([['Longueur (cm)', '300cm'], ['Profondeur (cm)', '60cm']]),
      'worktop',
    );
    expect(r.widthMm).toBe(3000);
    expect(r.depthMm).toBe(600);
    expect(r.dimCount).toBe(2);
    expect(r.confidence).toBe(0.7);
  });

  it('worktop : Profondeur en zone grise (80-150) -> ambiguous, non assignee', () => {
    const r = parseSpecTable(table([['Profondeur (cm)', '100cm']]), 'worktop');
    expect(r.widthMm).toBeNull();
    expect(r.depthMm).toBeNull();
    expect(r.qualityFlags).toContain('ambiguous_profondeur');
  });

  it('facade : 2 cotes -> width/height + conf 0.7', () => {
    const r = parseSpecTable(
      table([['Hauteur (cm)', '118.1cm'], ['Largeur (cm)', '59.7cm']]),
      'facade',
    );
    expect(r.heightMm).toBe(1181);
    expect(r.widthMm).toBe(597);
    expect(r.dimCount).toBe(2);
    expect(r.confidence).toBe(0.7);
  });

  it('sink : Longueur -> width, Largeur -> depth', () => {
    const r = parseSpecTable(
      table([['Longueur (cm)', '80cm'], ['Largeur (cm)', '50cm']]),
      'sink',
    );
    expect(r.widthMm).toBe(800);
    expect(r.depthMm).toBe(500);
    expect(r.dimCount).toBe(2);
  });

  it('tap : Hauteur seule -> height + conf 0.4', () => {
    const r = parseSpecTable(table([['Hauteur (cm)', '30cm']]), 'tap');
    expect(r.heightMm).toBe(300);
    expect(r.widthMm).toBeNull();
    expect(r.dimCount).toBe(1);
    expect(r.confidence).toBe(0.4);
  });

  it('table absente -> resultat vide (fallback name-parse en amont)', () => {
    const r = parseSpecTable('<html><body><p>aucune table</p></body></html>', 'cabinet');
    expect(r.dimCount).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.rawMeasureText).toBeNull();
    expect(r.widthMm).toBeNull();
  });

  it('valeur en mm -> convertie en cm puis mm entiers', () => {
    const r = parseSpecTable(table([['Largeur (cm)', '610 mm']]), 'cabinet');
    expect(r.widthMm).toBe(610); // 610mm = 61cm -> 610mm
  });

  it('valeur hors bornes -> cote ignoree + qualityFlag out_of_bounds', () => {
    const r = parseSpecTable(table([['Profondeur (cm)', '300cm']]), 'cabinet');
    expect(r.depthMm).toBeNull(); // 300cm > depth max 65
    expect(r.qualityFlags).toContain('out_of_bounds_depth');
    expect(r.dimCount).toBe(0);
  });

  it('bonus : Marque(!=Castorama)/Matiere/Couleur/Finition extraits', () => {
    const r = parseSpecTable(
      table([
        ['Marque', 'GoodHome'],
        ['Matiere', 'Panneau melamine'],
        ['Couleur', 'Blanc'],
        ['Finition', 'Mat'],
        ['Largeur (cm)', '61cm'],
      ]),
      'cabinet',
    );
    expect(r.brand).toBe('GoodHome');
    expect(r.material).toBe('Panneau melamine');
    expect(r.color).toBe('Blanc');
    expect(r.finish).toBe('Mat');
  });

  it('bonus : Marque=Castorama -> brand NON renseignee (garde namespace SKU)', () => {
    const r = parseSpecTable(
      table([['Marque', 'Castorama'], ['Largeur (cm)', '61cm']]),
      'cabinet',
    );
    expect(r.brand).toBeUndefined();
  });
});
