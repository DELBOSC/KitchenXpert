import { CatalogItem } from '@kitchenxpert/common';
import { ProviderProduct } from '../base-provider';

/**
 * Résultat de validation d'un produit
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  field?: string;
}

/**
 * Erreur de validation
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  severity: 'error' | 'critical';
}

/**
 * Avertissement de validation
 */
export interface ValidationWarning {
  field: string;
  message: string;
  value?: any;
  suggestion?: string;
}

/**
 * Statistiques de preview
 */
export interface PreviewStats {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  byCategory: Record<string, number>;
  byBrand: Record<string, number>;
  priceRange: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
}

/**
 * Résultat de preview avant import
 */
export interface ImportPreview {
  stats: PreviewStats;
  validProducts: Array<{
    source: ProviderProduct;
    mapped: CatalogItem;
    warnings: ValidationWarning[];
  }>;
  invalidProducts: Array<{
    source: ProviderProduct;
    errors: ValidationError[];
    partialMapping?: Partial<CatalogItem>;
  }>;
  recommendations: string[];
}

/**
 * Options de validation
 */
export interface ValidationOptions {
  /** Vérifier les doublons */
  checkDuplicates?: boolean;
  /** Tolérance des prix (rejeter si hors limites) */
  priceLimits?: { min: number; max: number };
  /** Champs obligatoires */
  requiredFields?: string[];
  /** Validation stricte (rejeter warnings) */
  strict?: boolean;
  /** Limite de produits à prévisualiser */
  previewLimit?: number;
}

/**
 * Gestionnaire de preview et validation avant import
 * Permet de vérifier les données avant de les insérer en base
 */
export class ImportPreviewManager {
  private seenIds = new Set<string>();
  private seenSKUs = new Set<string>();

  constructor(private options: ValidationOptions = {}) {
    this.options = {
      checkDuplicates: true,
      requiredFields: ['name', 'price', 'model'],
      strict: false,
      previewLimit: 100,
      ...options,
    };
  }

  /**
   * Génère un preview complet de l'import
   */
  async generatePreview(
    sourceProducts: ProviderProduct[],
    mapperFn: (product: ProviderProduct) => CatalogItem
  ): Promise<ImportPreview> {
    const validProducts: ImportPreview['validProducts'] = [];
    const invalidProducts: ImportPreview['invalidProducts'] = [];

    // Limiter le nombre de produits pour le preview
    const productsToPreview = sourceProducts.slice(0, this.options.previewLimit);

    for (const source of productsToPreview) {
      try {
        // Mapper le produit
        const mapped = mapperFn(source);

        // Valider
        const validation = this.validateProduct(mapped);

        if (validation.isValid || !this.options.strict) {
          validProducts.push({
            source,
            mapped,
            warnings: validation.warnings,
          });
        } else {
          invalidProducts.push({
            source,
            errors: validation.errors,
            partialMapping: mapped,
          });
        }
      } catch (error) {
        invalidProducts.push({
          source,
          errors: [
            {
              field: 'mapping',
              message: `Échec du mapping: ${(error as Error).message}`,
              severity: 'critical',
            },
          ],
        });
      }
    }

    // Calculer les statistiques
    const stats = this.calculateStats(validProducts.map((p) => p.mapped));

    // Générer des recommandations
    const recommendations = this.generateRecommendations(
      stats,
      validProducts,
      invalidProducts
    );

    return {
      stats,
      validProducts,
      invalidProducts,
      recommendations,
    };
  }

  /**
   * Valide un produit mappé
   */
  validateProduct(product: CatalogItem): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Vérifier les champs obligatoires
    for (const field of this.options.requiredFields || []) {
      if (!product[field as keyof CatalogItem]) {
        errors.push({
          field,
          message: `Champ obligatoire manquant`,
          value: product[field as keyof CatalogItem],
          severity: 'critical',
        });
      }
    }

    // Vérifier le prix
    if (typeof product.price !== 'number' || isNaN(product.price)) {
      errors.push({
        field: 'price',
        message: 'Prix invalide',
        value: product.price,
        severity: 'critical',
      });
    } else {
      // Vérifier les limites de prix
      if (this.options.priceLimits) {
        const { min, max } = this.options.priceLimits;
        if (product.price < min || product.price > max) {
          warnings.push({
            field: 'price',
            message: `Prix hors limites (${min}-${max})`,
            value: product.price,
            suggestion: `Vérifier si le prix ${product.price} est correct`,
          });
        }
      }

      // Vérifier prix négatif
      if (product.price < 0) {
        errors.push({
          field: 'price',
          message: 'Prix négatif',
          value: product.price,
          severity: 'error',
        });
      }

      // Vérifier prix suspicieusement bas
      if (product.price > 0 && product.price < 10) {
        warnings.push({
          field: 'price',
          message: 'Prix très bas',
          value: product.price,
          suggestion: 'Vérifier si le prix est en centimes au lieu de euros',
        });
      }
    }

