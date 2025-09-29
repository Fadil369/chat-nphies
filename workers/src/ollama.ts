import { Env } from "./index";

type ChatRole = "system" | "user" | "assistant" | string;

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatMetadata = {
  locale?: string;
  intent?: string;
  schemaHint?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
};

type ChatOptions = {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
};

type ChatRequest = {
  model?: string;
  messages?: ChatMessage[];
  metadata?: ChatMetadata;
  stream?: boolean;
  options?: ChatOptions;
};

type ValidatedRequest = {
  model: string;
  messages: ChatMessage[];
  metadata?: ChatMetadata;
  stream: boolean;
  options: ChatOptions;
  traceId: string;
};

const DEFAULT_MODEL = "llama3.1-8b-instruct";
const DEFAULT_ENDPOINT = "https://api.ollama.com";
const DEFAULT_OPTIONS: ChatOptions = {
  temperature: 0.2,
  top_p: 0.9
};
const MAX_MESSAGES = 16;

class WorkerError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "WorkerError";
  }
}

export async function handleOllama(body: unknown, env: Env): Promise<Response> {
  try {
    if (!env.OLLAMA_API_KEY) {
      throw new WorkerError("Missing Ollama API key", 500);
    }

    const request = validateRequest(body, env);
    const payload = buildPayload(request);
    const endpoint = buildEndpoint(env.OLLAMA_API_BASE);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OLLAMA_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      const message = (data as { error?: { message?: string }; message?: string })?.error?.message ??
        (data as { message?: string })?.message ??
        "Upstream Ollama request failed";
      throw new WorkerError(message, response.status);
    }

    const responseBody = isPlainObject(data)
      ? { ...data, traceId: request.traceId }
      : { data, traceId: request.traceId };

    return jsonResponse(responseBody, response.status);
  } catch (error) {
    if (error instanceof WorkerError) {
      return jsonResponse({ message: error.message }, error.status);
    }

    console.error("Unexpected Ollama worker failure", error);
    return jsonResponse({ message: "Unexpected error while contacting Ollama" }, 502);
  }
}

function validateRequest(body: unknown, env: Env): ValidatedRequest {
  if (!body || typeof body !== "object") {
    throw new WorkerError("Invalid request body", 400);
  }

  const payload = body as ChatRequest;
  const incomingMessages = Array.isArray(payload.messages) ? payload.messages : [];
  const sanitizedMessages = sanitizeMessages(incomingMessages);

  if (sanitizedMessages.length === 0) {
    throw new WorkerError("At least one chat message is required", 422);
  }

  const metadata = isPlainObject(payload.metadata) ? (payload.metadata as ChatMetadata) : undefined;
  const options = sanitizeOptions(payload.options);
  const model = typeof payload.model === "string" && payload.model.trim().length > 0
    ? payload.model.trim()
    : env.OLLAMA_MODEL ?? DEFAULT_MODEL;

  const request: ValidatedRequest = {
    model,
    messages: applyGuardrails(sanitizedMessages, metadata),
    metadata,
    stream: Boolean(payload.stream),
    options,
    traceId: crypto.randomUUID()
  };

  return request;
}

function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((msg): msg is ChatMessage => typeof msg?.content === "string" && typeof msg?.role === "string")
    .map((msg) => ({
      role: msg.role,
      content: msg.content
    }))
    .slice(-MAX_MESSAGES);
}

function sanitizeOptions(options: ChatOptions | undefined): ChatOptions {
  if (!options || typeof options !== "object") {
    return { ...DEFAULT_OPTIONS };
  }

  const sanitized: ChatOptions = { ...DEFAULT_OPTIONS };
  if (typeof options.temperature === "number") sanitized.temperature = clamp(options.temperature, 0, 1.5);
  if (typeof options.top_p === "number") sanitized.top_p = clamp(options.top_p, 0, 1);
  if (typeof options.max_tokens === "number") sanitized.max_tokens = Math.max(64, Math.min(options.max_tokens, 4096));
  return sanitized;
}

function applyGuardrails(messages: ChatMessage[], metadata: ChatMetadata | undefined): ChatMessage[] {
  const systemGuardrail = buildSystemPrompt(metadata);
  if (!systemGuardrail) {
    return messages;
  }

  const [first, ...rest] = messages;
  if (first && first.role === "system") {
    return enforceLimit([
      { role: "system", content: `${systemGuardrail}\n\n${first.content}`.trim() },
      ...rest
    ]);
  }

  return enforceLimit([
    { role: "system", content: systemGuardrail },
    ...messages
  ]);
}

function enforceLimit(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }

  const guardrail = messages[0];
  return [guardrail, ...messages.slice(messages.length - (MAX_MESSAGES - 1))];
}

function buildSystemPrompt(metadata: ChatMetadata | undefined): string {
  const base = `You are NPHIES Edge Copilot. Guide the user through Saudi NPHIES Taameen workflows. ` +
    `Ask clarifying questions if any identifiers are missing before generating payloads.`;

  const structured = `Whenever possible, include a compact JSON snippet with the fields intent, patientId, coverageId, claimId, ` +
    `recommendedEndpoint, and nextSteps. If information is unavailable, leave the field as null.`;

  const locale = metadata?.locale ? describeLocale(metadata.locale) : "Respond in the user's language.";
  const intent = metadata?.intent ? `Primary intent: ${String(metadata.intent)}.` : undefined;
  const schema = metadata?.schemaHint ? `Follow this schema strictly: ${metadata.schemaHint}.` : undefined;
  const context = metadata?.context ? formatContext(metadata.context) : undefined;

  return [base, structured, locale, intent, schema, context].filter(Boolean).join("\n\n");
}

function describeLocale(locale: string): string {
  if (locale.toLowerCase().startsWith("ar")) {
    return "Respond in Modern Standard Arabic unless referencing code identifiers.";
  }
  if (locale.toLowerCase().startsWith("en")) {
    return "Respond in English and use short, actionable sentences.";
  }
  return `Match the user's locale (${locale}).`;
}

function formatContext(context: Record<string, unknown>): string {
  return `Reference context (do not restate identifiers unnecessarily):\n${JSON.stringify(context, null, 2)}`;
}

function buildPayload(request: ValidatedRequest) {
  return {
    model: request.model,
    messages: request.messages,
    stream: request.stream,
    metadata: {
      ...request.metadata,
      traceId: request.traceId
    },
    options: request.options
  };
}

function buildEndpoint(base: string | undefined): string {
  const origin = base && base.trim().length > 0 ? base.trim() : DEFAULT_ENDPOINT;
  return new URL("/v1/chat/completions", origin).toString();
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      message: "Failed to parse Ollama response",
      raw: text,
      error: (error as Error).message
    };
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
