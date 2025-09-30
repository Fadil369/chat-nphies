import { Router } from "itty-router";
import { handleNphies } from "./nphies";
import { handleClaude } from "./claude";
import { handleBrainSAIT } from "./brainsait";

export interface Env {
  NPHIES_CLIENT_CERT: string;
  NPHIES_CLIENT_KEY: string;
  NPHIES_API_BASE: string;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_API_BASE?: string;
  CLAUDE_MODEL?: string;
  // BrainSAIT Database Configuration
  MONGODB_API_KEY: string;
  MONGODB_API_URL?: string;
}

const router = Router();

router.post("/api/nphies/:service", async (request, env: Env) => {
  const { service } = request.params as { service: string };
  const body = (await request.json()) as Record<string, unknown>;
  return handleNphies(service, body, env);
});

router.post("/api/claude", async (request, env: Env) => {
  const body = await request.json();
  return handleClaude(body, env);
});

router.post("/api/brainsait/:action", async (request, env: Env) => {
  const { action } = request.params as { action: string };
  const body = (await request.json()) as Record<string, unknown>;
  return handleBrainSAIT(action, body, env);
});

router.get("/api/brainsait/:action", async (request, env: Env) => {
  const { action } = request.params as { action: string };
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return handleBrainSAIT(action, params, env);
});

router.all("*", () => new Response("Not Found", { status: 404 }));

export default {
  fetch: (request: Request, env: Env, ctx: any) => router.handle(request, env, ctx)
};
