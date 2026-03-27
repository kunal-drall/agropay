---
sidebar_position: 7
title: Roadmap
---

# Roadmap

## v1 — Current (Testnet)

The deployed `agropay_v1.aleo` is a complete ROSCA coordination mechanism with privacy-preserving contributions and payouts.

**What's live:**
- ✅ `create_circle` — Create savings circles with configurable params
- ✅ `join_circle` — Join with sequential position assignment
- ✅ `contribute` — Private contribution with public counter
- ✅ `claim_pot` — Private payout with position enforcement
- ✅ `claim_credential` — Private savings history proof
- ✅ `@noupgrade` constructor — Frozen, auditable bytecode
- ✅ Next.js frontend with Leo + Soter wallet support
- ✅ Direct chain reads — no mock data

**Known v1 Limitations (documented, not hidden):**

| Limitation | Reason | Production Fix |
|-----------|--------|----------------|
| No real credit movement | Leo cross-program calls require stable API | Integrate `credits.aleo` transfer in v2 |
| `ContributionReceipt.round = 0u8` | Async transitions can't read mappings | Pass round as transition input, verify in finalize |
| No nullifier anti-double-contribution | Adds complexity, needed for production | BHP256 nullifier mapping in v2 |
| No member removal | Governance adds significant complexity | 67% vote threshold in v2 |

---

## v2 — In Development

`agropay_v2.aleo` (code complete, not yet deployed) adds:

- **Emergency pause** via `@custom` constructor with admin key
- Foundation for credit movement integration
- Nullifier-based double-contribution prevention

---

## v3 — Planned

| Feature | Description |
|---------|-------------|
| **Real credit movement** | `contribute` calls `credits.aleo.transfer_private` — actual ALEO moves |
| **Nullifier system** | `BHP256::hash_to_field` prevents double-contribution per-address per-round |
| **VRF rotation order** | Random (but verifiable) rotation order instead of sequential positions |
| **Governance** | 67% member vote to eject a non-contributing member |
| **Multi-token** | Support USAD / USDCx stablecoin circles |

---

## Production — Planned

| Feature | Description |
|---------|-------------|
| **ZK reputation aggregation** | Sum `Credential.contribution_amount * rounds_completed` across credentials for a verifiable savings score |
| **Micro-lending** | Lend against your Credential-backed reputation score |
| **Circle discovery** | Invite-only registry with privacy-preserving metadata |
| **Mobile support** | React Native app with Shield Wallet / mobile wallet integration |
| **Mainnet deployment** | After security audit and credit movement is stable |

---

## Why These Are Deferred

**Real credit movement** requires stable cross-program call semantics in Leo. The API changed significantly between Leo 3.4 and 3.5. We don't want to deploy fund-moving logic on an unstable API.

**Nullifier system** requires the caller's commitment (not `self.caller` — unavailable in finalize) to be passed from the transition to finalize as a public input. The design is complete; implementation is straightforward but adds audit surface.

**Governance** is complex enough to deserve its own audit. A 67% vote threshold with on-chain ballot counting requires careful analysis of griefing vectors.

**VRF** adds privacy to the rotation order (who gets the pot when) but doesn't affect the correctness of the ROSCA mechanism. Sequential positions work correctly for v1 trust-based circles.

---

## Contributing

The protocol is open source. See [github.com/kunal-drall/agropay](https://github.com/kunal-drall/agropay).

Areas where contributions are most welcome:
- Nullifier implementation and audit
- `credits.aleo` integration PR
- Frontend improvements (mobile responsiveness, PWA)
- Additional wallet adapter support
