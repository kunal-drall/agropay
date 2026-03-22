# AGROPAY — System Architecture

**Version:** 2.0 — Production Architecture
**Date:** March 23, 2026

---

## 1. Architecture Principles

**Chain is the source of truth.** All financial state lives in the Leo program. The backend is a read-optimized mirror. If the database and chain disagree, chain wins. If the backend is down, users can still interact with the protocol directly through their wallet.

**Backend is a convenience layer.** It provides fast queries, real-time updates, off-chain metadata, and notification routing. It never touches private keys, never moves funds, and never modifies on-chain state.

**Client owns private data.** Record decryption happens in the browser via the wallet. The backend never receives view keys, decrypted records, or any private state. The frontend can optionally share non-sensitive membership data with the backend for UX improvements (e.g., "My Circles" page).

**Fail-safe by default.** Every component is designed to fail without corrupting state. The indexer can restart from any block. The cache can be flushed without data loss. The backend can restart without affecting active circles.

---

## 2. Component Architecture

### 2.1 On-Chain Layer

```
┌────────────────────────────────────────────────────────┐
│                 Aleo Network (AleoBFT)                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           agropay_v1.aleo                        │  │
│  │                                                  │  │
│  │  MAPPINGS (Public State)                         │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │ circles: field → CircleInfo              │   │  │
│  │  │ rounds:  field → RoundState              │   │  │
│  │  │ members: field → u8                      │   │  │
│  │  │ nullifiers: field → bool  (production)   │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  │  RECORDS (Private State)                         │  │
│  │  ┌──────────────────────────────────────────┐   │  │
│  │  │ Membership        → owned by member      │   │  │
│  │  │ ContributionReceipt → owned by member    │   │  │
│  │  │ Payout            → owned by recipient   │   │  │
│  │  │ Credential        → owned by member      │   │  │
│  │  └──────────────────────────────────────────┘   │  │
│  │                                                  │  │
│  │  TRANSITIONS                                     │  │
│  │  create_circle → join_circle → contribute        │  │
│  │  → claim_pot → claim_credential                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ credits.aleo │  │  usdcx.aleo  │  (token programs) │
│  └──────────────┘  └──────────────┘                   │
└────────────────────────────────────────────────────────┘
```

### 2.2 Backend Layer

```
┌──────────────────────────────────────────────────────────┐
│                    Go Backend Service                     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ HTTP Server  │  │  WebSocket  │  │  Chain Indexer   │ │
│  │ (chi router) │  │    Hub      │  │  (goroutine)     │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                    │          │
│         ▼                ▼                    ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Service Layer                        │   │
│  │  CircleService / RoundService / UserService       │   │
│  │  NotificationService                              │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │              Repository Layer                     │   │
│  │  SQL queries via pgx (no ORM)                     │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│         ┌───────────────┼───────────────┐               │
│         ▼               ▼               ▼               │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐   │
│  │ PostgreSQL │  │   Redis    │  │  Aleo RPC      │   │
│  │ (pgx pool) │  │ (go-redis) │  │  (HTTP client) │   │
│  └────────────┘  └────────────┘  └────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 2.3 Frontend Layer

```
┌──────────────────────────────────────────────────────────┐
│                  Next.js Frontend                         │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │     Shield Wallet     │  │     Go Backend API       │ │
│  │     (Direct Chain)    │  │     (Enriched Data)      │ │
│  │                       │  │                          │ │
│  │  • Sign transactions  │  │  • Circle metadata       │ │
│  │  • Decrypt records    │  │  • Round states (cached) │ │
│  │  • Generate proofs    │  │  • Event history         │ │
│  │  • Execute transitions│  │  • User profiles         │ │
│  └──────────┬───────────┘  └───────────┬──────────────┘ │
│             │                           │                │
│             ▼                           ▼                │
│  ┌──────────────────────────────────────────────────┐   │
│  │                 Application State                 │   │
│  │                                                   │   │
│  │  Zustand Store         React Query / SWR          │   │
│  │  ├── wallet state      ├── circles (server)       │   │
│  │  ├── private records   ├── rounds (server)        │   │
│  │  └── ui state          └── events (server)        │   │
│  └──────────────────────────────────────────────────┘   │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │                 UI Components                     │   │
│  │  Dashboard / CircleDetail / CreateCircle          │   │
│  │  ContributeFlow / ClaimFlow / CredentialView      │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagrams

