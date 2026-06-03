import { BaseProviderAdapter, ProviderConfig } from './base-adapter';
import { CJDropshippingAdapter } from './adapters/cj-dropshipping-adapter';
import { AliExpressAdapter } from './adapters/aliexpress-adapter';
import { AmazonAdapter } from './adapters/amazon-adapter';
import { AlibabaAdapter } from './adapters/alibaba-adapter';
import { CustomProviderAdapter } from './adapters/custom-provider-adapter';
import { AppError } from '../../common/errors';

/**
 * Provider Adapter Registry - factory for all marketplace adapters.
 * Single source of truth for registering and resolving provider implementations.
 */
export class ProviderAdapterRegistry {
  private adapters: Map<string, BaseProviderAdapter> = new Map();

  constructor() {
    this.register(new CJDropshippingAdapter());
    this.register(new AliExpressAdapter());
    this.register(new AmazonAdapter());
    this.register(new AlibabaAdapter());
    this.register(new CustomProviderAdapter());
  }

  register(adapter: BaseProviderAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: string): BaseProviderAdapter {
    const normalized = provider.toLowerCase().trim();
    const adapter = this.adapters.get(normalized);
    if (!adapter) {
      // Fallback to custom provider for unknown providers
      return this.adapters.get('custom')!;
    }
    return adapter;
  }

  has(provider: string): boolean {
    return this.adapters.has(provider.toLowerCase().trim());
  }

  getAll(): BaseProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  getSupportedProviders(): Array<{
    provider: string;
    name: string;
    capabilities: string[];
    authType: string;
    requiredCredentials: string[];
  }> {
    return this.getAll().map((adapter) => ({
      provider: adapter.provider,
      name: adapter.name,
      capabilities: adapter.capabilities,
      authType: adapter.authType,
      requiredCredentials: adapter.requiredCredentials,
    }));
  }

  getCapabilities(provider: string): string[] {
    return this.get(provider).capabilities;
  }

  can(provider: string, ...capabilities: string[]): boolean {
    const adapter = this.get(provider);
    return capabilities.every((cap) => adapter.capabilities.includes(cap));
  }

  validateCredentials(provider: string, config: ProviderConfig): string[] {
    const adapter = this.get(provider);
    const missing: string[] = [];
    for (const field of adapter.requiredCredentials) {
      if (!config[field]) {
        missing.push(field);
      }
    }
    return missing;
  }
}

export const providerRegistry = new ProviderAdapterRegistry();