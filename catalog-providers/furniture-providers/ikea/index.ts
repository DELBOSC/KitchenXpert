import { ProviderConfig } from '@common/types';
import { BaseProvider } from '../../common/base-provider';
import { providerRegistry } from '../../common/provider-factory';
import { IkeaApiClient } from './api-client';
import { IkeaSchemaMapper } from './schema-mapper';
import { IkeaTransformer } from './transformer';
import { IkeaValidator } from './validator';

/**
 * Provider IKEA
 */
export class IkeaProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    const apiClient = new IkeaApiClient(config);
    const schemaMapper = new IkeaSchemaMapper();
    const transformer = new IkeaTransformer();
    const validator = new IkeaValidator();

    super(config, apiClient, schemaMapper, transformer, validator);
  }
}

/**
 * Enregistrer le provider IKEA dans le registre
 */
providerRegistry.register({
  name: 'IKEA',
  slug: 'ikea',
  country: 'SE',
  type: 'furniture',
  factory: (config: ProviderConfig) => new IkeaProvider(config),
});

export { IkeaApiClient, IkeaSchemaMapper, IkeaTransformer, IkeaValidator };
