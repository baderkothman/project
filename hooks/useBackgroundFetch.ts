import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

interface BackgroundFetchConfig {
  queryKey: string;
  queryFn: () => Promise<any>;
  enabled?: boolean;
  interval?: number;
}

export function useBackgroundFetch(config: BackgroundFetchConfig) {
  const queryClient = useQueryClient();
  const fetchInterval = useRef<NodeJS.Timeout>();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!config.enabled) return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - refresh data
        queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      }
      appState.current = nextAppState;
    });

    // Start periodic background fetch
    fetchInterval.current = setInterval(() => {
      if (appState.current === 'active') {
        queryClient.prefetchQuery({
          queryKey: [config.queryKey],
          queryFn: config.queryFn,
        });
      }
    }, config.interval || 30000);

    return () => {
      subscription.remove();
      if (fetchInterval.current) {
        clearInterval(fetchInterval.current);
      }
    };
  }, [config.enabled, config.interval, config.queryKey, config.queryFn, queryClient]);
}