/**
 * 🤖 Auto-Mapper - Détection intelligente des colonnes
 *
 * Analyse les noms de colonnes d'un fichier et suggère automatiquement
 * le mapping vers le schéma CatalogItem.
 *
 * Exemples de détection:
 * - "nom", "name", "product_name", "titre" → name
 * - "prix", "price", "cost", "tarif" → price
 * - "largeur", "width", "w" → dimensions.width
 */

import type { MappingConfig } from '../common/adapters/declarative-mapper';

interface ColumnMatch {
  sourceColumn: string;
  targetField: string;
  confidence: number; // 0.0 - 1.0
  transform?: string;
}

interface AutoMapResult {
  mappings: ColumnMatch[];
  unmappedColumns: string[];
  suggestions: string[];
}

export class AutoMapper {
  // Dictionnaire de correspondances pour chaque champ cible
  private readonly fieldPatterns: Record<string, string[]> = {
    // Identifiants
    id: ['id', 'sku', 'ref', 'reference', 'product_id', 'article', 'code'],
    externalId: ['external_id', 'external_ref', 'supplier_id', 'vendor_id'],

    // Informations de base
    name: ['name', 'nom', 'title', 'titre', 'product_name', 'designation', 'libelle'],
    description: ['description', 'desc', 'details', 'texte', 'content'],
    category: ['category', 'categorie', 'type', 'famille', 'family', 'collection'],
    subcategory: ['subcategory', 'sous_categorie', 'subtype', 'sous_famille'],

    // Prix
    'price.price': ['price', 'prix', 'cost', 'tarif', 'montant', 'amount', 'unit_price'],
    'price.currency': ['currency', 'devise', 'monnaie'],
    'price.taxRate': ['tax_rate', 'tva', 'vat', 'tax'],

    // Dimensions (hauteur, largeur, profondeur)
    'dimensions.width': ['width', 'largeur', 'w', 'l', 'wide'],
    'dimensions.height': ['height', 'hauteur', 'h', 'haut'],
    'dimensions.depth': ['depth', 'profondeur', 'd', 'p', 'prof'],

    // Matériaux et finitions
    material: ['material', 'materiau', 'matiere', 'composition'],
    finish: ['finish', 'finition', 'coating', 'surface'],
    color: ['color', 'colour', 'couleur', 'teinte'],

    // Stock et disponibilité
    'availability.status': ['status', 'disponibilite', 'availability', 'stock_status'],
    'availability.stock': ['stock', 'quantity', 'quantite', 'qty', 'available'],
    'availability.leadTime': ['lead_time', 'delai', 'delivery_time', 'delai_livraison'],

    // Images
    'images.main': ['image', 'photo', 'picture', 'main_image', 'thumbnail', 'url_image'],
    'images.gallery': ['gallery', 'images', 'photos', 'additional_images'],

    // Poids
    weight: ['weight', 'poids', 'mass', 'masse'],

    // Marque et fabricant
    brand: ['brand', 'marque', 'manufacturer', 'fabricant', 'maker'],
    model: ['model', 'modele', 'reference_model'],
  };

  // Mots de remplissage à ignorer dans les noms de colonnes
  private readonly stopWords = ['product', 'produit', 'item', 'article', 'main', 'principal'];

  /**
   * Générer automatiquement un mapping à partir d'une ligne d'exemple
   */
  generateMapping(sampleRow: Record<string, any>): MappingConfig {
    const sourceColumns = Object.keys(sampleRow);

    // Détecter le mapping pour chaque colonne
    const result = this.detectMappings(sourceColumns);

    // Construire la configuration de mapping
    const fields: Record<string, any> = {};

    for (const match of result.mappings) {
      if (match.confidence >= 0.6) {
        // Seuil de confiance
        let mapping: any = { source: match.sourceColumn };

        // Ajouter la transformation si nécessaire
        if (match.transform) {
          mapping.transform = match.transform;
        }

        fields[match.targetField] = mapping;
      }
    }

    return {
      version: '1.0',
      providerId: 'auto-mapped',
      fields,
    };
  }

  /**
   * Détecter les mappings pour toutes les colonnes sources
   */
  private detectMappings(sourceColumns: string[]): AutoMapResult {
    const mappings: ColumnMatch[] = [];
    const unmappedColumns: string[] = [];
    const suggestions: string[] = [];

    for (const column of sourceColumns) {
      const match = this.findBestMatch(column);

      if (match) {
        mappings.push(match);

        if (match.confidence < 0.8) {
          suggestions.push(
            `Vérifier le mapping: "${column}" → "${match.targetField}" (confiance: ${(match.confidence * 100).toFixed(0)}%)`
          );
        }
      } else {
        unmappedColumns.push(column);
        suggestions.push(`Colonne non mappée: "${column}" - définir manuellement si nécessaire`);
      }
    }

    return { mappings, unmappedColumns, suggestions };
  }