### 3.1 Create Circle Flow

```
User                Frontend              Wallet              Aleo Network         Backend
 │                     │                    │                      │                  │
 │  fill form          │                    │                      │                  │
 │────────────────────>│                    │                      │                  │
 │                     │                    │                      │                  │
 │                     │  build tx          │                      │                  │
 │                     │───────────────────>│                      │                  │
 │                     │                    │                      │                  │
 │                     │                    │  submit tx           │                  │
 │                     │                    │─────────────────────>│                  │
 │                     │                    │                      │                  │
 │                     │                    │  tx confirmed        │                  │
 │                     │                    │<─────────────────────│                  │
 │                     │                    │                      │                  │
 │                     │  tx result         │                      │                  │
 │                     │<───────────────────│                      │                  │
 │                     │                    │                      │                  │
 │                     │  POST /api/v1/circles (register name)     │                  │
 │                     │─────────────────────────────────────────────────────────────>│
 │                     │                    │                      │                  │
 │                     │                    │                      │  indexer detects  │
 │                     │                    │                      │  new block with   │
 │                     │                    │                      │  create_circle tx │
 │                     │                    │                      │<─────────────────│
 │                     │                    │                      │                  │
 │                     │                    │                      │  update DB +      │
 │                     │                    │                      │  invalidate cache │
 │                     │                    │                      │─────────────────>│
 │  "Circle created!"  │                    │                      │                  │
 │<────────────────────│                    │                      │                  │
```

### 3.2 Contribute Flow

```
User                Frontend              Wallet              Aleo Network         Backend
 │                     │                    │                      │                  │
 │  click Contribute   │                    │                      │                  │
 │────────────────────>│                    │                      │                  │
 │                     │                    │                      │                  │
 │                     │  build tx with     │                      │                  │
 │                     │  Membership record │                      │                  │
 │                     │───────────────────>│                      │                  │
 │                     │                    │                      │                  │
 │                     │                    │  submit tx           │                  │
 │                     │                    │  (Membership record  │                  │
 │                     │                    │   consumed + recreated│                 │
 │                     │                    │   + receipt created)  │                 │
 │                     │                    │─────────────────────>│                  │
 │                     │                    │                      │                  │
 │                     │                    │  finalize:           │                  │
 │                     │                    │  counter++ in mapping│                  │
 │                     │                    │  (no address linked) │                  │
 │                     │                    │<─────────────────────│                  │
 │                     │                    │                      │                  │
 │                     │  new Membership +  │                      │                  │
 │                     │  ContributionReceipt                      │                  │
 │                     │<───────────────────│                      │                  │
 │                     │                    │                      │                  │
 │                     │                    │                      │  indexer: counter │
 │                     │                    │                      │  update in DB     │
 │                     │                    │                      │                  │
 │                     │                    │         WebSocket push: "6/8 contributed"│
 │                     │<─────────────────────────────────────────────────────────────│
 │  "Contributed!"     │                    │                      │                  │
 │<────────────────────│                    │                      │                  │
```

---

## 4. Privacy Architecture

### 4.1 Privacy Guarantees Matrix

| Data | On-Chain Visibility | Backend Visibility | Other Members See |
|------|-------------------|--------------------|-------------------|
| Circle exists | Public (mapping) | Yes (indexed) | Yes |
| Contribution amount | Public (mapping) | Yes (indexed) | Yes (same for all) |
| Total members | Public (mapping) | Yes (indexed) | Yes |
| Current round | Public (mapping) | Yes (indexed) | Yes |
| Contribution count | Public (counter) | Yes (indexed) | Yes ("6 of 8") |
| Member identity | Private (record) | Only if user opts in | No |
| Contribution author | Private (record) | No | No |
| Payout recipient | Private (record) | No | No |
| Contribution timing | Block timestamp (public) but not linked to address | Time of block, not of who | No |
| Wallet balance | Never exposed | No | No |
| Savings history | Private (credential) | No | No (selective disclosure only) |

