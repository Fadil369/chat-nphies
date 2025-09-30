import { useState, useCallback } from "react";

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

interface UseRetryResult<T> {
  execute: () => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  attempts: number;
  reset: () => void;
}

export function useRetry<T>(
  asyncFunction: () => Promise<T>,
  options: RetryOptions = {}
): UseRetryResult<T> {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempts, setAttempts] = useState(0);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setAttempts(0);
  }, []);

  const execute = useCallback(async (): Promise<T> => {
    setIsLoading(true);
    setError(null);
    setAttempts(0);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setAttempts(attempt);
        const result = await asyncFunction();
        setIsLoading(false);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        if (attempt === maxAttempts) {
          setError(error);
          setIsLoading(false);
          throw error;
        }

        // Wait before retrying (with optional exponential backoff)
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw new Error('This should never be reached');
  }, [asyncFunction, maxAttempts, delay, backoff]);

  return { execute, isLoading, error, attempts, reset };
}