  /**
   * Trouver la meilleure correspondance pour une colonne source
   */
  private findBestMatch(sourceColumn: string): ColumnMatch | null {
    const normalized = this.normalizeColumnName(sourceColumn);

    let bestMatch: ColumnMatch | null = null;
    let bestScore = 0;

    // Chercher dans tous les patterns
    for (const [targetField, patterns] of Object.entries(this.fieldPatterns)) {
      for (const pattern of patterns) {
        const score = this.calculateSimilarity(normalized, pattern);

        if (score > bestScore) {
          bestScore = score;
          bestMatch = {
            sourceColumn,
            targetField,
            confidence: score,
            transform: this.detectTransform(sourceColumn, targetField),
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Normaliser un nom de colonne pour la comparaison
   */
  private normalizeColumnName(column: string): string {
    let normalized = column.toLowerCase();

    // Remplacer les séparateurs par des espaces
    normalized = normalized.replace(/[_\-\.]/g, ' ');

    // Retirer les mots de remplissage
    for (const word of this.stopWords) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
    }

    // Nettoyer les espaces multiples
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Calculer la similarité entre deux chaînes (0.0 - 1.0)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // 1. Correspondance exacte
    if (str1 === str2) return 1.0;

    // 2. Inclusion directe
    if (str1.includes(str2) || str2.includes(str1)) {
      const shorter = Math.min(str1.length, str2.length);
      const longer = Math.max(str1.length, str2.length);
      return 0.9 * (shorter / longer);
    }

    // 3. Distance de Levenshtein normalisée
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = 1 - distance / maxLength;

    // 4. Bonus si les premiers caractères correspondent
    if (str1[0] === str2[0]) {
      return Math.min(1.0, similarity * 1.1);
    }

    return similarity;
  }

  /**
   * Calculer la distance de Levenshtein entre deux chaînes
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Détecter la transformation nécessaire pour un champ
   */
  private detectTransform(sourceColumn: string, targetField: string): string | undefined {
    const columnLower = sourceColumn.toLowerCase();

    // Prix: détecter si format spécial
    if (targetField.startsWith('price.')) {
      if (columnLower.includes('eur') || columnLower.includes('usd')) {
        return 'toPrice';
      }
      return 'toNumber';
    }

    // Dimensions
    if (targetField.startsWith('dimensions.')) {
      if (columnLower.includes('cm') || columnLower.includes('mm')) {
        return 'toNumber';
      }
      return 'toNumber';
    }

    // Poids
    if (targetField === 'weight') {
      return 'toNumber';
    }

    // Booléens
    if (targetField === 'availability.inStock' || columnLower.includes('available')) {
      return 'toBoolean';
    }

    // Images: détecter si URLs multiples
    if (targetField === 'images.gallery') {
      return 'splitArray';
    }

    return undefined;
  }

  /**
   * Détecter si les dimensions sont dans une seule colonne (ex: "80x60x200")
   */
  detectCombinedDimensions(sampleRow: Record<string, any>): string | null {
    for (const [column, value] of Object.entries(sampleRow)) {
      if (typeof value === 'string') {
        // Pattern: "80x60x200", "80 x 60 x 200", "80*60*200", etc.
        if (/^\d+\s*[x*×]\s*\d+\s*[x*×]\s*\d+/.test(value)) {
          return column;
        }
      }
    }
    return null;
  }

  /**
   * Suggérer des améliorations de mapping
   */
  suggestImprovements(mappingConfig: MappingConfig, sampleRow: Record<string, any>): string[] {
    const suggestions: string[] = [];

    // Vérifier les champs requis manquants
    const requiredFields = ['name', 'price.price', 'category'];
    for (const field of requiredFields) {
      if (!mappingConfig.fields[field]) {
        suggestions.push(`⚠️  Champ requis manquant: "${field}"`);
      }
    }

    // Détecter dimensions combinées
    const combinedDims = this.detectCombinedDimensions(sampleRow);
    if (combinedDims) {
      suggestions.push(
        `💡 Dimensions combinées détectées dans "${combinedDims}" - utiliser transform: "toDimensions"`
      );
    }

    // Vérifier les colonnes non utilisées qui pourraient être utiles
    const unmappedColumns = Object.keys(sampleRow).filter(
      (col) => !Object.values(mappingConfig.fields).some((m: any) => m.source === col)
    );

    if (unmappedColumns.length > 0) {
      suggestions.push(
        `ℹ️  ${unmappedColumns.length} colonne(s) non mappée(s): ${unmappedColumns.slice(0, 3).join(', ')}`
      );
    }

    return suggestions;
  }

  /**
   * Créer un template de mapping interactif
   */
  async createInteractiveMapping(
    sourceColumns: string[],
    targetFields: string[]
  ): Promise<MappingConfig> {
    console.log('\n🎯 Mapping Interactif\n');

    const fields: Record<string, any> = {};

    for (const targetField of targetFields) {
      const suggestions = this.suggestColumnsForField(targetField, sourceColumns);

      console.log(`\n${targetField}:`);
      console.log('  Suggestions:');
      suggestions.forEach((col, i) => {
        console.log(
          `    ${i + 1}. ${col.column} (confiance: ${(col.confidence * 100).toFixed(0)}%)`
        );
      });

      // TODO: En mode CLI réel, demander à l'utilisateur de choisir
      // Pour l'instant, prendre la meilleure suggestion
      if (suggestions.length > 0 && suggestions[0].confidence >= 0.6) {
        fields[targetField] = { source: suggestions[0].column };
      }
    }

    return {
      version: '1.0',
      providerId: 'interactive-mapped',
      fields,
    };
  }

  /**
   * Suggérer les colonnes sources pour un champ cible
   */
  private suggestColumnsForField(
    targetField: string,
    sourceColumns: string[]
  ): Array<{ column: string; confidence: number }> {
    const suggestions: Array<{ column: string; confidence: number }> = [];

    const patterns = this.fieldPatterns[targetField] || [];

    for (const column of sourceColumns) {
      const normalized = this.normalizeColumnName(column);
      let bestScore = 0;

      for (const pattern of patterns) {
        const score = this.calculateSimilarity(normalized, pattern);
        bestScore = Math.max(bestScore, score);
      }

      if (bestScore > 0) {
        suggestions.push({ column, confidence: bestScore });
      }
    }

    // Trier par confiance décroissante
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, 5); // Top 5
  }
}

export default AutoMapper;
