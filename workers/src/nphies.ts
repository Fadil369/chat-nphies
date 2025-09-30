import { Env } from "./index";
import { signPayload } from "./utils/crypto";

const SERVICE_PATHS: Record<string, string> = {
  eligibility: "eligibility",
  claim: "claim",
  "pre-authorization": "pre-authorization",
  payment: "payment-notice",
  "patient-record": "patient-record"
};

type GenericPayload = Record<string, unknown>;

export async function handleNphies(service: string, payload: GenericPayload, env: Env): Promise<Response> {
  const path = SERVICE_PATHS[service] ?? service;
  const fhirPayload = buildFhirPayload(service, payload);
  const serialized = JSON.stringify(fhirPayload);
  const signature = await signPayload(serialized, env);

  const url = new URL(path, env.NPHIES_API_BASE).toString();
  const headers = new Headers({
    "Content-Type": "application/fhir+json",
    "X-Signature": signature.signature,
    "X-Digest": signature.digest
  });

  const init: RequestInit = {
    method: "POST",
    headers,
    body: serialized
  };

  // NOTE: When deploying, bind the client certificate via Cloudflare's mTLS support for Workers.
  // Example (subject to change as APIs evolve):
  // init.cf = {
  //   clientCertificate: env.NPHIES_CLIENT_CERT,
  //   clientKey: env.NPHIES_CLIENT_KEY
  // } as any;

  const response = await fetch(url, init);
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      body = { raw: text, parseError: (error as Error).message };
    }
  }

  return new Response(JSON.stringify(body), {
    status: response.status,
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

function buildFhirPayload(service: string, payload: GenericPayload): GenericPayload {
  if (service === "eligibility") {
    const { patientId, coverageId, sctCode } = payload as {
      patientId: string;
      coverageId: string;
      sctCode: string;
    };
    return {
      resourceType: "EligibilityRequest",
      status: "active",
      patient: { reference: `Patient/${patientId}` },
      insurance: [{ reference: `Coverage/${coverageId}` }],
      item: [
        {
          category: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/claimcategory",
                code: "service"
              }
            ]
          },
          productOrService: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: sctCode
              }
            ]
          }
        }
      ]
    };
  }

  if (service === "claim") {
    const { claimId, patientId, amount, diagnosis } = payload as {
      claimId: string;
      patientId: string;
      amount: number;
      diagnosis: string;
    };
    return {
      resourceType: "Claim",
      id: claimId,
      status: "active",
      type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/claim-type", code: "professional" }] },
      patient: { reference: `Patient/${patientId}` },
      diagnosis: [
        {
          sequence: 1,
          diagnosisCodeableConcept: {
            coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: diagnosis }]
          }
        }
      ],
      total: {
        value: amount,
        currency: "SAR"
      }
    };
  }

  // Default passthrough for other services.
  return payload;
}
