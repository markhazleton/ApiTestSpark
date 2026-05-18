import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import type { PerformanceMetrics } from '../types';

/**
 * Creates a TanStack Query mutation that automatically tracks performance metrics
 * via the debug store's addMetric function. Eliminates repeated try/catch timing
 * boilerplate across admin hooks.
 */
export function useTrackedMutation<TData, TVariables = void>(
  apiName: string,
  mutationFn: (variables: TVariables) => Promise<TData>,
  addMetric: (metric: PerformanceMetrics) => void,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const startTime = performance.now();
      try {
        const response = await mutationFn(variables);
        const duration = performance.now() - startTime;
        addMetric({
          apiName,
          duration,
          timestamp: new Date(),
          isSuccess: true,
        });
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        addMetric({
          apiName,
          duration,
          timestamp: new Date(),
          isSuccess: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    ...options,
  });
}
