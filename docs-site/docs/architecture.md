---
sidebar_position: 3
title: Architecture
---

# Architecture

## Overview

```
Browser (Next.js App Router)
  │
  ├─ Wallet Extension (Leo / Soter)
  │    ├─ requestTransaction()  →  sign & submit  →  Aleo Testnet
  │    └─ requestRecords()      →  decrypt Membership records
  │
  ├─ fetch() → Aleo RPC (api.explorer.provable.com)
  │    ├─ /program/agropay_v1.aleo/mapping/circles/{id}
  │    ├─ /program/agropay_v1.aleo/mapping/rounds/{id}
  │    └─ /program/agropay_v1.aleo/mapping/members/{id}
  │
  └─ fetch() → Go Backend (optional)
       └─ /api/v1/circles/{id}/meta  →  { name, description }
```

**Chain is the source of truth.** All financial state lives in the Leo program. The backend only stores human-readable names (Leo has no string type). If the backend is down, the app continues working — circles show abbreviated IDs.

---

## On-Chain Layer

### Public State (Mappings)

Anyone can read these via Aleo RPC:

| Mapping | Key | Value | Purpose |
|---------|-----|-------|---------|
| `circles` | `field` (circle ID) | `CircleInfo` | Admin, amounts, status, member count |
| `rounds` | `field` (circle ID) | `RoundState` | Current round, contributions received |
| `members` | `field` (circle ID) | `u8` | Joined member count |

### Private State (Records)

Only the record owner can read these (via wallet decryption):

| Record | Owner | Purpose |
|--------|-------|---------|
| `Membership` | Member | Proves membership, holds position, consumed on each action |
| `ContributionReceipt` | Member | Proof of contribution in a round |
| `Payout` | Recipient | Proof of receiving the pot |
| `Credential` | Member | Proof of completing a full savings circle |

---

## Data Flow: Creating a Circle

```
1. User fills form (name, amount, members, frequency)
2. Frontend generates circle_id = random field element
3. Frontend calls wallet.requestTransaction(create_circle, inputs)
4. Wallet builds + signs the transaction
5. Transaction submitted to Aleo Testnet
6. Leo finalize runs on-chain:
   - writes circles mapping
   - writes members mapping (count = 1)
   - writes rounds mapping (round 0)
7. Membership record issued to caller (private, in their wallet)
8. Frontend POSTs { circle_id, name } to Go backend
9. Dashboard fetches circles mapping → shows circle card
```

---

## Data Flow: Contribute

```
1. User clicks Contribute
2. Frontend reads Membership record from wallet
3. Calls wallet.requestTransaction(contribute, [membership_record])
4. Wallet:
   - Decrypts the Membership record
   - Builds transaction consuming the record (creates new one)
   - Submits to Aleo Testnet
5. Leo finalize runs:
   - Verifies contributions_received < total_members
   - Increments rounds.contributions_received
6. New Membership record + ContributionReceipt issued (private)
7. Frontend reads updated rounds mapping → shows updated counter
```

---

## Privacy Architecture

Aleo uses a **record + commitment** model. Records are stored as encrypted ciphertexts on-chain. Only the record owner (holding the view key) can decrypt them.

**What makes AGROPAY private:**

1. **Who contributes:** `contribute` increments a public counter but the record input is encrypted. The network validates the proof without knowing the caller's identity in the context of the contribution.

2. **Who receives the pot:** `claim_pot` issues a `Payout` record privately. The network records that the pot was claimed (public) but the recipient is only visible in the encrypted record.

3. **Savings history:** `Credential` records are never published to any public mapping. The holder can share them via view key selectively.

---

## Backend Layer

The Go backend is a **convenience layer only**. It never touches private keys and cannot affect on-chain state.

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/circles/register` | Store `{ circle_id, name, description }` — first-write-wins |
| `GET /api/v1/circles/{id}/meta` | Return stored name, or 404 |
| `GET /health` | Liveness check |

The backend uses PostgreSQL as its only datastore. No cache, no indexer, no WebSocket.

---

## Frontend Layer

- **Framework:** Next.js 14 (App Router)
- **State:** Zustand store for membership records + circle cache
- **Wallet:** `@demox-labs/aleo-wallet-adapter-react` — handles `requestRecords`, `requestTransaction`, `transactionStatus`
- **Chain reads:** Direct `fetch()` calls to Aleo RPC — no SDK required for reads
- **Styling:** Tailwind CSS + custom dark theme

**No mock data. No fake states.** Every value shown comes from the Aleo chain or the wallet. If something fails to load, it shows an error state with a retry button.
