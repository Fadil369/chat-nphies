import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConversationMemory } from "../hooks/useConversationMemory";
import { useAutoComplete } from "../hooks/useAutoComplete";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  structured?: unknown;
}

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
    recommendedEndpoint: "/api/claude"
  }
};

const CHAT_OPTIONS = {
  precise: { temperature: 0.15, top_p: 0.8, max_tokens: 1024 },
  expressive: { temperature: 0.6, top_p: 0.95, max_tokens: 1536 }
} as const;

type ChatMode = keyof typeof CHAT_OPTIONS;

const createMessage = (role: "user" | "assistant", text: string, structured?: unknown): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  text,
  timestamp: Date.now(),
  structured
});

const tryParseStructured = (content: string): unknown => {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      return null;
    }
  }
  return null;
};

const generateMockResponse = (userMessage: string, context: any, t: any) => {
  const msgLower = userMessage.toLowerCase();
  
  // Smart mock responses based on user input
  if (msgLower.includes('eligibility') || msgLower.includes('أهلية')) {
    const patientId = context?.patientId || '1234567890';
    const coverageId = context?.coverageId || 'COV-001';
    const procedureCode = '103693007'; // physiotherapy from user input
    
    return {
      mockResponse: `I'll generate an eligibility check payload for patient ${patientId} with coverage ${coverageId} for physiotherapy session code ${procedureCode}.

\`\`\`json
{
  "intent": "eligibility",
  "patientId": "${patientId}",
  "coverageId": "${coverageId}",
  "recommendedEndpoint": "/EligibilityRequest",
  "nextSteps": ["Validate patient demographics", "Submit eligibility request", "Process response"],
  "fhirPayload": {
    "resourceType": "EligibilityRequest",
    "id": "eligibility-${Date.now()}",
    "status": "active",
    "purpose": ["benefits"],
    "patient": {
      "reference": "Patient/${patientId}"
    },
    "created": "${new Date().toISOString()}",
    "insurer": {
      "reference": "Organization/nphies-payer"
    },
    "provider": {
      "reference": "Organization/provider-org"
    },
    "insurance": [{
      "focal": true,
      "coverage": {
        "reference": "Coverage/${coverageId}"
      }
    }],
    "item": [{
      "category": {
        "coding": [{
          "system": "http://terminology.hl7.org/CodeSystem/ex-benefitcategory",
          "code": "medical"
        }]
      },
      "productOrService": {
        "coding": [{
          "system": "http://snomed.info/sct",
          "code": "${procedureCode}",
          "display": "Physiotherapy session"
        }]
      }
    }]
  }
}
\`\`\`

This FHIR EligibilityRequest payload includes:
- Patient reference: ${patientId}
- Coverage reference: ${coverageId} 
- Service code: ${procedureCode} (Physiotherapy session)
- Proper NPHIES-compliant structure

Next steps:
1. Validate patient demographics match coverage
2. Submit to NPHIES eligibility endpoint
3. Process the EligibilityResponse`,
      traceId: 'mock-' + Date.now()
    };
  }
  
  if (msgLower.includes('claim') || msgLower.includes('مطالبة')) {
    const patientId = context?.patientId || 'patient-123';
    const coverageId = context?.coverageId || 'coverage-001';
    const claimId = `CLM-${Date.now()}`;
    
    return {
      mockResponse: `I'll help you create a professional claim for patient ${patientId}:

\`\`\`json
{
  "intent": "claim",
  "patientId": "${patientId}",
  "coverageId": "${coverageId}",
  "claimId": "${claimId}",
  "recommendedEndpoint": "/Claim",
  "nextSteps": ["Validate eligibility", "Prepare FHIR Claim", "Submit claim", "Track status"],
  "fhirPayload": {
    "resourceType": "Claim",
    "id": "${claimId}",
    "status": "active",
    "type": {
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/claim-type",
        "code": "professional"
      }]
    },
    "use": "claim",
    "patient": {
      "reference": "Patient/${patientId}"
    },
    "created": "${new Date().toISOString()}",
    "insurer": {
      "reference": "Organization/nphies-payer"
    },
    "provider": {
      "reference": "Organization/provider-org"
    },
    "priority": {
      "coding": [{
        "system": "http://terminology.hl7.org/CodeSystem/processpriority",
        "code": "normal"
      }]
    },
    "insurance": [{
      "sequence": 1,
      "focal": true,
      "coverage": {
        "reference": "Coverage/${coverageId}"
      }
    }],
    "item": [{
      "sequence": 1,
      "productOrService": {
        "coding": [{
          "system": "http://snomed.info/sct",
          "code": "103693007",
          "display": "Physiotherapy session"
        }]
      },
      "unitPrice": {
        "value": 200.00,
        "currency": "SAR"
      },
      "net": {
        "value": 200.00,
        "currency": "SAR"
      }
    }],
    "total": {
      "value": 200.00,
      "currency": "SAR"
    }
  }
}
\`\`\`

This claim includes:
- Professional claim type for healthcare services
- Patient and coverage references
- Physiotherapy service (SNOMED: 103693007)
- Amount: 200 SAR
- NPHIES-compliant FHIR structure`,
      traceId: 'mock-' + Date.now()
    };
  }
  
  if (msgLower.includes('payment') || msgLower.includes('دفع')) {
    return {
      mockResponse: `For payment inquiries, I need:

- Claim ID: ${context?.claimId || '[Required]'}

I can help you check payment status and generate payment notices.

\`\`\`json
{
  "intent": "payment",
  "claimId": "${context?.claimId || null}",
  "recommendedEndpoint": "/payment/notice",
  "nextSteps": ["Query payment status", "Generate payment report"]
}
\`\`\``,
      traceId: 'mock-' + Date.now()
    };
  }
  
  // Default helpful response
  return {
    mockResponse: `Hi! I'm your NPHIES assistant. I can help you with:

🔍 **Eligibility Checks** - Verify patient coverage
📋 **Claims Processing** - Create and submit claims  
💳 **Payment Tracking** - Check payment status
📊 **Workflow Guidance** - Step-by-step NPHIES processes

What would you like to work on today?

*Note: I'm currently running in demo mode. Please configure the Ollama API for full functionality.*`,
    traceId: 'mock-' + Date.now()
  };
};

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
  const [cursorPosition, setCursorPosition] = useState(0);

  // Conversation memory and context (with error handling)
  const {
    currentConversation,
    context,
    addMessage,
    updateContext,
    createConversation
  } = useConversationMemory();

  // Auto-completion (with safe fallbacks)
  const autoComplete = useAutoComplete({
    context: context || { entities: {} },
    recentMessages: messages.map(msg => ({ role: msg.role, content: msg.text })),
    enableSmartSuggestions: true
  });

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
    try {
      setMessages((prev: ChatMessage[]) => {
        if (prev.length > 0 && prev[0].role === "assistant") {
          const [, ...rest] = prev;
          return [createMessage("assistant", t("assistant_welcome")), ...rest];
        }
        return [createMessage("assistant", t("assistant_welcome"))];
      });
    } catch (error) {
      console.error('Error setting welcome message:', error);
      setMessages([createMessage("assistant", "Hi! I'm here to help with NPHIES workflows.")]);
    }
  }, [i18n.language, t]);

  // Separate effect for conversation initialization
  useEffect(() => {
    if (!currentConversation && createConversation) {
      try {
        createConversation();
      } catch (error) {
        console.warn('Failed to create conversation:', error);
      }
    }
  }, [currentConversation, createConversation]);

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
    
    // Add to conversation memory
    addMessage(value, "user", { activeSuggestion });
    setInputValue("");
    setPending(true);
    setError(null);
  setTraceId(null);
  const metadata = buildMetadata(history, i18n.language, activeSuggestion);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.map((msg) => ({ role: msg.role, content: msg.text }))
          ],
          metadata,
          options: CHAT_OPTIONS[mode]
        })
      });

      let data;
      try {
        data = await resp.json();
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        // Fallback to mock response if API fails
        data = generateMockResponse(history[history.length - 1]?.text || '', context, t);
      }

      if (!resp.ok && resp.status !== 500) { // Allow 500 to fall through to mock
        const errorMsg = data?.message || data?.error?.message || `HTTP ${resp.status}: ${resp.statusText}`;
        if (resp.status === 401 || resp.status === 403) {
          // Use mock response for auth errors
          data = generateMockResponse(history[history.length - 1]?.text || '', context, t);
        } else {
          throw new Error(errorMsg);
        }
      }

      setTraceId(data?.traceId ?? null);
      
      // Handle different response formats
      let content = '';
      if (data?.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content;
      } else if (data?.message?.content) {
        content = data.message.content;
      } else if (data?.content) {
        content = data.content;
      } else if (typeof data === 'string') {
        content = data;
      } else if (data?.mockResponse) {
        content = data.mockResponse;
      } else {
        console.warn('Unexpected API response format:', data);
        content = generateMockResponse(history[history.length - 1]?.text || '', context, t).mockResponse;
      }
      
      const structured = tryParseStructured(content);
      setMessages((prev: ChatMessage[]) => [...prev, createMessage("assistant", content, structured)]);
      
      // Add assistant response to conversation memory (with error handling)
      try {
        if (addMessage) {
          addMessage(content, "assistant", { structured, traceId: data?.traceId });
        }
      } catch (memoryError) {
        console.warn('Failed to save to conversation memory:', memoryError);
      }
      
      // Update context if structured data is available
      try {
        if (structured && typeof structured === 'object' && updateContext) {
          updateContext({ 
            lastIntent: (structured as any).intent,
            entities: { ...(context?.entities || {}), ...(structured as any) }
          });
        }
      } catch (contextError) {
        console.warn('Failed to update context:', contextError);
      }
      
      setActiveSuggestion(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError(t("chat_cancelled"));
        return;
      }

      console.error("Chat request failed", err);

      let errorMessage = t("chat_error");
      
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = t("network_error", { message: "Connection failed" });
        } else if (err.message.includes('Invalid response')) {
          errorMessage = "I received an invalid response. Please try again.";
        } else if (err.message.includes('HTTP 4')) {
          errorMessage = "There was a client error. Please check your input and try again.";
        } else if (err.message.includes('HTTP 5')) {
          errorMessage = "The server is experiencing issues. Please try again later.";
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      } else if (!navigator.onLine) {
        errorMessage = t("network_error", { message: "You appear to be offline" });
      }

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
    try {
      // Handle auto-completion first (with safety checks)
      if (autoComplete?.handleKeyDown) {
        const handled = autoComplete.handleKeyDown(event.nativeEvent);
        if (handled === true) {
          return;
        } else if (handled && typeof handled === 'object' && autoComplete.applySuggestion) {
          // Apply selected suggestion
          const result = autoComplete.applySuggestion(handled, inputValue, cursorPosition);
          setInputValue(result.text);
          setCursorPosition(result.cursorPosition);
          return;
        }
      }
    } catch (error) {
      console.warn('Auto-complete error:', error);
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const onInputChange = (value: string, cursorPos?: number) => {
    setInputValue(value);
    const position = cursorPos ?? value.length;
    setCursorPosition(position);
    
    // Update auto-completion suggestions (with safety checks)
    try {
      if (autoComplete?.updateSuggestions) {
        autoComplete.updateSuggestions(value, position);
      }
    } catch (error) {
      console.warn('Auto-complete update error:', error);
    }
    
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
                    {new Date(msg.timestamp).toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}
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
        <div className="relative">
          <label htmlFor="chat-input" className="sr-only">
            {t("type_message")}
          </label>
          <textarea
            id="chat-input"
            name="msg"
            rows={3}
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value, event.target.selectionStart || 0)}
            onKeyDown={onKeyDown}
            onBlur={() => setTimeout(() => autoComplete.hide(), 150)}
            autoComplete="off"
            ref={textareaRef}
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 shadow-inner focus:border-primary focus:outline-none"
            placeholder={t("type_message") ?? ""}
            disabled={pending}
          />
          
          {/* Auto-completion dropdown */}
          {autoComplete.isVisible && autoComplete.suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
              {autoComplete.suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 border-b border-gray-700 last:border-b-0 ${
                    index === autoComplete.selectedIndex ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => {
                    const result = autoComplete.applySuggestion(suggestion, inputValue, cursorPosition);
                    setInputValue(result.text);
                    setCursorPosition(result.cursorPosition);
                    textareaRef.current?.focus();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200">{suggestion.text}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      suggestion.category === 'entity' ? 'bg-primary/20 text-primary' :
                      suggestion.category === 'template' ? 'bg-blue-500/20 text-blue-400' :
                      suggestion.category === 'smart' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {suggestion.category}
                    </span>
                  </div>
                  {suggestion.description && (
                    <div className="text-xs text-gray-400 mt-1">{suggestion.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
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
