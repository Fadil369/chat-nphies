import { handleBrainSAIT } from "../../../workers/src/brainsait";
import type { Env } from "../../../workers/src";

type RequestContext = {
	request: Request;
	env: Env;
	params: { action: string };
};

function jsonError(message: string, status: number): Response {
	return new Response(JSON.stringify({ message }), {
		status,
		headers: {
			"Content-Type": "application/json",
			Allow: "GET, POST"
		}
	});
}

export const onRequest = async ({ request, env, params }: RequestContext) => {
	const { action } = params;

	if (!action) {
		return jsonError("Action parameter is required", 400);
	}

	try {
		let body: Record<string, unknown> = {};

		if (request.method === "POST") {
			try {
				body = await request.json();
			} catch (error) {
				console.error("Failed to parse BrainSAIT request body", error);
				return jsonError("Invalid JSON body", 400);
			}
		} else if (request.method === "GET") {
			const url = new URL(request.url);
			url.searchParams.forEach((value, key) => {
				body[key] = value;
			});
		} else {
			return jsonError("Method Not Allowed", 405);
		}

		return handleBrainSAIT(action, body, env);
	} catch (error) {
		console.error("BrainSAIT API error:", error);
		return jsonError("Internal Server Error", 500);
	}
};