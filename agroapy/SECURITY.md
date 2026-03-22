# AGROPAY — Security Model & Threat Analysis

**Version:** 2.0
**Date:** March 23, 2026
**Classification:** Public

---

## 1. Trust Model

### 1.1 Trusted Components

| Component | Trust Level | Justification |
|-----------|------------|---------------|
| Aleo Network (AleoBFT) | High | BFT consensus with 25+ validators; audited by Trail of Bits, NCC Group, zkSecurity |
| Leo Program (agropay_v1.aleo) | High (after audit) | Deterministic execution; all invariants enforced in finalize; open source |
| Shield Wallet | Medium | Third-party wallet; user trusts it with private key. Mitigated: open source, ecosystem-endorsed |
| Go Backend | Low | Convenience layer; never touches funds. Compromise = degraded UX, not fund loss |
| PostgreSQL / Redis | Low | Mirrors of on-chain state; rebuildable from chain. Compromise = stale data, not fund loss |

### 1.2 Untrusted Components

| Component | Threat | Mitigation |
|-----------|--------|------------|
| Other circle members | Griefing, social engineering, timing analysis | Privacy by design (records); governance module for member removal |
| Aleo RPC providers | Censorship, stale data, MitM | Multiple RPC endpoints with fallback; verify block hashes |
| Frontend CDN | Code injection, XSS | Subresource integrity (SRI); content security policy (CSP); pinned deployments |
| User's device | Malware, keylogger | Out of scope; standard wallet security advice applies |

---

## 2. Threat Model

### 2.1 On-Chain Threats

#### T1: Double Contribution (Same Member Contributes Twice in One Round)

**Severity:** High
**Likelihood:** Medium (Wave 4), Low (Production)

**Description:** The `contribute` transition increments a public counter in finalize but does not record which address contributed. A member could call `contribute` twice using the same Membership record (consumed and recreated each time), incrementing the counter to its limit before other members can contribute. This would allow the attacker to effectively lock out other members.

**Wave 4 Mitigation:** The frontend enforces one-contribution-per-round by tracking ContributionReceipt records client-side. This is insufficient against a malicious user who bypasses the frontend.

**Production Mitigation:** Add a nullifier mapping:
```
mapping nullifiers: field => bool;
// In contribute finalize:
let nullifier: field = BHP256::hash_to_field(caller_commitment, circle_id, current_round);
assert(!Mapping::contains(nullifiers, nullifier));
Mapping::set(nullifiers, nullifier, true);
```
The challenge: `self.caller` is not available in finalize (only transitions). The nullifier must be computed in the transition using the Membership record's owner field, then passed to finalize as a public input. This reveals the nullifier hash (public) but not the address (private, since the hash is one-way).

#### T2: Position Hijacking (Claiming Wrong Position)

**Severity:** High
**Likelihood:** Low

**Description:** An attacker could try to join a circle at a position that isn't theirs, hoping to receive the pot earlier.

**Mitigation:** The `join_circle` finalize function enforces `position == current_member_count`. Positions are assigned sequentially and cannot be chosen. The attacker would need to front-run other joiners — possible but the position they get is still sequential, just earlier than expected. Since all positions eventually receive the pot, this has no financial benefit.

#### T3: Pot Claim by Wrong Member

**Severity:** Critical
**Likelihood:** None (by design)

**Description:** A member whose position != current_round attempts to claim the pot.

