import { Router } from "itty-router";
import { handleNphies } from "./nphies";
import { handleOllama } from "./ollama";

export interface Env {
  NPHIES_CLIENT_CERT: string;
  NPHIES_CLIENT_KEY: string;
  NPHIES_API_BASE: string;
  OLLAMA_API_KEY: string;
  OLLAMA_API_BASE?: string;
  OLLAMA_MODEL?: string;
}

const router = Router();

router.post("/api/nphies/:service", async (request, env: Env) => {
  const { service } = request.params as { service: string };
  const body = (await request.json()) as Record<string, unknown>;
  return handleNphies(service, body, env);
});

router.post("/api/ollama", async (request, env: Env) => {
  const body = await request.json();
  return handleOllama(body, env);
});

router.all("*", () => new Response("Not Found", { status: 404 }));

export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => router.handle(request, env, ctx)
};
