# AGROPAY — AKINDO Submission

**Team:** XXIX Labs (Kunal Drall, Daksh Drall, Priya)
**Contact:** kd@kosh.finance | hello@29projectslab.com
**Submission date:** March 2026
**Event:** Aleo Privacy Buildathon

---

## What We Built

AGROPAY is a privacy-preserving ROSCA (Rotating Savings and Credit Association) protocol on Aleo. It digitizes savings circles — known as esusu, tanda, susu, stokvel, chit fund, and committee across 100+ countries — with zero-knowledge cryptography.

### Core insight

Transparent blockchains (Ethereum, Solana) solve the fraud problem for ROSCAs but worsen the social dynamics problem: every contribution, payout, and participant identity is permanently public. AGROPAY uses Aleo's record model to keep individual activity private while keeping collective state publicly verifiable.

---

## Live Deployment

| Component | URL / ID |
|-----------|----------|
| Leo program | `agropay_v1.aleo` on Aleo Testnet |
| Program explorer | https://testnet.aleoscan.io/program?id=agropay_v1.aleo |
| Frontend | (deployment URL) |
| GitHub | https://github.com/xxix-labs/agropay |

---

## Changelog (v1)

### Smart contract (`agropay_v1.aleo`)

- **`create_circle`** — Creates a savings circle. Caller receives a private `Membership` record at position 0. Circle metadata (amounts, member count, frequency) is public in the `circles` mapping. Admin identity is public (admin created the circle). Everything else is private.

- **`join_circle`** — Joins a pending circle at the next sequential position. Position is assigned, not chosen, preventing position hijacking. When the last seat fills, the circle automatically activates and round 0 begins. Privacy: the member count increments publicly, but WHO joined is private.

- **`contribute`** — Increments the public contribution counter for the current round. The member's `Membership` record is consumed and recreated. A `ContributionReceipt` is issued as proof. Privacy: the counter goes from N to N+1 publicly, but no address is linked to the increment.

- **`claim_pot`** — The member whose `position == current_round` claims the full pot. All members must have contributed first. Advances to the next round on success, or marks the circle complete on the final round. Privacy: that a pot was claimed is public; the recipient is private.

- **`claim_credential`** — After circle completion, any member claims a `Credential` record proving savings history. Fully private — no on-chain trace of who claimed.

### Frontend (Next.js 14)

- Wallet integration: Soter Wallet + Leo Wallet via `@demox-labs/aleo-wallet-adapter-*`
- Dashboard: fetches user's `Membership` records from wallet, loads chain state for each
- Create circle: form → on-chain transaction → share link
- Circle detail: join (pending), contribute (active), claim pot (active, correct position), claim credential (complete)
- Honest UI: no mock data, no fake states — all values from chain or shown as loading/error
- Error handling: every async operation has `try/catch` with user-visible toast messages

### Backend (Go)

- Minimal API: stores off-chain circle names (Leo has no string type)
- `POST /api/v1/circles/register` — first-write wins; stores `name` and `description` for a `circle_id`
- `GET /api/v1/circles/{id}/meta` — returns stored name; 404 if no name registered
- Frontend degrades gracefully if backend is unavailable (shows abbreviated circle ID)

---

## Privacy model

| Information | Visibility |
|-------------|-----------|
| Circle exists with params X | **Public** |
| N of M members contributed | **Public** |
| Pot claimed in round R | **Public** |
| WHO contributed | **Private** (record owner only) |
| WHO received the pot | **Private** |
| Individual savings history | **Private** (Credential record) |
| Member identities | **Private** |

---

## What we explicitly did NOT build (v2 roadmap)

| Feature | Why deferred |
|---------|-------------|
| USDCx / USAD token transfer | Requires stable cross-program call API. Integration path documented in `docs/ARCHITECTURE.md`. Contributions are tracked without credit movement in v1. |
| Nullifier anti-double-contribution | Counter bound (`≤ total_members`) limits damage. Per-address nullifiers using `BHP256::hash_to_field` are designed but not deployed. |
| VRF-based rotation order | Sequential positions are functionally correct. VRF adds privacy for the rotation order. |
| ZK reputation aggregation | `Credential` record structure is designed for this. Aggregation logic (summing across multiple credentials) is Wave 5. |
| Micro-lending | Requires the reputation module first. |
| Governance / member removal | 67% vote threshold designed in PRD; implementation is Wave 5. |
| Circle discovery / public registry | Circles share IDs directly. Public registry requires additional privacy analysis to avoid correlation attacks. |

---

## Test checklist (testnet)

```
□ 1. Open frontend — see landing page, no fake data
□ 2. Connect Soter or Leo Wallet
□ 3. Create circle (3 members, 10 credits, weekly)
□ 4. Wallet popup appears — confirm transaction
□ 5. TX ID shown in success toast, TxStatus polls for confirmation
□ 6. Share link displayed — copy and open in a second browser tab
□ 7. Second wallet: connect + click "Join Circle"
□ 8. Third wallet: connect + click "Join Circle" → circle activates
□ 9. Circle detail shows "Active" status, "Round 1 of 3 — 0 of 3 contributed"
□ 10. Each member clicks Contribute → counter increments to 3
□ 11. Position-0 wallet sees "Claim Pot" button with pot amount
□ 12. Claim → round advances to 2, contributions reset to 0
□ 13. Repeat for rounds 2 and 3
□ 14. Circle status changes to "Completed"
□ 15. Each member can claim a CompletionCredential
```

---

## Building on Halo Protocol

XXIX Labs previously built [Halo Protocol](https://kosh.finance) on Solana — 50+ active users, 94% retention, 0% defaults, 510+ person waitlist. The top user request was privacy for contributions and payouts. That feedback is the direct origin of AGROPAY.

---

*AGROPAY Submission — XXIX Labs*
*Save together. Stay private. Build reputation.*
