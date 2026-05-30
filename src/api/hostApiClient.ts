import { ApiClient } from './client';
import type { ApiClientOptions } from './client';
import type { HarnessConfig } from '../types';

export class HostApiClient extends ApiClient {
  constructor(baseUrl: string, options: ApiClientOptions = {}) {
    super(baseUrl, '', options);
  }

  fetchConfig(): Promise<HarnessConfig> {
    return this.get<HarnessConfig>('/api-test-spark/config');
  }
}
