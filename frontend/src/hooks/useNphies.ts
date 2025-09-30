import { useState, useCallback } from "react";
import { useRetry } from "./useRetry";

type Options<TBody> = {
  endpoint: string;
  method?: "POST" | "GET";
  onSuccess?: (response: unknown) => void;
  onError?: (error: Error) => void;
  body?: TBody;
  retryOptions?: {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
  };
};

type State = {
  loading: boolean;
  data: unknown;
  error: string | null;
  attempts: number;
};

type NetworkError = {
  type: 'network' | 'timeout' | 'server' | 'client' | 'unknown';
  message: string;
  status?: number;
  retryable: boolean;
};

function categorizeError(error: unknown, response?: Response): NetworkError {
  if (error instanceof TypeError) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection.',
      retryable: true
    };
  }

  if (response) {
    const status = response.status;
    
    if (status >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred. Please try again.',
        status,
        retryable: true
      };
    }
    
    if (status === 429) {
      return {
        type: 'server',
        message: 'Too many requests. Please wait and try again.',
        status,
        retryable: true
      };
    }
    
    if (status >= 400) {
      return {
        type: 'client',
        message: error instanceof Error ? error.message : 'Invalid request',
        status,
        retryable: false
      };
    }
  }

  return {
    type: 'unknown',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    retryable: false
  };
}

export function useNphies<TBody = unknown>() {
  const [state, setState] = useState<State>({ 
    loading: false, 
    data: null, 
    error: null, 
    attempts: 0 
  });

  const createRequest = useCallback((options: Options<TBody>) => {
    return async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(`/api/nphies/${options.endpoint}`, {
          method: options.method || "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();
        
        if (!response.ok) {
          const networkError = categorizeError(new Error(data?.message), response);
          const error = new Error(networkError.message);
          (error as any).retryable = networkError.retryable;
          (error as any).status = response.status;
          throw error;
        }

        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          const timeoutError = new Error('Request timed out. Please try again.');
          (timeoutError as any).retryable = true;
          throw timeoutError;
        }
        
        const networkError = categorizeError(error);
        const finalError = new Error(networkError.message);
        (finalError as any).retryable = networkError.retryable;
        throw finalError;
      }
    };
  }, []);

  const execute = async (options: Options<TBody>) => {
    const requestFn = createRequest(options);
    const retryOptions = options.retryOptions || { maxAttempts: 3, delay: 1000, backoff: true };
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    const retry = useRetry(requestFn, retryOptions);

    try {
      const data = await retry.execute();
      setState({ 
        loading: false, 
        data, 
        error: null, 
        attempts: retry.attempts 
      });
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({ 
        loading: false, 
        data: null, 
        error: message, 
        attempts: retry.attempts 
      });
      options.onError?.(error instanceof Error ? error : new Error(message));
      throw error;
    }
  };

  const reset = useCallback(() => {
    setState({ loading: false, data: null, error: null, attempts: 0 });
  }, []);

  return { ...state, execute, reset };
}
