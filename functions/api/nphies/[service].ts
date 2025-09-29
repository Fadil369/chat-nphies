import { handleNphies } from "../../../workers/src/nphies";
import type { Env } from "../../../workers/src";

type RequestContext = {
	request: Request;
	env: Env;
	params: Record<string, string | string[] | undefined>;
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

export const onRequest = async ({ request, env, params }: RequestContext) => {
	if (request.method !== "POST") {
		return jsonError("Method Not Allowed", 405);
	}

	const service = typeof params?.service === "string" ? params.service : undefined;
	if (!service) {
		return jsonError("Service is required", 400);
	}

	let payload: Record<string, unknown>;
	try {
		const data = await request.json();
		payload = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
	} catch (error) {
		console.error("Failed to parse NPHIES request body", error);
		return jsonError("Invalid JSON body", 400);
	}

	return handleNphies(service, payload, env);
};
