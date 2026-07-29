import { useRef } from 'react';

interface PerformanceMetrics {
  queryTime?: number;
  renderTime?: number;
  networkTime?: number;
  totalTime?: number;
}

export function usePerformanceMonitor() {
  const metrics = useRef<PerformanceMetrics>({});
  const startTime = useRef<number>(0);

  const start = () => {
    startTime.current = Date.now();
    metrics.current = {};
  };

  const markQueryTime = () => {
    metrics.current.queryTime = Date.now() - startTime.current;
  };

  const markNetworkTime = () => {
    metrics.current.networkTime = Date.now() - startTime.current;
  };

  const markRenderTime = () => {
    metrics.current.renderTime = Date.now() - startTime.current;
    metrics.current.totalTime = Date.now() - startTime.current;
  };

  const getMetrics = () => metrics.current;

  return {
    start,
    markQueryTime,
    markNetworkTime,
    markRenderTime,
    getMetrics,
  };
}
