import { Env } from "../index";

let cachedKey: CryptoKey | null = null;

export async function signPayload(payload: string, env: Env) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = await getSigningKey(env);

  const signatureBuffer = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, key, data);
  const signature = arrayBufferToBase64(signatureBuffer);

  const digestBuffer = await crypto.subtle.digest("SHA-256", data);
  const digest = arrayBufferToBase64(digestBuffer);

  return { payload, signature, digest };
}

async function getSigningKey(env: Env) {
  if (cachedKey) {
    return cachedKey;
  }
  const pem = env.NPHIES_CLIENT_KEY.trim();
  const buffer = pemToArrayBuffer(pem);
  cachedKey = await crypto.subtle.importKey(
    "pkcs8",
    buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return cachedKey;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = Uint8Array.from(atob(cleaned), (char) => char.charCodeAt(0));
  return binary.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
