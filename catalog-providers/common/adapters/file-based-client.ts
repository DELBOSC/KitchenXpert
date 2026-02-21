import * as fs from 'fs';
import * as path from 'path';
import { ProviderProduct, FetchOptions } from '../base-provider';
import { ProviderConfig } from '@kitchenxpert/common';

/**
 * Type de source de données fichier
 */
export type FileSourceType = 'csv' | 'excel' | 'json' | 'xml';

/**
 * Configuration pour sources fichier
 */
export interface FileSourceConfig extends ProviderConfig {
  filePath: string;
  encoding?: string;
  delimiter?: string;  // Pour CSV
  sheetName?: string;  // Pour Excel
}

/**
 * Client de base pour sources de données fichier
 * Supporte: CSV, Excel, JSON, XML
 */
export abstract class FileBasedApiClient {
  protected config: FileSourceConfig;
  protected sourceType: FileSourceType;
  protected cachedData: ProviderProduct[] | null = null;

  constructor(config: FileSourceConfig, sourceType: FileSourceType) {
    this.config = config;
    this.sourceType = sourceType;
  }

  /**
   * Charge les données depuis le fichier
   */
  protected async loadData(): Promise<any> {
    if (this.cachedData) {
      return this.cachedData;
    }

    const filePath = path.resolve(this.config.filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const rawContent = fs.readFileSync(
      filePath,
      this.config.encoding || 'utf-8'
    );

    let parsedData: any;

    switch (this.sourceType) {
      case 'json':
        parsedData = JSON.parse(rawContent);
        break;

      case 'csv':
        parsedData = this.parseCSV(rawContent);
        break;

      case 'excel':
        parsedData = await this.parseExcel(filePath);
        break;

      case 'xml':
        parsedData = await this.parseXML(rawContent);
        break;

      default:
        throw new Error(`Unsupported source type: ${this.sourceType}`);
    }

    this.cachedData = this.parseData(parsedData);
    return this.cachedData;
  }

  /**
   * Parse CSV basique (peut être surchargé)
   */
  protected parseCSV(content: string): any[] {
    const delimiter = this.config.delimiter || ',';
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return [];
    }

    // Première ligne = headers
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.trim().replace(/^"|"$/g, ''));

    // Lignes suivantes = data
    return lines.slice(1).map((line) => {
      const values = line
        .split(delimiter)
        .map((v) => v.trim().replace(/^"|"$/g, ''));

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      return row;
    });
  }

  /**
   * Parse Excel (nécessite xlsx package)
   */
  protected async parseExcel(filePath: string): Promise<any[]> {
    try {
      // Dynamically import xlsx to avoid bundling if not needed
      const XLSX = await import('xlsx');

      const workbook = XLSX.readFile(filePath);
      const sheetName =
        this.config.sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      return XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      throw new Error(
        `Failed to parse Excel file: ${error}. Install xlsx package: pnpm add xlsx`
      );
    }
  }

  /**
   * Parse XML (nécessite xml2js package)
   */
  protected async parseXML(content: string): Promise<any> {
    try {
      // Dynamically import xml2js
      const xml2js = await import('xml2js');
      const parser = new xml2js.Parser();

      return new Promise((resolve, reject) => {
        parser.parseString(content, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    } catch (error) {
      throw new Error(
        `Failed to parse XML: ${error}. Install xml2js package: pnpm add xml2js`
      );
    }
  }

  /**
   * Méthode abstraite: transformer les données brutes en ProviderProduct[]
   * Doit être implémentée par chaque provider
   */
  protected abstract parseData(rawData: any): ProviderProduct[];

  /**
   * Récupère tous les produits
   */
  async fetchProducts(options?: FetchOptions): Promise<ProviderProduct[]> {
    const allProducts = await this.loadData();

    let filtered = allProducts;

    // Filtrer par catégorie si spécifié
    if (options?.category) {
      filtered = filtered.filter(
        (p) => p.category === options.category
      );
    }

    // Pagination
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit || filtered.length;
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }

  /**
   * Récupère un produit par ID
   */
  async fetchProductById(id: string): Promise<ProviderProduct> {
    const products = await this.loadData();
    const product = products.find((p) => p.id === id);

    if (!product) {
      throw new Error(`Product not found: ${id}`);
    }

    return product;
  }

  /**
   * Teste la connexion (vérifie que le fichier existe)
   */
  async testConnection(): Promise<boolean> {
    try {
      const filePath = path.resolve(this.config.filePath);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Vide le cache
   */
  clearCache(): void {
    this.cachedData = null;
  }
}