    // Vérifier le nom
    if (product.name && product.name.length < 3) {
      warnings.push({
        field: 'name',
        message: 'Nom très court',
        value: product.name,
        suggestion: 'Utiliser un nom plus descriptif',
      });
    }

    if (product.name && product.name.length > 200) {
      warnings.push({
        field: 'name',
        message: 'Nom très long',
        value: product.name.substring(0, 50) + '...',
        suggestion: 'Raccourcir le nom',
      });
    }

    // Vérifier les dimensions
    if (product.dimensions) {
      const { width, depth, height } = product.dimensions;
      if (width <= 0 || depth <= 0 || height <= 0) {
        warnings.push({
          field: 'dimensions',
          message: 'Dimensions invalides',
          value: product.dimensions,
          suggestion: 'Vérifier les unités (mm vs cm vs m)',
        });
      }

      // Dimensions suspicieusement grandes (> 5m)
      if (width > 5000 || depth > 5000 || height > 5000) {
        warnings.push({
          field: 'dimensions',
          message: 'Dimensions très grandes',
          value: product.dimensions,
          suggestion: 'Vérifier si les dimensions sont en mm au lieu de cm',
        });
      }
    }

    // Vérifier les images
    if (!product.images || product.images.length === 0) {
      warnings.push({
        field: 'images',
        message: 'Aucune image',
        suggestion: 'Ajouter au moins une image pour améliorer la visibilité',
      });
    }

    // Vérifier les doublons
    if (this.options.checkDuplicates) {
      if (this.seenIds.has(product.providerItemId)) {
        errors.push({
          field: 'providerItemId',
          message: 'ID dupliqué',
          value: product.providerItemId,
          severity: 'error',
        });
      } else {
        this.seenIds.add(product.providerItemId);
      }

      if (product.model && this.seenSKUs.has(product.model)) {
        warnings.push({
          field: 'model',
          message: 'SKU/Model dupliqué',
          value: product.model,
          suggestion: 'Vérifier si c\'est une variante du même produit',
        });
      } else if (product.model) {
        this.seenSKUs.add(product.model);
      }
    }

