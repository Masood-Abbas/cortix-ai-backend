# CortexAI Backend

The backend contains an Express gateway and independent services:

- `gateway` (`8000`) — CORS, authentication middleware, and routing
- `services/auth` (`8001`) — user authentication and user data
- `services/chat` (`8002`) — conversations and messages
- `services/billing` (`8004`) — Stripe checkout and billing
- `services/agent` (`8005`) — LangGraph routing and AI agents
- `shared/redis` — shared Redis utilities

The gateway is the public backend entry point. The agent data route is available through the gateway at `GET http://localhost:8000/api/agent/data`, and directly at `GET http://localhost:8005/data`.

## Requirements

- Node.js 20 or newer
- MongoDB
- Redis
- Credentials for the providers used by enabled features

## Environment setup

Each service loads its own `.env` file. Copy the matching example file:

```powershell
copy gateway\.env.example gateway\.env
copy services\auth\.env.example services\auth\.env
copy services\chat\.env.example services\chat\.env
copy services\billing\.env.example services\billing\.env
copy services\agent\.env.example services\agent\.env
```

Replace placeholders with real values. Never commit `.env` files or API keys. The `.env.example` files are safe templates to commit.

## Start Redis

```powershell
docker compose up -d redis
```

## Install dependencies

Install dependencies in the backend root and each service:

```powershell
npm install
cd gateway; npm install
cd ..\services\auth; npm install
cd ..\chat; npm install
cd ..\billing; npm install
cd ..\agent; npm install
```

## Run services

Run each service from its own directory in a separate terminal:

```powershell
cd gateway; npm run dev
cd services\auth; npm run dev
cd services\chat; npm run dev
cd services\billing; npm run dev
cd services\agent; npm run dev
```

The agent service uses LangGraph for chat, search, coding, PDF, PPT, vision, PDF-RAG, and image-analysis agents. Gemini image generation stores generated files in S3 and returns temporary download URLs.

## Tests

From `backend`:

```powershell
npm test
```
