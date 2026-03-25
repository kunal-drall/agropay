# AGROPAY

Privacy-preserving savings circles (ROSCAs) on the Aleo blockchain. Zero-knowledge proofs keep individual contributions and payouts private while keeping collective circle state publicly verifiable.

> **Aleo Privacy Buildathon (AKINDO) | March 2026**

---

## What it does

A ROSCA (Rotating Savings and Credit Association) works like this: N members each contribute a fixed amount every round. One member receives the total pot each round. After N rounds, everyone has contributed N×A and received N×A once.

AGROPAY puts this on-chain with privacy:

- **Who contributed?** Private — only the counter ("6 of 8 contributed") is public
- **Who received the pot?** Private — only the fact that it was claimed is public
- **Your savings history?** Private — stored as a `Credential` record in your wallet

---

## Repository structure

```
agropay/
├── contracts/agropay/        Leo smart contract (agropay_v1.aleo)
│   ├── src/main.leo          5 transitions: create, join, contribute, claim_pot, claim_credential
│   ├── inputs/agropay.in     Test inputs for leo run
│   └── program.json
├── frontend/                 Next.js 14 App Router frontend
│   ├── app/                  Pages: dashboard, create, circle/[id]
│   ├── components/           8 components (WalletProvider, forms, buttons, status)
│   └── lib/                  aleo.ts, program.ts, records.ts, store.ts
├── backend/                  Minimal Go API (circle names off-chain)
│   ├── cmd/agropay/main.go
│   └── internal/             config, handler, repository, model
├── scripts/
│   ├── deploy.sh             Deploy Leo program to testnet
│   └── test-flow.sh          Run leo run tests locally
├── docs/
│   ├── SUBMISSION.md         AKINDO submission changelog
│   └── SECURITY.md (→ agroapy/SECURITY.md)
└── agroapy/                  Full planning docs (PRD, TRD, ARCHITECTURE, SECURITY)
```

---

## Quick start

### 1. Build and test the Leo contract

```bash
# Requires Leo CLI: https://developer.aleo.org/leo/installation
cd contracts/agropay
leo build

# Test transitions locally
leo run create_circle 9876543210field 10000000u64 3u8 0u8
leo run join_circle 9876543210field 1u8 10000000u64 3u8
bash ../../scripts/test-flow.sh
```

### 2. Run the frontend

```bash
cd frontend
npm install
# Optional: create .env.local and set NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
npm run dev
# Open http://localhost:3000
```

Requires [Soter Wallet](https://chrome.google.com/webstore/detail/soter-wallet) or [Leo Wallet](https://leo.app/) browser extension connected to **Aleo Testnet**.

### 3. Run the backend (optional — needed for circle names)

```bash
cd backend
cp .env.example .env
# Edit AGROPAY_DATABASE_URL to point to your PostgreSQL instance

# Create the schema
psql "$AGROPAY_DATABASE_URL" < migrations/001_create_tables.up.sql

# Run
go run ./cmd/agropay
```

### 4. Deploy to testnet

```bash
# Create .env at repo root with your testnet private key
echo "PRIVATE_KEY=APrivateKey1..." > .env

# Fund testnet address at https://faucet.aleo.org/
bash scripts/deploy.sh
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Leo language, deployed on Aleo Testnet |
| Wallet | Soter + Leo Wallet via `@demox-labs/aleo-wallet-adapter-*` |
| Frontend | Next.js 14 (App Router), Tailwind CSS 3, Zustand, react-hot-toast |
| Backend | Go 1.22, chi router, pgx/v5, zerolog |
| Database | PostgreSQL (circle names only — chain is source of truth) |

---

## Privacy model

| Data | Visibility |
|------|------------|
| Circle exists (amounts, members, frequency) | **Public** mapping |
| Contribution count ("6 of 8") | **Public** counter |
| WHO contributed | **Private** — record owner only |
| WHO received the pot | **Private** — record owner only |
| Savings history (Credential) | **Private** — shareable via view key |

---

## v1 limitations (documented, not hidden)

- Contributions are tracked without actual credit movement on testnet. Production integration with `credits.aleo` or `usdcx.aleo` is documented in `agroapy/ARCHITECTURE.md`.
- `ContributionReceipt.round` is hardcoded to `0u8` — Leo transitions can't read mappings. The actual round is enforced in `finalize`. v2 fix documented in `contracts/agropay/README.md`.
- No nullifier-based double-contribution prevention. The `contributions_received <= total_members` bound limits damage. Nullifier design is in `agroapy/SECURITY.md`.

---

*XXIX Labs — Save together. Stay private. Build reputation.*