    // Vérifier le statut
    const validStatuses = ['available', 'out_of_stock', 'discontinued'];
    if (product.status && !validStatuses.includes(product.status)) {
      errors.push({
        field: 'status',
        message: `Statut invalide: ${product.status}`,
        value: product.status,
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calcule les statistiques sur les produits
   */
  private calculateStats(products: CatalogItem[]): PreviewStats {
    const prices = products.map((p) => p.price).filter((p) => typeof p === 'number');
    const sortedPrices = [...prices].sort((a, b) => a - b);

    const byCategory: Record<string, number> = {};
    const byBrand: Record<string, number> = {};

    for (const product of products) {
      // Compter par catégorie
      if (product.category) {
        byCategory[product.category] = (byCategory[product.category] || 0) + 1;
      }

      // Compter par marque
      if (product.brand) {
        byBrand[product.brand] = (byBrand[product.brand] || 0) + 1;
      }
    }

    return {
      total: products.length,
      valid: products.length,
      invalid: 0,
      warnings: 0,
      byCategory,
      byBrand,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        median: sortedPrices[Math.floor(sortedPrices.length / 2)] || 0,
      },
    };
  }

  /**
   * Génère des recommandations basées sur l'analyse
   */
  private generateRecommendations(
    stats: PreviewStats,
    validProducts: ImportPreview['validProducts'],
    invalidProducts: ImportPreview['invalidProducts']
  ): string[] {
    const recommendations: string[] = [];

    // Taux d'erreur élevé
    const errorRate = invalidProducts.length / (validProducts.length + invalidProducts.length);
    if (errorRate > 0.5) {
      recommendations.push(
        `⚠️ Taux d'erreur élevé (${Math.round(errorRate * 100)}%). Vérifier la configuration du mapping.`
      );
    }

    // Beaucoup de warnings
    const warningCount = validProducts.reduce(
      (sum, p) => sum + p.warnings.length,
      0
    );
    if (warningCount > validProducts.length * 0.3) {
      recommendations.push(
        `⚠️ Nombreux avertissements (${warningCount}). Réviser les données source.`
      );
    }

    // Prix suspects
    const lowPriceCount = validProducts.filter((p) => p.mapped.price < 10).length;
    if (lowPriceCount > validProducts.length * 0.5) {
      recommendations.push(
        `💰 Plus de 50% des produits ont un prix < 10€. Vérifier l'unité (centimes vs euros).`
      );
    }

    // Images manquantes
    const noImageCount = validProducts.filter(
      (p) => !p.mapped.images || p.mapped.images.length === 0
    ).length;
    if (noImageCount > validProducts.length * 0.3) {
      recommendations.push(
        `🖼️ ${Math.round((noImageCount / validProducts.length) * 100)}% des produits sans images. Améliorer la visibilité.`
      );
    }

    // Catégories manquantes
    const noCategoryCount = validProducts.filter((p) => !p.mapped.category).length;
    if (noCategoryCount > 0) {
      recommendations.push(
        `📂 ${noCategoryCount} produits sans catégorie. Ajouter des catégories pour l'organisation.`
      );
    }

    // Diversité des marques
    if (Object.keys(stats.byBrand).length === 1) {
      recommendations.push(`🏷️ Une seule marque détectée. Est-ce attendu ?`);
    }

    // Plage de prix
    if (stats.priceRange.max / stats.priceRange.min > 1000) {
      recommendations.push(
        `💸 Large plage de prix (${stats.priceRange.min}€ - ${stats.priceRange.max}€). Vérifier la cohérence.`
      );
    }

    // Si tout va bien
    if (recommendations.length === 0 && errorRate === 0) {
      recommendations.push(`✅ Les données semblent cohérentes. Prêt pour l'import.`);
    }

    return recommendations;
  }

  /**
   * Exporte le preview en format lisible (pour affichage console)
   */
  formatPreviewForConsole(preview: ImportPreview): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════');
    lines.push('📊 PREVIEW D\'IMPORT DE CATALOGUE');
    lines.push('═══════════════════════════════════════════════════════\n');

    // Statistiques
    lines.push('📈 STATISTIQUES:');
    lines.push(`   Total: ${preview.stats.total} produits`);
    lines.push(`   Valides: ${preview.validProducts.length} ✅`);
    lines.push(`   Invalides: ${preview.invalidProducts.length} ❌`);
    lines.push(
      `   Avertissements: ${preview.validProducts.reduce((s, p) => s + p.warnings.length, 0)} ⚠️\n`
    );

    // Prix
    lines.push('💰 PRIX:');
    lines.push(`   Min: ${preview.stats.priceRange.min.toFixed(2)}€`);
    lines.push(`   Max: ${preview.stats.priceRange.max.toFixed(2)}€`);
    lines.push(`   Moyen: ${preview.stats.priceRange.avg.toFixed(2)}€`);
    lines.push(`   Médian: ${preview.stats.priceRange.median.toFixed(2)}€\n`);

    // Catégories
    if (Object.keys(preview.stats.byCategory).length > 0) {
      lines.push('📂 PAR CATÉGORIE:');
      for (const [category, count] of Object.entries(preview.stats.byCategory)) {
        lines.push(`   ${category}: ${count} produits`);
      }
      lines.push('');
    }

    // Marques
    if (Object.keys(preview.stats.byBrand).length > 0) {
      lines.push('🏷️  PAR MARQUE:');
      for (const [brand, count] of Object.entries(preview.stats.byBrand)) {
        lines.push(`   ${brand}: ${count} produits`);
      }
      lines.push('');
    }

    // Recommandations
    if (preview.recommendations.length > 0) {
      lines.push('💡 RECOMMANDATIONS:');
      for (const rec of preview.recommendations) {
        lines.push(`   ${rec}`);
      }
      lines.push('');
    }

    // Échantillon de produits invalides
    if (preview.invalidProducts.length > 0) {
      lines.push('❌ ÉCHANTILLON DE PRODUITS INVALIDES:');
      const sample = preview.invalidProducts.slice(0, 5);
      for (const invalid of sample) {
        lines.push(`   • ${invalid.source.name || invalid.source.id}`);
        for (const error of invalid.errors.slice(0, 2)) {
          lines.push(`     - ${error.field}: ${error.message}`);
        }
      }
      if (preview.invalidProducts.length > 5) {
        lines.push(`   ... et ${preview.invalidProducts.length - 5} autres\n`);
      }
    }

    lines.push('═══════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Réinitialise les caches de détection de doublons
   */
  reset(): void {
    this.seenIds.clear();
    this.seenSKUs.clear();
  }
}
