# NPHIES Edge Assistant

Mobile-first, bilingual assistant that orchestrates the full NPHIES workflow on Cloudflare Pages with Workers acting as the secure API gateway and Ollama Cloud powering real-time guidance.

## Architecture

- **React + Vite + Tailwind CSS** front-end served from Cloudflare Pages (`frontend/`).
- **Cloudflare Pages Functions (Workers)** handle mutual TLS signed calls to NPHIES and proxy requests to Ollama (`functions/api/*` importing shared logic from `workers/src`). Guardrail prompts, locale-aware metadata, and bounded history ensure structured bilingual responses.
- **Responsive assistant overlay** brings the chat copilot into a full-screen mobile view with tone controls and trace identifiers for troubleshooting.
- **Secrets and Certificates** managed through `wrangler secret` bindings; no secrets are committed to the repo.
- **GitHub Actions** deploy both the static site and Worker edge API on push to `main`.

## Getting Started

1. Install dependencies.

   ```bash
   npm install --prefix frontend
   npm install --prefix workers
   ```

2. Provide secrets locally using `.dev.vars` (never commit secrets):

   ```env
   NPHIES_CLIENT_CERT="-----BEGIN CERTIFICATE-----..."
   NPHIES_CLIENT_KEY="-----BEGIN PRIVATE KEY-----..."
   NPHIES_API_BASE="https://api.nphies.gov.sa/taameen"
   OLLAMA_API_KEY="sk-..."
   OLLAMA_API_BASE="https://api.ollama.com" # optional override
   OLLAMA_MODEL="llama3.1-8b-instruct"      # optional override
   ```

3. Run the SPA:

   ```bash
   npm run dev --prefix frontend
   ```

4. Start Workers locally (runs alongside Vite dev server):

   ```bash
   npm run dev --prefix workers
   ```

## Deployment

Push to `main` to trigger `.github/workflows/deploy.yml`. Configure the following repository secrets beforehand:

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

### Manual Cloudflare Pages deployment

1. Build the frontend bundle (wrangler will reuse `frontend/dist` if it already exists):

   ```bash
   npm run build --prefix frontend
   ```

2. Deploy to Cloudflare Pages. This compiles the bundled Pages Functions from `functions/api/*` alongside the static assets:

   ```bash
   npx wrangler pages deploy
   ```

3. Set production environment variables for the Pages project (`Settings → Environment Variables` within the Cloudflare dashboard) or via the CLI:

   ```bash
   npx wrangler pages secret put NPHIES_CLIENT_CERT
   npx wrangler pages secret put NPHIES_CLIENT_KEY
   npx wrangler pages secret put NPHIES_API_BASE
   npx wrangler pages secret put OLLAMA_API_KEY
   npx wrangler pages secret put OLLAMA_API_BASE   # optional override
   npx wrangler pages secret put OLLAMA_MODEL      # optional override
   ```

   These secrets hydrate the shared `workers/src` logic that powers `/api/ollama` and `/api/nphies/*` on Pages.

## Security Checklist

- Mutual TLS certificates stored as encrypted Workers secrets.
- RSA PKCS#1 v1.5 signing implemented in `workers/src/utils/crypto.ts`.
- `ConsentBanner` enforces explicit patient consent before PHI retrieval.
- Ready for Cloudflare Zero-Trust (Access) enforcement on `/api/*` routes.
- Ollama proxy injects system guardrails, clamps generation parameters, and appends trace IDs for monitoring.

## Directory Overview

```text
frontend/  # React + Vite SPA
workers/   # Cloudflare Pages Functions
.github/   # CI/CD pipelines
```

Refer to inline code comments for further guidance on extending transactions (claims, payments, patient lookups).