### 4.2 Information Leakage Analysis

**What a passive observer (block explorer user) can learn:**
- A circle exists with parameters X, Y, Z
- N contributions happened in round R (but not who made them)
- A pot was claimed in round R (but not by whom)
- The circle completed

**What a circle member can learn (beyond the above):**
- Their own contribution receipts and payouts
- Their own position and when they'll receive the pot
- Nothing additional about other members

**What the backend operator can learn (beyond a passive observer):**
- Circle names and descriptions (off-chain metadata)
- Which addresses voluntarily registered their membership (opt-in only)
- API access patterns (IP addresses, request timing)
- Nothing about on-chain private state

### 4.3 Privacy Limitations (Documented)

1. **Transaction graph analysis:** A sophisticated observer could correlate contribution transaction timing with known user activity patterns. Mitigation: encourage users to contribute at varying times; future work on transaction batching.

2. **Member count at join time:** Each `join_circle` transaction increments the public member counter. While the joining address isn't revealed, the timing of the counter increment could be correlated with other on-chain activity from the same address. Mitigation: negligible risk for most threat models.

3. **Pot claim linkability:** The `claim_pot` transition requires the caller's position to match the current round. An observer who knows member positions (e.g., the admin who shared invite links in order) could infer who claimed. Mitigation: Wave 5 VRF-based rotation randomizes the order.

4. **No double-contribution prevention per-address (Wave 4):** The finalize function increments a counter but doesn't track which addresses contributed. A malicious member could contribute twice and block others. Mitigation: nullifier system in production.

---

## 5. Scalability Design

### 5.1 Current Bottlenecks and Solutions

| Bottleneck | Limit | Solution |
|-----------|-------|---------|
| Aleo RPC read latency | ~500ms–2s per mapping read | Backend cache (Redis, 30s TTL) |
| PostgreSQL write throughput | ~5,000 writes/s | Sufficient for years; add read replicas if needed |
| Chain indexer throughput | Sequential block processing | Single-instance is sufficient; shard by circle_id for extreme scale |
| WebSocket connections | ~10,000 per Go instance | Horizontal scale with Redis pub/sub for cross-instance messaging |
| Leo program circuit size | Fixed per transition | Cannot scale on-chain; design for minimal on-chain state |

### 5.2 Horizontal Scaling Path

```
Phase 1 (< 1,000 users):
  Single Go backend + PostgreSQL + Redis
  Single indexer goroutine

Phase 2 (1,000–50,000 users):
  2-3 Go backend instances behind load balancer
  Redis pub/sub for WebSocket coordination
  PostgreSQL read replicas for query load

Phase 3 (50,000+ users):
  Dedicated indexer service (separate from API server)
  PostgreSQL partitioning by circle_id hash
  CDN for static frontend assets
  Consider dedicated Aleo RPC node
```

---

## 6. Disaster Recovery

### 6.1 Data Loss Scenarios

| Scenario | Impact | Recovery |
|----------|--------|----------|
| PostgreSQL data loss | Backend shows no circles | Re-index from chain (indexer rebuilds all state from block 0) |
| Redis data loss | Temporary slow reads | Auto-repopulates from PostgreSQL on next access |
| Backend downtime | No enriched data, no WebSocket | Users interact directly with chain via wallet (core functionality preserved) |
| Frontend downtime | No UI | Users can use Leo Playground or CLI to interact with the deployed program |
| Aleo network downtime | No transactions | All components wait; resume when network recovers |

### 6.2 Backup Strategy

| Component | Backup Frequency | Retention |
|-----------|-----------------|-----------|
| PostgreSQL | Daily automated + WAL archiving | 30 days |
| Indexer state | Persisted every block | N/A (recoverable from chain) |
| Off-chain metadata (names, descriptions) | Part of PostgreSQL backup | 30 days |
| Private keys | User responsibility (wallet seed phrase) | N/A |

---

*AGROPAY Architecture v2.0 — XXIX Labs*
