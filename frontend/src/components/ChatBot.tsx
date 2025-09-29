import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  structured?: unknown;
};

type Suggestion = {
  id: string;
  label: string;
  prompt: string;
  hint: string;
  intent: string;
  schemaHint?: string;
  recommendedEndpoint?: string;
};

const SYSTEM_PROMPT = `You are NPHIES Edge Copilot. Guide the user through Saudi NPHIES Taameen workflows.
- Always ask clarifying questions if required identifiers are missing.
- When possible, return a short JSON block with "intent", "patientId", "coverageId", "claimId", "recommendedEndpoint", and "nextSteps" fields.`;

const generateId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const SUGGESTION_CONFIG: Record<string, { intent: string; schemaHint?: string; recommendedEndpoint?: string }> = {
  eligibility: {
    intent: "eligibility_check",
    schemaHint: "FHIR EligibilityRequest",
    recommendedEndpoint: "/api/nphies/eligibility"
  },
  claim: {
    intent: "claim_submission",
    schemaHint: "FHIR Claim",
    recommendedEndpoint: "/api/nphies/claim"
  },
  audit: {
    intent: "decision_audit",
    schemaHint: "Narrative summary",
    recommendedEndpoint: "/api/ollama"
  }
};

const CHAT_OPTIONS = {
  precise: { temperature: 0.15, top_p: 0.8, max_tokens: 1024 },
  expressive: { temperature: 0.6, top_p: 0.95, max_tokens: 1536 }
} as const;

type ChatMode = keyof typeof CHAT_OPTIONS;

function createMessage(role: "user" | "assistant", text: string, structured?: unknown): ChatMessage {
  return {
    id: generateId(),
    role,
    text,
    createdAt: Date.now(),
    structured
  };
}

function tryParseStructured(content: string): unknown {
  const trimmed = content.trim();
  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const candidate = jsonBlockMatch ? jsonBlockMatch[1] : trimmed;
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    // noop — many responses will be plain text
  }
  return undefined;
}

