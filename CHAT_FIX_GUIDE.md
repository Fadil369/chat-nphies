# 🚨 Chat Issue - Environment Variables Not Configured

## Problem Identified

The ChatBot is failing because **environment variables are not configured in the Cloudflare Pages deployment**. The application is deployed but lacks:

1. `ANTHROPIC_API_KEY` - Required for Claude 3.5 Sonnet API
2. `MONGODB_API_KEY` - Required for BrainSAIT database integration
3. `MONGODB_API_URL` - MongoDB Atlas Data API endpoint

## Quick Fix Steps

### 1. Configure Environment Variables in Cloudflare Pages

Go to your Cloudflare Pages dashboard and add these environment variables:

```bash
# Required - Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-api03-[your-key-here]

# Required - Get from https://cloud.mongodb.com/
MONGODB_API_KEY=[your-mongodb-data-api-key]
MONGODB_API_URL=https://data.mongodb-api.com/app/data-kmxgp/endpoint/data/v1

# Optional - Use defaults if not specified
ANTHROPIC_API_BASE=https://api.anthropic.com
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### 2. Steps to Configure in Cloudflare Dashboard

1. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/)
2. Select your `nphies-assistant` project
3. Go to **Settings** → **Environment Variables**
4. Add the variables above for **Production** environment
5. Click **Save**
6. **Redeploy** the site (it should automatically redeploy when you save environment variables)

### 3. Get Required API Keys

#### Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up/Login
3. Go to **API Keys**
4. Create a new key
5. Copy the key (starts with `sk-ant-api03-`)

#### MongoDB Atlas Data API Key

1. Go to [MongoDB Cloud](https://cloud.mongodb.com/)
2. Select your project/cluster
3. Go to **Data API**
4. Create a new API key
5. Copy the key and endpoint URL

## Current Status

- ✅ Application code is working correctly
- ✅ Frontend builds successfully  
- ✅ API endpoints are properly configured
- ❌ Environment variables missing in production
- ❌ ChatBot fails with "The assistant ran into an issue"

## Test After Configuration

Once environment variables are set:

1. Wait for automatic redeployment (or trigger manual deployment)
2. Test ChatBot at: [https://924a0a40.nphies-assistant.pages.dev](https://924a0a40.nphies-assistant.pages.dev)
3. Try asking: "Help me check patient eligibility"
4. Should receive proper AI response instead of error

## Alternative: Local Testing

To test locally with environment variables:

```bash
# Create .env file in root directory
cp .env.example .env

# Edit .env with your actual API keys
# Then run locally:
cd frontend && npm run dev
```

## Files Modified

- ✅ Created `/functions/api/brainsait/[action].ts` for proper BrainSAIT API routing
- ✅ All ChatBot error handling is comprehensive
- ✅ Mock responses work as fallbacks
- ✅ Claude 3.5 Sonnet integration is properly implemented

The issue is **100% environment configuration**, not code problems.
