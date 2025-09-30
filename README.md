# NPHIES Assistant - AI-Powered Healthcare Platform

🩺 **AI-Enhanced NPHIES Integration Platform** - Saudi Arabia's Healthcare Intelligence Assistant

## Overview

A modern healthcare platform integrating Saudi NPHIES Taameen system with advanced AI capabilities, featuring Claude 3.5 Sonnet intelligence and BrainSAIT healthcare data management.

## ✨ Key Features

### 🤖 AI-Powered Chat Assistant
- **Claude 3.5 Sonnet Integration**: Advanced AI responses for healthcare workflows
- **NPHIES Expertise**: Specialized in Saudi healthcare system processes
- **Multi-language Support**: Arabic and English interface
- **Contextual Memory**: Maintains conversation history and user preferences

### 🏥 Healthcare Data Management (BrainSAIT)
- **Hospital Management**: Comprehensive hospital profiles and capabilities
- **Patient Records**: Secure patient data management with FHIR compliance
- **AI Model Tracking**: Healthcare AI model performance and metrics
- **Vision 2030 Compliance**: Saudi Vision 2030 healthcare goals tracking

### 🔐 NPHIES Integration
- **Eligibility Verification**: Real-time patient eligibility checks
- **Claims Processing**: Automated claim submission and tracking
- **Payment Management**: Healthcare payment processing and reconciliation

### 🌐 Progressive Web Application
- **PWA Features**: Installable, offline-capable application
- **Responsive Design**: Works seamlessly across all devices
- **Real-time Updates**: Live data synchronization
- **Accessibility**: WCAG 2.1 compliant interface

## 🏗️ Technical Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for modern styling
- **Vite** for optimized builds
- **i18next** for internationalization

### Backend & Cloud
- **Cloudflare Pages Functions** for serverless API endpoints
- **Cloudflare Workers** for edge computing
- **MongoDB Atlas** for healthcare data storage
- **Anthropic Claude 3.5 Sonnet** for AI processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Cloudflare account
- MongoDB Atlas account
- Anthropic AI API key

### Installation
```bash
git clone https://github.com/Fadil369/chat-nphies.git
cd chat-nphies

# Setup environment
cp .env.example .env

# Install and build
cd frontend && npm install && npm run build
```

### Environment Configuration
Configure these variables in Cloudflare Pages:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-[your-key]
MONGODB_API_KEY=[your-mongodb-data-api-key]

# Optional - defaults provided
ANTHROPIC_API_BASE=https://api.anthropic.com
CLAUDE_MODEL=claude-3-5-sonnet-20241022
MONGODB_API_URL=https://data.mongodb-api.com/app/data-kmxgp/endpoint/data/v1
```

### Deploy
```bash
npx wrangler pages deploy ./frontend/dist --project-name nphies-assistant
```

## 🎯 Usage Guide

### AI Chat Assistant
- Open chat interface and ask healthcare questions
- Get NPHIES workflow guidance with structured responses
- Switch languages seamlessly between Arabic and English
- Receive actionable guidance with API recommendations

### BrainSAIT Dashboard
- Navigate to `/brainsait` for healthcare intelligence
- View hospital data, patient records, and AI analytics
- Monitor Vision 2030 compliance metrics
- Access comprehensive healthcare insights

### NPHIES Operations
- Verify patient eligibility in real-time
- Submit and track healthcare claims
- Process payments and reconciliation

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/claude` | POST | Claude 3.5 Sonnet AI processing |
| `/api/brainsait/:action` | GET/POST | Healthcare data operations |
| `/api/nphies/:service` | POST | NPHIES system integration |

## 🛡️ Security & Compliance

- **FHIR Standards**: Healthcare data exchange compliance
- **End-to-end Encryption**: Secure data transmission
- **Role-based Access**: Healthcare professional authorization
- **Audit Logging**: Comprehensive compliance tracking
- **Privacy Protection**: Healthcare regulation compliance

## 🌍 Internationalization

- **Arabic (RTL)**: Full right-to-left language support
- **English**: Complete localization
- **Dynamic Switching**: Change language without reload
- **Healthcare Terminology**: Saudi market appropriate terms

## 📈 Performance

- **Edge Computing**: Global Cloudflare Workers deployment
- **CDN Optimization**: Fast asset delivery worldwide
- **Optimized Builds**: 103KB gzipped JavaScript bundle
- **Real-time Sync**: Live data updates

## 🤝 Support

For technical support or healthcare integration questions:

- Check project documentation
- Report issues through GitHub
- Contact NPHIES integration team for system-specific queries

---

**Powered by Claude 3.5 Sonnet AI | Built for Saudi Vision 2030 Healthcare Transformation**

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
