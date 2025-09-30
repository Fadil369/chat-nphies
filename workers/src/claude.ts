import { Env } from "./index";

type ChatRole = "system" | "user" | "assistant";

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

const DEFAULT_MODEL = "claude-3-5-sonnet-20241022";
const DEFAULT_ENDPOINT = "https://api.anthropic.com";
const DEFAULT_OPTIONS: ChatOptions = {
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 4096
};
const MAX_MESSAGES = 20;

class WorkerError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "WorkerError";
  }
}

export async function handleClaude(body: unknown, env: Env): Promise<Response> {
  try {
    if (!env.ANTHROPIC_API_KEY) {
      throw new WorkerError("Missing Anthropic API key", 500);
    }

    const request = validateRequest(body, env);
    const payload = buildPayload(request);
    const endpoint = buildEndpoint(env.ANTHROPIC_API_BASE);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    const data = await parseResponseBody(response);

    if (!response.ok) {
      const message = (data as { error?: { message?: string }; message?: string })?.error?.message ??
        (data as { message?: string })?.message ??
        "Upstream Claude request failed";
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

    console.error("Unexpected Claude worker failure", error);
    return jsonResponse({ message: "Unexpected error while contacting Claude" }, 502);
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
    : env.CLAUDE_MODEL ?? DEFAULT_MODEL;

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
      role: msg.role as ChatRole,
      content: msg.content.trim()
    }))
    .slice(-MAX_MESSAGES);
}

function sanitizeOptions(options: ChatOptions | undefined): ChatOptions {
  if (!options || typeof options !== "object") {
    return { ...DEFAULT_OPTIONS };
  }

  const sanitized: ChatOptions = { ...DEFAULT_OPTIONS };
  if (typeof options.temperature === "number") sanitized.temperature = clamp(options.temperature, 0, 1);
  if (typeof options.top_p === "number") sanitized.top_p = clamp(options.top_p, 0, 1);
  if (typeof options.max_tokens === "number") sanitized.max_tokens = Math.max(256, Math.min(options.max_tokens, 8192));
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
  const base = `You are NPHIES Edge Assistant powered by BrainSAIT, an expert AI helper for Saudi Arabia's National Platform for Health Information Exchange (NPHIES) workflows. You have access to real healthcare data and AI insights to provide enhanced assistance.

**Core Capabilities:**
1. **Eligibility Verification**: Creating EligibilityRequest FHIR payloads with real patient data validation
2. **Claims Processing**: Generating Claim FHIR resources using AI predictions and historical patterns
3. **Payment Management**: Handling PaymentNotice and PaymentReconciliation with cost optimization
4. **FHIR Compliance**: Ensuring all generated JSON follows NPHIES FHIR R4 specifications
5. **AI-Powered Insights**: Leveraging BrainSAIT database for intelligent recommendations

**BrainSAIT Integration:**
- Access to real hospital data, patient records, and AI model predictions
- Vision 2030 compliance metrics and digital maturity assessments  
- AI-powered risk scoring and cost estimation for claims
- Historical patterns and fraud detection capabilities

**Response Format:**
Always include a structured JSON snippet when generating FHIR payloads:
\`\`\`json
{
  "intent": "eligibility|claim|payment|audit",
  "patientId": "patient_identifier",
  "coverageId": "coverage_identifier", 
  "claimId": "claim_identifier_if_applicable",
  "recommendedEndpoint": "/api/endpoint/path",
  "nextSteps": ["step1", "step2", "step3"],
  "aiInsights": {
    "riskScore": 0.85,
    "predictedCost": 1200.50,
    "approvalLikelihood": 0.92
  },
  "fhirPayload": { /* actual FHIR resource */ }
}
\`\`\`

**Enhanced Guidelines:**
- Leverage BrainSAIT patient data when available for personalized recommendations
- Include AI-powered risk assessments and cost predictions
- Reference Vision 2030 goals and hospital digital maturity levels
- Use historical patterns for approval likelihood estimation
- Provide proactive fraud detection insights`;

  const locale = metadata?.locale ? describeLocale(metadata.locale) : "Respond in the user's preferred language.";
  const intent = metadata?.intent ? `Current workflow focus: ${String(metadata.intent)}.` : undefined;
  const schema = metadata?.schemaHint ? `Schema requirements: ${metadata.schemaHint}.` : undefined;
  const context = metadata?.context ? formatContext(metadata.context) : undefined;

  return [base, locale, intent, schema, context].filter(Boolean).join("\n\n");
}

function describeLocale(locale: string): string {
  if (locale.toLowerCase().startsWith("ar")) {
    return "Respond in Modern Standard Arabic, but keep technical terms and code identifiers in English.";
  }
  if (locale.toLowerCase().startsWith("en")) {
    return "Respond in clear, professional English with technical precision.";
  }
  return `Respond in the user's locale (${locale}) while keeping technical terms in English.`;
}

function formatContext(context: Record<string, unknown>): string {
  return `Current conversation context:\n${JSON.stringify(context, null, 2)}`;
}

function buildPayload(request: ValidatedRequest) {
  return {
    model: request.model,
    messages: request.messages,
    stream: request.stream,
    ...request.options
  };
}

function buildEndpoint(base: string | undefined): string {
  const origin = base && base.trim().length > 0 ? base.trim() : DEFAULT_ENDPOINT;
  return new URL("/v1/messages", origin).toString();
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      message: "Failed to parse Claude response",
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
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
    }
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}