**Mitigation:** The `claim_pot` transition asserts `membership.position == expected_round`. Since the Membership record is a private record that cannot be forged (it's cryptographically bound to the program that created it), only the rightful recipient can pass this assertion.

#### T4: Fake Membership Record

**Severity:** Critical
**Likelihood:** None (by design)

**Description:** An attacker creates a fake Membership record to join a circle without going through `join_circle`.

**Mitigation:** Aleo records are cryptographically signed by the program that creates them. A record with program_id `agropay_v1.aleo` can only have been created by a transition in that program. Forging a record would require breaking the ZK proof system (computationally infeasible).

#### T5: Admin Privilege Escalation

**Severity:** Medium
**Likelihood:** Low

**Description:** The circle admin attempts to extract funds or manipulate circle state beyond their authority.

**Mitigation:** The admin has NO special on-chain privileges beyond being at position 0. The `admin` field in CircleInfo is metadata only — no transition checks for admin authority. All transitions are governed by Membership record ownership and position matching. The admin cannot:
- Modify circle parameters after creation (immutable in mapping)
- Skip a round or redirect the pot
- Remove a member (on-chain; governance module handles this)
- Withdraw escrowed funds (program logic only releases to position-matched recipient)

#### T6: Circle ID Collision

**Severity:** Medium
**Likelihood:** Very Low

**Description:** Two users independently create circles with the same circle_id (field value).

**Mitigation:** The `create_circle` finalize asserts `!Mapping::contains(circles, circle_id)`. The second creation will fail. The frontend generates circle_id as a hash of `(address + timestamp + random_nonce)`, making collisions astronomically unlikely (field is 253 bits).

### 2.2 Off-Chain Threats

#### T7: Backend Database Tampering

**Severity:** Low
**Likelihood:** Low

**Description:** An attacker with database access modifies circle metadata, event logs, or user profiles.

**Mitigation:** The database is a convenience mirror — not the source of truth. Financial state (circles, rounds, contributions, payouts) is always read from chain via the indexer. Modified database entries will be overwritten on the next indexer sync. Off-chain metadata (circle names, descriptions) could be corrupted but has no financial impact.

**Additional controls:**
- Database credentials rotated quarterly
- Parameterized queries (no SQL injection)
- Principle of least privilege: backend service account has no DDL permissions
- Audit logging for admin operations

#### T8: API Abuse / Rate Limiting

**Severity:** Medium
**Likelihood:** High

**Description:** Automated requests overwhelm the API, causing degraded service for legitimate users.

**Mitigation:**
- Rate limiting per IP: 100 requests/minute for public endpoints, 30/minute for authenticated endpoints
- Rate limiting via Redis counter with sliding window
- WebSocket connection limit: 5 connections per IP
- Cloudflare DDoS protection for production deployment

#### T9: JWT Token Theft

**Severity:** Medium
**Likelihood:** Medium

**Description:** An attacker steals a user's JWT token and impersonates them on the backend.

**Mitigation:**
- JWT tokens are short-lived (24 hours)
- JWT tokens grant limited permissions (register metadata, update profile) — NOT fund access
- Wallet-based authentication: the JWT is derived from a wallet signature, so the attacker would need the private key to generate a new token
- Backend operations are non-financial; the worst outcome is registering a fake circle name
- HttpOnly, Secure, SameSite cookies for token storage (not localStorage)

#### T10: Chain Indexer Manipulation

**Severity:** Medium
**Likelihood:** Low

**Description:** The indexer misprocesses or skips events, causing the database to diverge from chain state.

**Mitigation:**
- Sequential block processing with no gaps
- Crash recovery from persisted `last_height`
- Idempotent event processing (upserts, not inserts)
- Health check monitors `indexer_lag` — alerts if > 20 blocks behind
- Manual re-index capability: set `last_height = 0` to reprocess all blocks

### 2.3 Social/Economic Threats

#### T11: Circle Griefing (Join But Never Contribute)

**Severity:** High
**Likelihood:** High

**Description:** A member joins a circle and intentionally never contributes, blocking the round from completing and preventing the designated recipient from receiving the pot.

**Wave 4 Mitigation:** Social pressure via the "X of N contributed" counter. The circle effectively stalls.

**Production Mitigation:**
1. Governance vote to remove non-contributing member (67% threshold)
2. Time-based auto-skip: after `deadline_blocks`, the round auto-advances, skipping the griefer. Pot reduces by 1 share and the griefer's Membership is invalidated.
3. Reputation-gated circles: require minimum CompletionCredentials to join

#### T12: Sybil Attack (One Person, Multiple Positions)

**Severity:** High
**Likelihood:** Medium

**Description:** An attacker creates multiple wallets, joins a circle in multiple positions, and manipulates the rotation to concentrate payouts.

**Wave 4 Mitigation:** Invite-only circles (admin shares link with known people). Social trust.

**Production Mitigation:**
1. Require zPass identity verification (one verified identity per position)
2. Reputation-gated circles (attacker needs completed circles per wallet)
3. Stake requirement: small deposit per position, slashed on detection of sybil behavior

#### T13: Front-Running Pot Claims

**Severity:** Low
**Likelihood:** Low

**Description:** A validator or observer sees a `claim_pot` transaction in the mempool and attempts to front-run it.

**Mitigation:** The `claim_pot` transition requires a Membership record with the correct position. Only one wallet holds this record. Front-running is impossible because the attacker cannot produce the required private record.

---

## 3. Cryptographic Security

### 3.1 Proof System

AGROPAY inherits Aleo's cryptographic stack:

- **Proof system:** Marlin (universal, updatable zkSNARK)
- **Curve:** BLS12-377 (pairing-friendly, optimized for ZK)
- **Hash function:** Poseidon (circuit-friendly hash used in record commitments)
- **Commitment scheme:** Pedersen commitments for record serial numbers

### 3.2 Key Management

| Key Type | Purpose | Storage | Rotation |
|----------|---------|---------|----------|
| Private key | Signs transactions, owns records | User's wallet (browser extension) | User-managed |
| View key | Decrypts records owned by the address | User's wallet | Derived from private key |
| Program proving key | Generates ZK proofs for transitions | Cached client-side after first use | Changes on program update |
| JWT signing key | Signs backend auth tokens | Server environment variable | Quarterly rotation |
| Database credentials | Backend DB access | Server environment variable | Quarterly rotation |

### 3.3 Record Security

Each record is encrypted with the owner's address-derived key. Specifically:

1. Record plaintext contains fields (owner, circle_id, position, etc.)
2. Record is encrypted using the owner's view key
3. Record commitment (hash of plaintext) is posted on-chain
4. Record serial number (nullifier) is posted when the record is consumed
5. ZK proof attests that the plaintext matches the commitment without revealing the plaintext

An attacker cannot:
- Read a record without the owner's view key
- Create a valid record without executing a legitimate transition
- Spend a record without the owner's private key
- Link a consumed record to a new record (serial numbers are unlinkable)

---

## 4. Backend Security Controls

### 4.1 Input Validation

Every API endpoint validates:
- Request body size (max 1MB)
- Content-Type header (must be application/json for POST/PUT)
- Required fields present and non-empty
- String lengths within bounds (circle_id: max 100 chars, name: max 200 chars)
- Aleo address format validation (starts with `aleo1`, valid bech32)
- Circle_id format validation (valid field representation)
- No HTML/script injection in text fields (sanitize before storage)

### 4.2 SQL Injection Prevention

All database queries use parameterized statements via pgx:

```go
// Correct: parameterized
row := pool.QueryRow(ctx,
    "SELECT * FROM circles WHERE circle_id = $1", circleID)

// Never: string concatenation
// row := pool.QueryRow(ctx,
//     "SELECT * FROM circles WHERE circle_id = '" + circleID + "'")
```

### 4.3 CORS Configuration

```go
cors.Options{
    AllowedOrigins:   []string{"https://agropay.xyz", "http://localhost:3000"},
    AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
    AllowCredentials: true,
    MaxAge:           300,
}
```

### 4.4 HTTP Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval';
    connect-src 'self' https://api.explorer.provable.com wss://agropay.xyz;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
```

### 4.5 Dependency Security

- `go mod verify` on every build to check module checksums
- Dependabot / Renovate for automated dependency updates
- No `replace` directives in go.mod (except for local development)
- Frontend: `npm audit` in CI pipeline; pin exact versions in package-lock.json

---

## 5. Incident Response Plan

### 5.1 Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| P0 | Fund loss or privacy breach | < 1 hour | Double-spend exploit, record decryption bug |
| P1 | Service outage affecting all users | < 4 hours | Backend crash, database down |
| P2 | Degraded service for some users | < 24 hours | Slow API, indexer lag |
| P3 | Minor issue, no user impact | Next business day | Log formatting error, stale cache |

### 5.2 P0 Response Protocol

1. **Detect:** Monitoring alert or user report
2. **Contain:** If on-chain exploit, immediately deploy a new program version that pauses affected transitions. If backend, take API offline.
3. **Assess:** Determine scope: which circles affected, how many users, total value at risk
4. **Fix:** Deploy patched code; if on-chain, requires new program deployment and migration
5. **Communicate:** Notify all affected users via frontend banner and social channels
6. **Review:** Post-mortem within 72 hours; publish public report if user funds were affected

### 5.3 Contact

Security issues should be reported to: **security@29projectslab.com**

We commit to acknowledging reports within 24 hours and providing a timeline for resolution within 72 hours.

---

## 6. Audit Checklist (Pre-Mainnet)

### 6.1 Smart Contract Audit

| Item | Status | Notes |
|------|--------|-------|
| All transitions have correct access control | Pending | Position-based, record-based |
| Finalize functions validate all invariants | Pending | Status checks, counter limits, amount matching |
| No integer overflow/underflow | Pending | Leo's type system prevents most; verify u64 multiplication in claim_pot |
| Records cannot be forged or replayed | By design | Aleo's record model guarantees |
| Nullifier system prevents double actions | Not implemented | Wave 5 |
| Token integration is atomic | Not implemented | Production |
| Circle completion logic is correct | Pending | Round advancement, status transitions |
| Edge cases: 3-member circle, 12-member circle | Pending | Test both extremes |

### 6.2 Backend Security Audit

| Item | Status |
|------|--------|
| All endpoints have rate limiting | Pending |
| SQL injection prevention (parameterized queries) | Pending |
| Authentication bypass testing | Pending |
| CORS configuration review | Pending |
| Dependency vulnerability scan | Pending |
| Secrets management review (no hardcoded credentials) | Pending |
| WebSocket connection limits | Pending |
| Input validation on all endpoints | Pending |

### 6.3 Frontend Security Audit

| Item | Status |
|------|--------|
| XSS prevention (no dangerouslySetInnerHTML) | Pending |
| CSP headers configured | Pending |
| No private keys in browser storage | By design |
| Wallet connection handled securely | Pending |
| HTTPS enforced | Pending |
| SRI for external scripts | Pending |

---

*AGROPAY Security Model v2.0 — XXIX Labs*
*Report security issues to: security@29projectslab.com*
