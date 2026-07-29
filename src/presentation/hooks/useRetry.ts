import { useState, useCallback } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export function useRetry(options: RetryOptions = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  const [attempts, setAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const reset = useCallback(() => {
    setAttempts(0);
    setIsRetrying(false);
  }, []);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | undefined> => {
    try {
      setIsRetrying(true);
      const result = await operation();
      reset();
      onSuccess?.(result);
      return result;
    } catch (error) {
      const nextAttempt = attempts + 1;
      if (nextAttempt >= maxAttempts) {
        setIsRetrying(false);
        onError?.(error instanceof Error ? error : new Error('Operation failed'));
        return;
      }

      setAttempts(nextAttempt);
      const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempts), maxDelay);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(operation, onSuccess, onError);
    }
  }, [attempts, maxAttempts, initialDelay, maxDelay, backoffFactor, reset]);

  return {
    retry,
    isRetrying,
    attempts,
    reset,
    hasMoreAttempts: attempts < maxAttempts,
  };
}