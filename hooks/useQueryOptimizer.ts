import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

interface QueryConfig {
  key: string;
  queryFn: () => Promise<any>;
  staleTime?: number;
  cacheTime?: number;
  prefetch?: boolean;
}

export function useQueryOptimizer(config: QueryConfig) {
  const queryClient = useQueryClient();
  const prefetchTimeout = useRef<NodeJS.Timeout>();

  // Background prefetch implementation
  const prefetchData = useCallback(async () => {
    try {
      const data = await config.queryFn();
      queryClient.setQueryData(config.key, data);
    } catch (error) {
      console.error('Prefetch error:', error);
    }
  }, [config.key, config.queryFn, queryClient]);

  // Setup background prefetch
  useEffect(() => {
    if (config.prefetch) {
      prefetchTimeout.current = setTimeout(prefetchData, 100);
    }
    return () => {
      if (prefetchTimeout.current) {
        clearTimeout(prefetchTimeout.current);
      }
    };
  }, [config.prefetch, prefetchData]);

  // Cache response in memory
  const cacheResponse = useCallback(async () => {
    const cachedData = queryClient.getQueryData(config.key);
    if (!cachedData) {
      const data = await config.queryFn();
      queryClient.setQueryData(config.key, data);
      return data;
    }
    return cachedData;
  }, [config.key, config.queryFn, queryClient]);

  return {
    prefetchData,
    cacheResponse,
  };
}