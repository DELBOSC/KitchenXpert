#!/usr/bin/env node
/**
 * 🚀 Quick Import CLI - Importer un catalogue en 30 secondes
 *
 * Usage:
 *   pnpm catalog:import ./file.csv
 *   pnpm catalog:import ./file.xlsx --template=ikea
 *   pnpm catalog:import ./file.json --provider-id=schmidt
 *
 * Fonctionnalités:
 * - Auto-détection du format (CSV, Excel, JSON, XML)
 * - Auto-mapping intelligent des colonnes
 * - Templates pré-configurés (IKEA, Schmidt, etc.)
 * - Preview avant import
 * - Validation automatique
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import { AutoMapper } from './auto-mapper';
import { ImportPreviewManager } from '../common/validation/import-preview';
import { DeclarativeMapper } from '../common/adapters/declarative-mapper';
import type { CatalogItem } from '../../packages/common/types/catalog';

interface QuickImportOptions {
  file: string;
  providerId?: string;
  template?: string;
  autoConfirm?: boolean;
  dryRun?: boolean;
  outputPath?: string;
}

interface ImportStats {
  totalRows: number;
  validProducts: number;
  invalidProducts: number;
  warnings: number;
  duration: number;
}

export class QuickImporter {
  private autoMapper: AutoMapper;
  private previewManager: ImportPreviewManager;

  constructor() {
    this.autoMapper = new AutoMapper();
    this.previewManager = new ImportPreviewManager();
  }

  /**
   * Point d'entrée principal pour l'import rapide
   */
  async import(options: QuickImportOptions): Promise<ImportStats> {
    console.log('🚀 Quick Import - KitchenXpert Catalog\n');

    const startTime = Date.now();

    // 1. Vérifier que le fichier existe
    if (!fs.existsSync(options.file)) {
      throw new Error(`❌ Fichier introuvable: ${options.file}`);
    }

    console.log(`📄 Fichier: ${path.basename(options.file)}`);

    // 2. Détecter le format et charger les données
    const rawData = await this.loadFile(options.file);
    console.log(`✅ ${rawData.length} lignes chargées\n`);

    // 3. Charger ou créer la configuration de mapping
    const mappingConfig = await this.getMappingConfig(options, rawData[0]);

    // 4. Appliquer le mapping
    const mapper = new DeclarativeMapper(mappingConfig);
    const mappedProducts = rawData
      .map((row, index) => {
        try {
          return mapper.map(row, options.providerId || 'unknown');
        } catch (error) {
          console.warn(`⚠️  Ligne ${index + 1}: ${error.message}`);
          return null;
        }
      })
      .filter((p): p is CatalogItem => p !== null);

    // 5. Générer le preview avec validation
    console.log('🔍 Validation des produits...\n');
    const preview = await this.previewManager.generatePreview(rawData, (row) =>
      mapper.map(row, options.providerId || 'unknown')
    );

    // 6. Afficher le résumé
    this.displayPreview(preview);

    // 7. Demander confirmation (sauf si --auto-confirm)
    if (!options.autoConfirm && !options.dryRun) {
      const confirmed = await this.askConfirmation();
      if (!confirmed) {
        console.log("\n❌ Import annulé par l'utilisateur");
        return {
          totalRows: rawData.length,
          validProducts: 0,
          invalidProducts: 0,
          warnings: 0,
          duration: Date.now() - startTime,
        };
      }
    }

    // 8. Importer les produits valides
    let importedCount = 0;
    if (!options.dryRun) {
      importedCount = await this.saveProducts(
        preview.validProducts.map((p) => p.mapped),
        options
      );
      console.log(`\n✅ ${importedCount} produits importés avec succès !`);
    } else {
      console.log('\n🔍 Mode dry-run: Aucun produit importé');
    }

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Durée totale: ${(duration / 1000).toFixed(2)}s`);

    return {
      totalRows: rawData.length,
      validProducts: preview.validProducts.length,
      invalidProducts: preview.invalidProducts.length,
      warnings: preview.validProducts.reduce((sum, p) => sum + p.warnings.length, 0),
      duration,
    };
  }

  /**
   * Charger le fichier selon son format
   */
  private async loadFile(filePath: string): Promise<any[]> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.csv':
        return this.loadCsv(filePath);
      case '.xlsx':
      case '.xls':
        return this.loadExcel(filePath);
      case '.json':
        return this.loadJson(filePath);
      case '.xml':
        return this.loadXml(filePath);
      default:
        throw new Error(`❌ Format non supporté: ${ext}`);
    }
  }

  /**
   * Charger un fichier CSV
   */
  private loadCsv(filePath: string): any[] {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Auto-détection du délimiteur
    const delimiter = this.detectCsvDelimiter(content);

    return parseCsv(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      trim: true,
      bom: true, // Support UTF-8 with BOM
    });
  }

  /**
   * Détecter le délimiteur CSV (,  ;  ou tab)
   */
  private detectCsvDelimiter(content: string): string {
    const firstLine = content.split('\n')[0];

    const delimiters = [',', ';', '\t', '|'];
    const counts = delimiters.map((d) => ({
      delimiter: d,
      count: (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length,
    }));

    const best = counts.reduce((max, curr) => (curr.count > max.count ? curr : max));
    return best.delimiter;
  }

  /**
   * Charger un fichier Excel
   */
  private async loadExcel(filePath: string): Promise<any[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount === 0) {
      return [];
    }

    // Extract headers from the first row
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = cell.text || `Column${colNumber}`;
    });

    // Convert rows to objects
    const rows: any[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row
      const obj: Record<string, string> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1] || `Column${colNumber}`;
        obj[header] = cell.text || '';
      });
      rows.push(obj);
    });

    return rows;
  }

  /**
   * Charger un fichier JSON
   */
  private loadJson(filePath: string): any[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Support plusieurs formats JSON
    if (Array.isArray(data)) {
      return data;
    }
    if (data.products && Array.isArray(data.products)) {
      return data.products;
    }
    if (data.items && Array.isArray(data.items)) {
      return data.items;
    }

    throw new Error('❌ Format JSON invalide: attendu un tableau ou {products: [...]}');
  }

  /**
   * Charger un fichier XML
   */
  private loadXml(filePath: string): any[] {
    // TODO: Implémenter le parsing XML
    throw new Error("❌ Support XML à venir - utilisez JSON ou CSV pour l'instant");
  }

  /**
   * Obtenir la configuration de mapping
   */
  private async getMappingConfig(options: QuickImportOptions, sampleRow: any): Promise<any> {
    // 1. Si un template est spécifié, le charger
    if (options.template) {
      return this.loadTemplate(options.template);
    }

    // 2. Sinon, utiliser l'auto-mapper
    console.log('🤖 Auto-mapping des colonnes...\n');
    const mappingConfig = this.autoMapper.generateMapping(sampleRow);

    // Afficher le mapping détecté
    console.log('📋 Mapping détecté:');
    for (const [targetField, mapping] of Object.entries(mappingConfig.fields)) {
      console.log(`   ${targetField} ← ${JSON.stringify(mapping)}`);
    }
    console.log('');

    return mappingConfig;
  }

  /**
   * Charger un template pré-configuré
   */
  private loadTemplate(templateName: string): any {
    const templatePath = path.join(__dirname, 'catalog-templates', `${templateName}-template.json`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`❌ Template introuvable: ${templateName}`);
    }

    console.log(`📋 Template chargé: ${templateName}\n`);
    return JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
  }

  /**
   * Afficher le preview des produits
   */
  private displayPreview(preview: any): void {
    console.log("📊 Résumé de l'import:\n");
    console.log(`   ✅ Produits valides:   ${preview.stats.validCount}`);
    console.log(`   ❌ Produits invalides: ${preview.stats.invalidCount}`);
    console.log(`   ⚠️  Avertissements:    ${preview.stats.warningCount}`);
    console.log(`   📈 Taux de succès:     ${preview.stats.successRate.toFixed(1)}%\n`);

    // Afficher quelques exemples de produits valides
    if (preview.validProducts.length > 0) {
      console.log('✅ Exemples de produits valides:\n');
      preview.validProducts.slice(0, 3).forEach((item: any, i: number) => {
        console.log(`   ${i + 1}. ${item.mapped.name}`);
        console.log(`      Prix: ${item.mapped.price.price}${item.mapped.price.currency}`);
        console.log(`      Catégorie: ${item.mapped.category}`);
        if (item.warnings.length > 0) {
          console.log(`      ⚠️  ${item.warnings.join(', ')}`);
        }
        console.log('');
      });
    }

    // Afficher quelques erreurs
    if (preview.invalidProducts.length > 0) {
      console.log('❌ Exemples de produits invalides:\n');
      preview.invalidProducts.slice(0, 3).forEach((item: any, i: number) => {
        console.log(`   ${i + 1}. Erreurs: ${item.errors.join(', ')}`);
      });
      console.log('');
    }

    // Afficher les recommandations
    if (preview.recommendations.length > 0) {
      console.log('💡 Recommandations:\n');
      preview.recommendations.forEach((rec: string) => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    }
  }

  /**
   * Demander confirmation à l'utilisateur
   */
  private async askConfirmation(): Promise<boolean> {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      readline.question("❓ Voulez-vous continuer l'import ? (o/n): ", (answer: string) => {
        readline.close();
        resolve(answer.toLowerCase() === 'o' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Sauvegarder les produits importés
   */
  private async saveProducts(
    products: CatalogItem[],
    options: QuickImportOptions
  ): Promise<number> {
    const outputPath =
      options.outputPath ||
      path.join(__dirname, '..', 'imported-catalogs', `import-${Date.now()}.json`);

    // Créer le dossier si nécessaire
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Sauvegarder les produits
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          metadata: {
            importDate: new Date().toISOString(),
            providerId: options.providerId || 'unknown',
            sourceFile: path.basename(options.file),
            productCount: products.length,
          },
          products,
        },
        null,
        2
      ),
      'utf-8'
    );

    console.log(`💾 Produits sauvegardés: ${outputPath}`);

    return products.length;
  }
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🚀 Quick Import CLI - KitchenXpert

Usage:
  pnpm catalog:import <fichier> [options]

Exemples:
  pnpm catalog:import ./catalog.csv
  pnpm catalog:import ./catalog.xlsx --template=ikea
  pnpm catalog:import ./catalog.json --provider-id=schmidt --auto-confirm
  pnpm catalog:import ./catalog.csv --dry-run

Options:
  --template=<nom>       Utiliser un template pré-configuré (ikea, schmidt, generic)
  --provider-id=<id>     ID du provider (ex: ikea, schmidt)
  --auto-confirm         Ne pas demander de confirmation
  --dry-run              Mode test: ne pas importer réellement
  --output=<path>        Chemin du fichier de sortie
  --help                 Afficher cette aide

Formats supportés:
  ✅ CSV (.csv)
  ✅ Excel (.xlsx, .xls)
  ✅ JSON (.json)
  🚧 XML (.xml) - à venir
    `);
    process.exit(0);
  }

  // Parser les arguments
  const file = args.find((arg) => !arg.startsWith('--')) || '';
  const template = args.find((arg) => arg.startsWith('--template='))?.split('=')[1];
  const providerId = args.find((arg) => arg.startsWith('--provider-id='))?.split('=')[1];
  const outputPath = args.find((arg) => arg.startsWith('--output='))?.split('=')[1];
  const autoConfirm = args.includes('--auto-confirm');
  const dryRun = args.includes('--dry-run');

  try {
    const importer = new QuickImporter();
    const stats = await importer.import({
      file,
      template,
      providerId,
      autoConfirm,
      dryRun,
      outputPath,
    });

    // Afficher les stats finales
    console.log('\n' + '='.repeat(50));
    console.log('📊 STATISTIQUES FINALES');
    console.log('='.repeat(50));
    console.log(`Total lignes:        ${stats.totalRows}`);
    console.log(`Produits valides:    ${stats.validProducts}`);
    console.log(`Produits invalides:  ${stats.invalidProducts}`);
    console.log(`Avertissements:      ${stats.warnings}`);
    console.log(`Durée:               ${(stats.duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

export default QuickImporter;
