---
sidebar_position: 3
title: Deploy
---

# Deploying AGROPAY

## Deploy the Leo Contract

### Prerequisites

- Leo CLI ≥ 3.5 installed
- Testnet private key with ≥ 10 ALEO (deployment fee)

### Steps

```bash
cd contracts/agropay

# Set your private key
export PRIVATE_KEY="APrivateKey1zkp..."

# Deploy
leo deploy \
  --network testnet \
  --endpoint "https://api.explorer.provable.com/v1" \
  --private-key "$PRIVATE_KEY" \
  --broadcast --yes
```

Or use the deploy script from the repo root:

```bash
# Create .env with your private key
echo "PRIVATE_KEY=APrivateKey1zkp..." > .env

bash scripts/deploy.sh
```

### Current Deployment

`agropay_v1.aleo` is already deployed on Aleo Testnet:

- **Explorer:** [testnet.aleoscan.io/program?id=agropay_v1.aleo](https://testnet.aleoscan.io/program?id=agropay_v1.aleo)

---

## Deploy the Frontend

### Vercel (recommended)

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

The frontend reads Aleo chain state directly via RPC — no additional environment variables are required for basic functionality.

### Optional: Backend URL

If you're running the Go backend for circle name storage:

```bash
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=https://your-backend.fly.dev
```

The frontend degrades gracefully if the backend is unavailable — circles show their abbreviated ID instead of a name.

---

## Deploy the Backend (Optional)

The Go backend stores off-chain circle names (Leo has no string type). The app works without it.

### Requirements

- PostgreSQL database
- PORT, AGROPAY_DATABASE_URL environment variables

```bash
cd backend

# Create schema
psql "$AGROPAY_DATABASE_URL" < migrations/001_create_tables.up.sql

# Run
go run ./cmd/agropay
```

### Fly.io example

```bash
fly launch --name agropay-api
fly secrets set AGROPAY_DATABASE_URL="postgres://..."
fly deploy
```

---

## Environment Variables Summary

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `PRIVATE_KEY` | deploy script | Yes | Testnet private key for contract deployment |
| `NEXT_PUBLIC_BACKEND_URL` | frontend | No | Go API URL for circle names |
| `AGROPAY_DATABASE_URL` | backend | Yes | PostgreSQL connection string |
| `PORT` | backend | No | Default: 8080 |