export function ChatBot() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [mode, setMode] = useState<ChatMode>("precise");

  const suggestions = useMemo<Suggestion[]>(
    () => [
      {
        id: "eligibility",
        label: t("prompt_eligibility_label"),
        prompt: t("prompt_eligibility_prompt"),
        hint: t("prompt_eligibility_hint"),
        intent: SUGGESTION_CONFIG.eligibility.intent,
        schemaHint: SUGGESTION_CONFIG.eligibility.schemaHint,
        recommendedEndpoint: SUGGESTION_CONFIG.eligibility.recommendedEndpoint
      },
      {
        id: "claim",
        label: t("prompt_claim_label"),
        prompt: t("prompt_claim_prompt"),
        hint: t("prompt_claim_hint"),
        intent: SUGGESTION_CONFIG.claim.intent,
        schemaHint: SUGGESTION_CONFIG.claim.schemaHint,
        recommendedEndpoint: SUGGESTION_CONFIG.claim.recommendedEndpoint
      },
      {
        id: "audit",
        label: t("prompt_audit_label"),
        prompt: t("prompt_audit_prompt"),
        hint: t("prompt_audit_hint"),
        intent: SUGGESTION_CONFIG.audit.intent,
        schemaHint: SUGGESTION_CONFIG.audit.schemaHint,
        recommendedEndpoint: SUGGESTION_CONFIG.audit.recommendedEndpoint
      }
    ],
    [i18n.language, t]
  );

  useEffect(() => {
    setMessages((prev: ChatMessage[]) => {
      if (prev.length > 0 && prev[0].role === "assistant") {
        const [, ...rest] = prev;
        return [createMessage("assistant", t("assistant_welcome")), ...rest];
      }
      return [createMessage("assistant", t("assistant_welcome"))];
    });
  }, [i18n.language, t]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 176)}px`;
  }, [inputValue]);

  const resetConversation = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
    setError(null);
    setMessages([createMessage("assistant", t("assistant_welcome"))]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputValue.trim()) return;

    const value = inputValue.trim();
    const userMsg = createMessage("user", value);
    const history = [...messages, userMsg];

    setMessages(history);
    setInputValue("");
    setPending(true);
    setError(null);
  setTraceId(null);
  const metadata = buildMetadata(history, i18n.language, activeSuggestion);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "llama3.1-8b-instruct",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.map((msg) => ({ role: msg.role, content: msg.text }))
          ],
          metadata,
          options: CHAT_OPTIONS[mode]
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message ?? t("error"));
      }

      setTraceId((data as { traceId?: string })?.traceId ?? null);
      const content = data?.choices?.[0]?.message?.content ?? t("error");
      const structured = tryParseStructured(content);
      setMessages((prev: ChatMessage[]) => [...prev, createMessage("assistant", content, structured)]);
      setActiveSuggestion(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError(t("chat_cancelled"));
        return;
      }

      console.error("Chat request failed", err);

      const errorMessage = (() => {
        if (err instanceof TypeError || !navigator.onLine) {
          const message = err instanceof Error ? err.message : "";
          return t("network_error", { message });
        }
        return t("chat_error");
      })();

      setMessages((prev: ChatMessage[]) => [...prev, createMessage("assistant", errorMessage)]);
      setError(errorMessage);
    } finally {
      setPending(false);
      abortRef.current = null;
    }
  };

  const handleSuggestion = (suggestion: Suggestion) => {
    setInputValue(suggestion.prompt);
    setActiveSuggestion(suggestion);
    setTimeout(() => {
      const input = document.getElementById("chat-input") as HTMLTextAreaElement | null;
      input?.focus();
    }, 0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const onInputChange = (value: string) => {
    setInputValue(value);
    if (activeSuggestion && value.trim() !== activeSuggestion.prompt.trim()) {
      setActiveSuggestion(null);
    }
  };

  return (
    <div id="assistant" className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-gray-800 pb-3">
        <div>
          <h2 className="font-medium tracking-wide text-primary">{t("assistant_title")}</h2>
          <p className="text-xs text-gray-500">{t("assistant_subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {pending ? (
            <button
              type="button"
              className="rounded-md border border-accent/40 px-2 py-1 text-xs text-accent transition hover:border-accent hover:text-white"
              onClick={() => {
                abortRef.current?.abort();
              }}
            >
              {t("cancel")}
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-400 transition hover:border-primary hover:text-primary"
            onClick={resetConversation}
          >
            {t("clear")}
          </button>
        </div>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.6)_transparent] md:flex-wrap md:overflow-visible">
        {suggestions.map((suggestion: Suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeSuggestion?.id === suggestion.id ? "border-primary bg-primary/10 text-primary" : "border-gray-700 text-gray-300 hover:border-primary hover:text-primary"}`}
            onClick={() => handleSuggestion(suggestion)}
          >
            <span className="font-medium">{suggestion.label}</span>
            <span className="ml-2 text-gray-500">{suggestion.hint}</span>
          </button>
        ))}
      </div>
      <fieldset className="mt-3 space-y-2">
        <legend className="text-[11px] uppercase tracking-wide text-gray-500">{t("assistant_mode_title")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "precise", label: t("assistant_mode_precise"), description: t("assistant_mode_precise_hint") },
              { id: "expressive", label: t("assistant_mode_expressive"), description: t("assistant_mode_expressive_hint") }
            ] as Array<{ id: ChatMode; label: string; description: string }>
          ).map(({ id, label, description }) => (
            <button
              key={id}
              type="button"
              className={`rounded-lg border px-3 py-2 text-left text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${mode === id ? "border-primary bg-primary/10 text-primary" : "border-gray-700 text-gray-300 hover:border-primary"}`}
              onClick={() => setMode(id)}
            >
              <span className="block font-semibold">{label}</span>
              <span className="mt-1 block text-[11px] text-gray-500">{description}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div
        ref={listRef}
        className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1"
        aria-live="polite"
        aria-busy={pending}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400">{t("start_chat")}</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm shadow-sm ${
                  msg.role === "assistant"
                    ? "border-gray-800 bg-gray-900 text-gray-100"
                    : "border-primary/40 bg-primary/90 text-gray-900"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-wide text-gray-500">
                    {msg.role === "assistant" ? t("assistant_label") : t("you_label")}
                  </span>
                  <time className="text-[10px] text-gray-500">
                    {new Date(msg.createdAt).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                {msg.structured ? (
                  <details className="mt-2 rounded-lg border border-primary/30 bg-gray-950/70 p-2 text-xs text-gray-200">
                    <summary className="cursor-pointer text-primary">
                      {t("structured_output")}
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-[11px] text-gray-300">
                      {JSON.stringify(msg.structured, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </div>
          ))
        )}
        {pending ? (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-400">
              <span className="animate-pulse">{t("thinking")}</span>
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-accent">{error}</p> : null}
      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <label htmlFor="chat-input" className="sr-only">
          {t("type_message")}
        </label>
        <textarea
          id="chat-input"
          name="msg"
          rows={3}
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          ref={textareaRef}
          className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 shadow-inner focus:border-primary focus:outline-none"
          placeholder={t("type_message") ?? ""}
          disabled={pending}
        />
        <div className="flex items-center justify-between text-[11px] text-gray-500">
          <span>{t("enter_hint")}</span>
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/80 disabled:bg-gray-700"
            disabled={pending || !inputValue.trim()}
          >
            {pending ? t("sending") : t("send")}
          </button>
        </div>
      </form>
      {traceId ? (
        <p className="mt-2 text-[10px] text-gray-600">{t("trace_reference", { traceId })}</p>
      ) : null}
    </div>
  );
}

function buildMetadata(history: ChatMessage[], locale: string, suggestion: Suggestion | null): Record<string, unknown> {
  const context = buildConversationContext(history);
  const metadata: Record<string, unknown> = {
    locale,
    intent: suggestion?.intent,
    schemaHint: suggestion?.schemaHint,
    recommendedEndpoint: suggestion?.recommendedEndpoint,
    context
  };

  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null));
}

function buildConversationContext(history: ChatMessage[]): Record<string, unknown> | undefined {
  const assistantInsights = history
    .filter((msg) => msg.role === "assistant" && msg.structured)
    .slice(-3)
    .map((msg) => msg.structured);

  const lastUser = [...history].reverse().find((msg) => msg.role === "user");

  if (assistantInsights.length === 0 && !lastUser) {
    return undefined;
  }

  return {
    lastUserPrompt: lastUser?.text,
    structuredInsights: assistantInsights
  };
}
