import { ApiClient } from './client';
import type { ApiClientOptions } from './client';
import type { HarnessBootstrapConfig } from '../types';

export class HostApiClient extends ApiClient {
  constructor(baseUrl: string, options: ApiClientOptions = {}) {
    super(baseUrl, '', options);
  }

  fetchConfig(): Promise<HarnessBootstrapConfig> {
    return this.get<HarnessBootstrapConfig>('/api-test-spark/config');
  }
}
