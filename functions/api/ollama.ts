import { handleOllama } from "../../workers/src/ollama";
import type { Env } from "../../workers/src";

type RequestContext = {
	request: Request;
	env: Env;
};

function jsonError(message: string, status: number): Response {
	return new Response(JSON.stringify({ message }), {
		status,
		headers: {
			"Content-Type": "application/json",
			Allow: "POST"
		}
	});
}

export const onRequest = async ({ request, env }: RequestContext) => {
	if (request.method !== "POST") {
		return jsonError("Method Not Allowed", 405);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch (error) {
		console.error("Failed to parse Ollama request body", error);
		return jsonError("Invalid JSON body", 400);
	}

	return handleOllama(body, env);
};
