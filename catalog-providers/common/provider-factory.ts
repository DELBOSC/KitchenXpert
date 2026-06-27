import { ProviderConfig } from '@common/types';
import { BaseProvider } from './base-provider';

/**
 * Type pour définir un provider
 */
export interface ProviderDefinition {
  name: string;
  slug: string;
  country: string;
  type: 'furniture' | 'appliance';
  factory: (config: ProviderConfig) => BaseProvider;
}

/**
 * Registre global de providers
 */
class ProviderRegistry {
  private providers: Map<string, ProviderDefinition> = new Map();

  /**
   * Enregistre un provider
   */
  register(definition: ProviderDefinition): void {
    this.providers.set(definition.slug, definition);
  }

  /**
   * Récupère un provider par slug
   */
  get(slug: string): ProviderDefinition | undefined {
    return this.providers.get(slug);
  }

  /**
   * Liste tous les providers
   */
  list(): ProviderDefinition[] {
    return Array.from(this.providers.values());
  }

  /**
   * Liste les providers par type
   */
  listByType(type: 'furniture' | 'appliance'): ProviderDefinition[] {
    return this.list().filter((p) => p.type === type);
  }

  /**
   * Liste les providers par pays
   */
  listByCountry(country: string): ProviderDefinition[] {
    return this.list().filter((p) => p.country === country);
  }
}

/**
 * Instance singleton du registre
 */
export const providerRegistry = new ProviderRegistry();

/**
 * Factory pour créer des instances de providers
 */
export class ProviderFactory {
  /**
   * Crée une instance de provider
   */
  static create(slug: string, config: ProviderConfig): BaseProvider {
    const definition = providerRegistry.get(slug);

    if (!definition) {
      throw new Error(`Provider '${slug}' not found in registry`);
    }

    return definition.factory(config);
  }

  /**
   * Crée plusieurs instances de providers
   */
  static createMany(slugs: string[], configMap: Map<string, ProviderConfig>): BaseProvider[] {
    return slugs.map((slug) => {
      const config = configMap.get(slug);
      if (!config) {
        throw new Error(`No config found for provider '${slug}'`);
      }
      return this.create(slug, config);
    });
  }

  /**
   * Crée tous les providers d'un type donné
   */
  static createAllOfType(
    type: 'furniture' | 'appliance',
    configMap: Map<string, ProviderConfig>
  ): BaseProvider[] {
    const definitions = providerRegistry.listByType(type);
    return definitions
      .filter((def) => configMap.has(def.slug))
      .map((def) => this.create(def.slug, configMap.get(def.slug)!));
  }
}
