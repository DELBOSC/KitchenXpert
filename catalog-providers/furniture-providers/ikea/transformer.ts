import { BaseTransformer } from '../../common/base-transformer';

/**
 * Transformer IKEA
 * Étend le BaseTransformer avec des logiques spécifiques à IKEA si nécessaire
 */
export class IkeaTransformer extends BaseTransformer {
  // Le BaseTransformer fournit déjà toutes les méthodes nécessaires
  // On peut surcharger ici si IKEA a des formats spécifiques

  /**
   * IKEA utilise parfois des formats spéciaux pour les dimensions
   * Exemple: "80x60x200 cm"
   */
  transformDimensions(data: any): {
    width: number;
    depth: number;
    height: number;
  } {
    // Si c'est une string au format "WxDxH"
    if (typeof data === 'string' && data.includes('x')) {
      const parts = data.split('x').map((p) => this.parseNumber(p));
      if (parts.length >= 3) {
        return {
          width: parts[0],
          depth: parts[1],
          height: parts[2],
        };
      }
    }

    // Sinon utiliser la méthode de base
    return super.transformDimensions(data);
  }
}
