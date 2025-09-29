import { useState } from "react";

type Options<TBody> = {
  endpoint: string;
  method?: "POST" | "GET";
  onSuccess?: (response: unknown) => void;
  body?: TBody;
};

type State = {
  loading: boolean;
  data: unknown;
  error: string | null;
};

export function useNphies<TBody = unknown>() {
  const [state, setState] = useState<State>({ loading: false, data: null, error: null });

  const execute = async ({ endpoint, method = "POST", body, onSuccess }: Options<TBody>) => {
    setState({ loading: true, data: null, error: null });
    try {
      const response = await fetch(`/api/nphies/${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Request failed");
      }
      setState({ loading: false, data, error: null });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({ loading: false, data: null, error: message });
      throw error;
    }
  };

  return { ...state, execute };
}
