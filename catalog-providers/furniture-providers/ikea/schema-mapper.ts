import { CatalogItem } from '@common/types';
import { ISchemaMapper, ProviderProduct } from '../../common/base-provider';
import { IkeaTransformer } from './transformer';

/**
 * Mapper de schéma IKEA
 * Convertit entre le format IKEA et le format CatalogItem
 */
export class IkeaSchemaMapper implements ISchemaMapper {
  private transformer: IkeaTransformer;

  constructor() {
    this.transformer = new IkeaTransformer();
  }

  /**
   * Mappe un produit IKEA vers CatalogItem
   */
  mapToCatalogItem(providerProduct: ProviderProduct): CatalogItem {
    const dimensions = this.transformer.transformDimensions(
      providerProduct.dimensions || providerProduct.size
    );

    const { price, currency } = this.transformer.transformPrice(
      providerProduct.price
    );

    const images = this.transformer.transformImages(
      providerProduct.images || providerProduct.pictures
    );

    const specifications = this.transformer.transformSpecifications(
      providerProduct.specifications || providerProduct.specs || {}
    );

    return {
      id: `ikea_${providerProduct.id}`,
      providerId: 'ikea',
      providerItemId: providerProduct.id,
      type: 'furniture',
      category: providerProduct.category || 'kitchen',
      subcategory: providerProduct.subcategory || null,
      name: providerProduct.name || providerProduct.productName,
      description: providerProduct.description || null,
      brand: 'IKEA',
      model: providerProduct.model || providerProduct.articleNumber,
      sku: providerProduct.sku || providerProduct.articleNumber,
      price,
      currency,
      dimensions: {
        ...dimensions,
        unit: 'cm',
      },
      specifications,
      images,
      colors: providerProduct.colors || [],
      materials: providerProduct.materials || [],
      status: this.mapStatus(providerProduct.availability),
      stock: providerProduct.stock,
      url: providerProduct.url || `https://www.ikea.com/product/${providerProduct.id}`,
      warranty: providerProduct.warranty || '10 years',
      tags: providerProduct.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CatalogItem;
  }

  /**
   * Mappe un CatalogItem vers le format IKEA
   */
  mapToProviderFormat(catalogItem: CatalogItem): ProviderProduct {
    return {
      id: catalogItem.providerItemId,
      name: catalogItem.name,
      description: catalogItem.description,
      category: catalogItem.category,
      subcategory: catalogItem.subcategory,
      price: {
        amount: catalogItem.price,
        currency: catalogItem.currency,
      },
      dimensions: catalogItem.dimensions,
      images: catalogItem.images.map((img) => img.url),
      colors: catalogItem.colors,
      materials: catalogItem.materials,
      availability: this.mapStatusToProvider(catalogItem.status),
      stock: catalogItem.stock,
    };
  }

  /**
   * Mappe le statut IKEA vers notre format
   */
  private mapStatus(
    availability: any
  ): 'available' | 'out_of_stock' | 'discontinued' {
    if (!availability) return 'available';

    const status = String(availability).toLowerCase();

    if (status.includes('available') || status.includes('in stock')) {
      return 'available';
    }
    if (status.includes('out of stock') || status.includes('unavailable')) {
      return 'out_of_stock';
    }
    if (status.includes('discontinued')) {
      return 'discontinued';
    }

    return 'available';
  }

  /**
   * Mappe notre statut vers le format IKEA
   */
  private mapStatusToProvider(
    status: 'available' | 'out_of_stock' | 'discontinued'
  ): string {
    const mapping = {
      available: 'AVAILABLE',
      out_of_stock: 'OUT_OF_STOCK',
      discontinued: 'DISCONTINUED',
    };
    return mapping[status];
  }
}
