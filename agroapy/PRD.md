# AGROPAY — Production Product Requirements Document

**Private Community Finance Protocol on Aleo**

**Version:** 2.0 — Full Production Scope
**Date:** March 23, 2026
**Team:** XXIX Labs (Kunal Drall, Daksh Drall, Priya)
**Contact:** kd@kosh.finance | hello@29projectslab.com

---

## Table of Contents

1. Executive Summary
2. Problem Analysis
3. Market Sizing & Validation
4. Product Vision & Principles
5. User Personas
6. Module Specifications
7. User Flows
8. Non-Functional Requirements
9. Go-To-Market Strategy
10. Competitive Analysis
11. Metrics & KPIs
12. Risk Register
13. Regulatory Considerations
14. Roadmap

---

## 1. Executive Summary

AGROPAY is a privacy-first community finance protocol on Aleo that digitizes ROSCAs (Rotating Savings and Credit Associations) with zero-knowledge cryptography. The protocol enables savings circles, micro-lending, portable financial identity, and anonymous governance — all with privacy guarantees that protect individual members from each other while maintaining public verifiability of collective state.

The core thesis: financial inclusion requires privacy — not from regulators, but from neighbors, family members, and fellow circle participants. The social dynamics that destroy informal savings groups (stigma around late payments, surveillance of payouts, power imbalances from financial visibility) are solved architecturally through Aleo's record model, where individual activity is cryptographically private but collective solvency is publicly provable.

AGROPAY targets the $300B+ annual ROSCA market across 100+ countries, serving 1.4 billion participants who currently rely on trust-based informal systems with no digital infrastructure, no portability, and no privacy.

---

## 2. Problem Analysis

### 2.1 The ROSCA Mechanism

A ROSCA operates as follows: N members agree to contribute a fixed amount A at regular intervals. Each round, one member receives the full pool (N × A). After N rounds, every member has both contributed (N × A total) and received (N × A once). The net financial effect is zero — no member gains or loses money. The value proposition is forced savings discipline and access to a lump sum without interest.

ROSCAs exist under dozens of names: chit funds (India), tandas (Mexico/Central America), susus (West Africa), stokvels (South Africa), hagbad (Somalia), hui (China/Vietnam), gam'iya (Egypt), committees (Pakistan), and arisan (Indonesia).

### 2.2 Failure Modes

ROSCAs fail for three primary reasons, ordered by frequency:

**Social dynamics (60% of failures):**
- Members who receive the pot early in the rotation have reduced incentive to continue contributing (moral hazard)
- Late contributors face social stigma, causing dropout rather than recovery
- Wealthier or higher-status members leverage visibility of others' financial fragility
- Women's savings groups in patriarchal contexts face surveillance; visible financial activity triggers confiscation or domestic conflict
- Recipients become targets for social borrowing pressure ("You just got the pot, lend me some")

**Coordination failure (25% of failures):**
- Members relocate, change phone numbers, or become unreachable
- No enforceable commitment mechanism beyond social pressure
- Disputes over rotation order, timing, or rule changes with no formal resolution process

**Fraud (15% of failures):**
- Organizer absconds with collected funds
- Members collude to exclude others
- Double-counting or misreporting contributions

### 2.3 Why Transparent Blockchains Worsen the Problem

Digitizing ROSCAs on Ethereum, Solana, or other transparent chains addresses fraud (smart contracts enforce rules) and coordination (on-chain state is always available) but catastrophically amplifies social dynamics:

- Every contribution amount, timing, and address is permanently visible on a block explorer
- Payout recipients are identifiable by anyone
- Contribution patterns reveal financial stress (contributing late in the round, contributing smaller amounts before topping up)
- Wallet balances expose total financial position to other members
- Historical participation is traceable across circles

The transparency that makes smart contracts trustless makes social dynamics maximally harmful.

### 2.4 Why Aleo Is Architecturally Required

Aleo's record model provides the exact primitive needed:

- **Private records** store individual state (membership, contributions, payouts) visible only to the owner
- **Public mappings** store collective state (circle metadata, round number, contribution count) visible to everyone
- **Finalize functions** execute public state transitions (incrementing counters) without linking them to specific private records
- **Selective disclosure** via view keys allows members to prove specific claims about their history without revealing the underlying data

No other production blockchain provides this hybrid public/private model natively. Aztec is EVM-focused and not yet mainnet. Secret Network uses TEEs rather than ZK. Midnight (Cardano) is in early access. Aleo is the only Layer-1 with a production-ready, ZK-native record model.

---

## 3. Market Sizing & Validation

### 3.1 Total Addressable Market

- **Global ROSCA volume:** $300B+ annually (World Bank, CGAP estimates)
- **Participants:** 1.4 billion people across 100+ countries
- **Penetration:** 80%+ of adults in Sub-Saharan Africa, 50%+ in South Asia, 30%+ in Latin America, growing in diaspora communities in North America and Europe

### 3.2 Serviceable Addressable Market

- **Digitally connected ROSCA participants:** ~400M (smartphone + internet access)
- **Crypto-adjacent or crypto-curious:** ~50M (overlapping with mobile money users in Africa, UPI users in India)
- **Average circle size:** 8 members, $50/month contribution, $400 pot
- **SAM value:** $50M × $400 × 12 months = ~$240B annual flow

### 3.3 Serviceable Obtainable Market (Year 1)

- **Target:** 1,000 active circles, 8,000 users
- **Average flow:** $200/month per user
- **Annual protocol flow:** $19.2M
- **At 0.5% protocol fee:** $96K revenue

### 3.4 Demand Validation

XXIX Labs validated ROSCA demand through **Halo Protocol** on Solana:

| Metric | Value |
|--------|-------|
| Active users (beta) | 50+ |
| Retention rate | 94% |
| Default rate | 0% |
| Waitlist | 510+ |
| Top user request | Privacy features |

Users explicitly and repeatedly requested that their contribution timing, amounts, and payout receipts be hidden from other members. Solana's architecture made this impossible. AGROPAY exists because of this validated, unmet demand.

---

## 4. Product Vision & Principles

### 4.1 Vision Statement

AGROPAY makes community finance private, portable, and programmable. Every savings circle, every micro-loan, every financial credential operates with zero-knowledge privacy — protecting members from each other while keeping the system publicly verifiable.

### 4.2 Design Principles

**Privacy as product, not feature.** Every design decision starts with "what must be hidden?" not "what can we add ZK to?" If a feature doesn't meaningfully use Aleo's privacy primitives, it doesn't belong in AGROPAY.

**Honest state, always.** The UI never shows data it doesn't have. If the chain hasn't confirmed a transaction, the UI shows "pending" — not a premature success state. If a mapping read fails, the UI shows an error — not cached stale data pretending to be current.

**Progressive complexity.** A first-time user creates or joins a circle and contributes. That's it. Reputation, lending, governance, and advanced features reveal themselves as the user's history grows. No feature walls, no premature onboarding flows.

**Offline-first thinking.** ROSCA participants in target markets have intermittent connectivity. The frontend must gracefully handle network interruptions, display the last-known state clearly, and queue actions for retry. Aleo's client-side proof generation aligns with this — proofs can be generated offline and broadcast when connectivity returns.

**No extraction.** AGROPAY does not monetize user data, sell analytics, or create information asymmetries. Protocol fees are transparent and minimal. The business model is protocol flow, not data brokerage.

---

## 5. User Personas

### 5.1 Amara — Diaspora Organizer (Primary)

**Demographics:** 34, Nigerian-American, lives in Houston. Works as a nurse. Sends remittances monthly.

**Context:** Organizes a 10-person esusu (ROSCA) with friends from her hometown. Currently manages it via WhatsApp group and Zelle transfers. Keeps a spreadsheet of who paid and when.

**Pain points:**
- Spends 3-4 hours per month chasing late payments via DM
- Two members dropped out last cycle after being publicly called out for late payment
- Her husband monitors their joint bank account; she wants the esusu to be private
- A member who received the pot early is ignoring contribution requests

**What AGROPAY gives her:**
- Automated contribution tracking without manual spreadsheets
- Privacy: she doesn't see who's late, just "7 of 10 contributed" — reducing the social pressure she has to apply
- Privacy from her husband: her Aleo wallet activity isn't visible on a bank statement
- Smart contract enforcement: the pot only disburses when all contributions are in

### 5.2 Ravi — Agricultural Cooperative Member (Secondary)

**Demographics:** 28, farmer in Madhya Pradesh, India. Participates in a 5-person chit fund organized by the village cooperative.

**Context:** His chit fund collects ₹5,000/month per member. The organizer keeps a paper ledger. Two years ago, an organizer in a neighboring village ran off with ₹2 lakh.

**Pain points:**
- Doesn't trust the organizer's ledger — no way to verify contributions independently
- Worried about organizer fraud but can't switch organizers without social conflict
- Doesn't want other members to know he sometimes borrows from his wife to make his contribution on time

**What AGROPAY gives him:**
- On-chain enforcement: the organizer can't abscond because funds are in the smart contract
- Privacy: his contribution timing and source are hidden from other members
- Verifiable state: he can check the public mapping to confirm the circle's health without trusting the organizer

### 5.3 Sofia — DeFi Power User (Tertiary)

**Demographics:** 26, crypto-native developer in Berlin. Holds ETH, SOL, stablecoins across multiple chains.

**Context:** Interested in AGROPAY as a novel DeFi primitive — fixed-term, group-coordinated savings with social accountability. Sees it as a savings commitment device superior to single-player vaults.

**Pain points:**
- Existing DeFi savings products are passive (deposit and forget) with no social coordination
- No existing protocol combines social accountability with financial privacy
- Wants to build reputation across circles for future undercollateralized borrowing

**What AGROPAY gives her:**
- A new savings primitive that doesn't exist on any other chain
- Privacy-preserving reputation that compounds across circles
- A path to undercollateralized DeFi lending without traditional KYC

---

## 6. Module Specifications

### 6.1 Module 1: Circles (MVP — Wave 4)

**Purpose:** Private savings circles with fixed contributions and rotating payouts.

#### 6.1.1 Circle Lifecycle

```
PENDING → ACTIVE → COMPLETED
   ↑          ↑         ↑
 create    all join    all rounds done
          + round 0     + credentials
           starts       claimable
```

#### 6.1.2 Circle Parameters

| Parameter | Type | Range | Mutable | Visibility |
|-----------|------|-------|---------|------------|
| circle_id | field | unique | No | Public |
| admin | address | valid aleo address | No | Public |
| contribution_amount | u64 | 1 – 1,000,000,000 microcredits | No | Public |
| total_members | u8 | 3 – 12 | No | Public |
| frequency | u8 | 0 (weekly), 1 (biweekly), 2 (monthly) | No | Public |
| status | u8 | 0, 1, 2 | Auto | Public |

#### 6.1.3 Operations

**Create Circle**
- Actor: Any user with a funded wallet
- Input: contribution_amount, total_members, frequency
- Output: MembershipRecord (private) to creator at position 0
- Side effects: CircleInfo written to public mapping, member_count set to 1
- Validation: total_members in [3, 12], contribution_amount > 0, frequency in [0, 2]

**Join Circle**
- Actor: Any user with a funded wallet and the circle_id
- Input: circle_id, position (must equal current member_count)
- Output: MembershipRecord (private) to joiner
- Side effects: member_count incremented. If member_count == total_members: status → 1 (active), round 0 initialized
- Validation: circle exists, status == 0 (pending), position == member_count, params match circle config

**Contribute**
- Actor: Any circle member (must hold MembershipRecord for this circle)
- Input: MembershipRecord (consumed and recreated)
- Output: MembershipRecord (private, recreated), ContributionReceipt (private)
- Side effects: contributions_received counter incremented (public)
- Validation: circle active, round not yet disbursed, contribution count < total_members
- Privacy guarantee: counter increments but does NOT record which address contributed

**Claim Pot**
- Actor: The member whose position == current_round
- Input: MembershipRecord, expected_round
- Output: MembershipRecord (recreated), PayoutRecord (private)
- Side effects: pot_disbursed = true, round advances (or circle completes)
- Validation: position == current_round, all contributions received, pot not yet disbursed

**Claim Credential**
- Actor: Any circle member after circle completion
- Input: MembershipRecord
- Output: MembershipRecord (recreated), CompletionCredential (private)
- Side effects: None on-chain (finalize only verifies circle is completed)
- Validation: circle status == 2 (completed)

#### 6.1.4 Value Transfer

**Hackathon scope (Wave 4):** Contributions are tracked without actual token movement. The Leo program validates amounts match the circle configuration but does not call credits.aleo or usdcx.aleo.

**Production scope:** Each contribution wraps a `credits.aleo::transfer_private` or `usdcx.aleo::transfer_private` call, escrowing funds in the program. Pot claims call the reverse transfer. This requires Aleo's program composition to be stable for cross-program calls.

### 6.2 Module 2: ZK Reputation (Wave 5)

**Purpose:** Privacy-preserving financial identity derived from completed circles.

#### 6.2.1 Reputation Data Model

Each CompletionCredential contains:
- circle_id (which circle was completed)
- total_rounds (how many rounds were in the circle)
- total_contributed (aggregate amount put in)
- total_received (aggregate amount received)

A user accumulates credentials across multiple circles. The Reputation module enables ZK proofs over aggregate credential data without revealing individual credentials.

#### 6.2.2 Proof Types

| Proof | What it reveals | What it hides |
|-------|----------------|---------------|
| Savings history | "I completed ≥ N circles" | Which circles, when, with whom |
| Volume proof | "I saved ≥ X total credits" | Exact amount, per-circle breakdown |
| Consistency proof | "I made ≥ M on-time contributions" | Which circles, contribution dates |
| Default proof | "I have 0 defaults across all circles" | Circle details |

#### 6.2.3 Implementation Approach

Aggregate proofs require iterating over multiple credentials. Two approaches:

**Approach A — On-chain aggregation:** A Leo transition that consumes N credentials and produces a single AggregateReputation record containing the summed stats. This is simple but limits the number of credentials per proof (Aleo circuit size constraints).

**Approach B — Off-chain proof generation:** Use the Aleo SDK's programmatic proof generation to create a proof over the credential set client-side, then verify the proof on-chain or present it to a third party. This scales better but requires more SDK work.

Wave 5 will implement Approach A with a practical limit of 10 credentials per aggregate.

### 6.3 Module 3: Micro-Lending (Wave 5+)

**Purpose:** Trust-score-gated undercollateralized loans from a shared lending pool.

#### 6.3.1 Lending Flow

1. Borrower generates an AggregateReputation record proving sufficient history
2. Borrower submits a loan request with the reputation proof and desired amount
3. Leo program verifies: reputation ≥ threshold AND amount ≤ max_loan_for_reputation
4. If approved, a private LoanRecord is created and funds are transferred from the lending pool
5. Repayment creates a RepaymentReceipt and returns funds to the pool
6. Default (missed repayment deadline) triggers a reputation penalty applied to the borrower's next credential aggregation

#### 6.3.2 Lending Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Min reputation | 3 completed circles | Sufficient history to demonstrate reliability |
| Max loan amount | 50% of total_contributed in reputation | Conservative LTV |
| Loan term | 1 circle period (matched to frequency) | Aligned with existing behavior |
| Interest rate | 0% (Wave 5) | Focus on mechanism, not pricing |
| Default penalty | -2 circle equivalents from reputation | Meaningful but recoverable |

#### 6.3.3 Privacy Model

- Borrower's identity → PRIVATE (loan record is a private record)
- Loan amount → PRIVATE
- Loan existence → PRIVATE (no public mapping tracks active loans)
- Lending pool total → PUBLIC (for solvency verification)
- Default count (aggregate) → PUBLIC (pool health metric)

### 6.4 Module 4: Private Governance (Wave 5+)

**Purpose:** Anonymous voting for circle-level decisions.

#### 6.4.1 Votable Actions

| Action | Threshold | Effect |
|--------|-----------|--------|
| Extend round deadline | 51% of members | Round deadline extended by 1 period |
| Remove non-contributing member | 67% of members | Member's position is skipped; pot reduces by 1 share |
| Modify contribution amount | 100% of members | New amount applies from next round |
| Dissolve circle | 67% of members | All escrowed funds returned pro-rata |

#### 6.4.2 Voting Mechanism

1. Any member creates a Proposal (public: circle_id, action type, parameters)
2. Each member casts a Vote record (private: voter identity hidden)
3. Finalize function increments a public vote counter per option
4. When voting period expires, the action with sufficient votes executes automatically
5. Individual votes are never revealed — only the tally is public

---

## 7. User Flows

### 7.1 Create and Run a Circle (Happy Path)

```
Amara (organizer):
  1. Connects Shield Wallet
  2. Navigates to "Create Circle"
  3. Sets: 10 members, 50 USDCx/round, biweekly
  4. Confirms transaction → receives MembershipRecord (position 0)
  5. Shares circle_id link with 9 friends

Members 1–9:
  6. Click invite link → frontend loads with circle_id
  7. Connect Shield Wallet
  8. Click "Join Circle" → receive MembershipRecord (positions 1–9)
  9. Member 9 joins → circle auto-activates, round 0 begins

Round 0:
  10. All 10 members receive "Round 0 — Contribute 50 USDCx" notification
  11. Each member clicks "Contribute" → MembershipRecord consumed + recreated, receipt issued
  12. Dashboard shows "7/10 contributed" → "8/10" → ... → "10/10"
  13. Amara (position 0) sees "Claim Pot" button
  14. Amara claims → receives 500 USDCx as private PayoutRecord
  15. Round advances to 1

Rounds 1–9:
  16. Same flow, different recipient each round
  17. After round 9 completes → circle status = completed

Post-completion:
  18. Each member claims CompletionCredential
  19. Credential is usable for reputation proofs in future circles and lending
```

### 7.2 Late Contribution (Degraded Path)

```
Round 3: 8 of 10 members have contributed. 3 days past the soft deadline.

Dashboard shows: "8/10 contributed — waiting for 2 more"
  - No indication of WHO hasn't contributed (privacy preserved)
  - Members 1–8 don't know if it's member 9 or member 3 who's late

After 7 days (hard deadline):
  Option A (governance vote): Members vote to extend deadline (51% threshold)
  Option B (governance vote): Members vote to remove non-contributors (67% threshold)
  Option C (no action): Circle continues waiting indefinitely

NOTE: On-chain, there is no enforcement of time-based deadlines in Wave 4.
The "deadline" is a social convention tracked by the backend, not enforced by the Leo program.
Enforcement transitions (auto-skip, auto-dissolve) are planned for production.
```

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target | Rationale |
|--------|--------|-----------|
| Transaction confirmation | < 30 seconds | Aleo block time is ~10-15s; with proof generation, 30s is realistic |
| Frontend load time | < 3 seconds (3G) | Target users may have slow connections |
| API response time (cached) | < 100ms | Standard for REST APIs |
| API response time (chain read) | < 2 seconds | Aleo RPC latency |
| Concurrent users | 1,000+ | Go backend handles this trivially |
| Circle state refresh | < 5 seconds | Polling interval for active circles |

### 8.2 Availability

| Component | Target | Strategy |
|-----------|--------|----------|
| Frontend | 99.5% | Vercel/Netlify with CDN |
| Backend API | 99.5% | Dockerized Go service, health checks, auto-restart |
| Database | 99.9% | Managed PostgreSQL (Supabase/RDS) |
| Aleo RPC | Depends on network | Multiple RPC endpoints with fallback |

### 8.3 Scalability

- Backend: Stateless Go service, horizontally scalable behind a load balancer
- Database: PostgreSQL with read replicas for high-read workloads
- Cache: Redis for hot data (active circle states, recent transactions)
- Chain indexer: Single-instance per deployment; shardable by circle_id range if needed

### 8.4 Compatibility

| Platform | Support Level |
|----------|------|
| Chrome 90+ (desktop) | Full |
| Firefox 90+ (desktop) | Full |
| Safari 15+ (desktop) | Full |
| Chrome mobile (Android) | Full (Shield Wallet mobile support dependent) |
| Safari mobile (iOS) | Partial (wallet extension limitations) |

---

## 9. Go-To-Market Strategy

### 9.1 Phase 1: Buildathon + Community Seed (Months 1–3)

- Deploy on Aleo Testnet, submit to AKINDO WaveHack Waves 4–5
- Recruit 5 alpha test circles from Halo Protocol waitlist
- Target: 50 users, 10 circles, full lifecycle completion on testnet
- Publish blog posts: "Why Savings Circles Need Privacy" and "Building Community Finance on Aleo"

### 9.2 Phase 2: Mainnet Launch + Diaspora Pilots (Months 3–6)

- Deploy to Aleo Mainnet with USDCx integration
- Partner with 3 diaspora community organizations (Nigerian, Indian, Mexican communities in US)
- Target: 500 users, 100 circles
- Introduce referral program: existing circle members invite new circles for bonus credentials

### 9.3 Phase 3: NGO/MFI Integration (Months 6–12)

- White-label frontend for microfinance institutions
- API layer for programmatic circle creation and management
- Compliance toolkit: selective disclosure reports for auditors
- Target: 2 MFI partnerships, 5,000 users, 1,000 circles

### 9.4 Phase 4: Protocol Expansion (Months 12–18)

- Reputation module live → undercollateralized lending
- Cross-chain bridges for stablecoin inflows from Ethereum/Solana
- Governance module for circle-level and protocol-level decisions
- Target: 50,000 users, protocol sustainability via fees

---

## 10. Competitive Analysis

| Protocol | Chain | Privacy | ROSCA | Lending | Reputation | Status |
|----------|-------|---------|-------|---------|------------|--------|
| **AGROPAY** | **Aleo** | **ZK-native (records)** | **Yes** | **Planned** | **Planned** | **Active** |
| Halo Protocol | Solana | None | Yes | No | No | Live beta |
| Aave/Compound | Ethereum | None | No | Yes (overcollateralized) | No | Live |
| Goldfinch | Ethereum | None | No | Yes (undercollateralized) | Off-chain | Live |
| Eclipse | Aleo | ZK-native | No | Yes | No | Prototype |
| Kosh Finance | Midnight | ZK (Midnight model) | Planned | Planned | Planned | Development |
| Shroud Protocol | ICP | ZK (ASC + Thetacrypt) | Yes | No | Planned | Hackathon |

**AGROPAY is the only privacy-preserving ROSCA on a production blockchain with mainnet deployment capability.**

Goldfinch is the closest analog in terms of mission (undercollateralized lending for underserved populations) but uses off-chain credit assessment and has no privacy. AGROPAY's privacy-native reputation system creates a fundamentally different trust model.

---

## 11. Metrics & KPIs

### 11.1 Product Metrics

| Metric | Definition | Wave 4 Target | Month 6 Target | Month 12 Target |
|--------|-----------|---------------|----------------|-----------------|
| Circles created | Total circles initiated | 5 | 100 | 1,000 |
| Active users | Unique wallets with activity in past 30 days | 15 | 500 | 5,000 |
| Circle completion rate | % of circles that complete all rounds | 60% | 75% | 85% |
| Retention (30-day) | % of users active after first month | 70% | 80% | 85% |
| Default rate | % of rounds where a member doesn't contribute | < 10% | < 8% | < 5% |
| Protocol TVL | Total value locked in active circles | $1K | $100K | $2M |

### 11.2 Technical Metrics

| Metric | Target |
|--------|--------|
| Transaction success rate | > 98% |
| Frontend error rate | < 1% |
| API uptime | > 99.5% |
| Mean time to recovery | < 30 minutes |
| Chain indexer lag | < 5 blocks |

---

## 12. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Aleo mainnet instability | Medium | Critical | Deploy to testnet first; maintain fallback to testnet; monitor network status |
| R2 | USDCx program API changes | Medium | High | Abstract stablecoin calls behind interface; support both USDCx and USAD |
| R3 | Shield Wallet adoption is low | Medium | High | Support Leo Wallet and Puzzle Wallet as alternatives |
| R4 | Leo language limitations block features | Low | High | Design around constraints; use hybrid public/private model |
| R5 | Low user adoption in target markets | Medium | High | Validated by Halo Protocol demand; start with diaspora not rural |
| R6 | Regulatory scrutiny on privacy features | Medium | Medium | Selective disclosure enables compliance; engage legal counsel early |
| R7 | Double-contribution exploit (Wave 4) | Medium | Medium | Mitigated by finalize counter; nullifier system in Wave 5 |
| R8 | Circle griefing (member joins but never contributes) | High | Medium | Governance module for member removal; reputation-gated circles |
| R9 | Gas costs too high for micro-transactions | Medium | High | Batch operations; subsidize gas for new users; monitor Aleo fee market |
| R10 | Competition from larger teams building similar product | Low | Medium | First-mover advantage; existing traction; multi-chain positioning |

---

## 13. Regulatory Considerations

### 13.1 Money Transmission

ROSCAs may be classified as money transmission in some jurisdictions. Key considerations:

- **US:** ROSCAs are generally exempt from money transmission regulation when operated within a closed group without fees. Once fees are introduced, state-by-state MSB analysis is required.
- **India:** Chit funds are regulated under the Chit Funds Act, 1982. Registered chit funds are legal; unregistered ones are not.
- **Nigeria:** Esusu and ajo are not specifically regulated but may fall under CBN guidelines for cooperative finance.

**AGROPAY's position:** The protocol is infrastructure, not an operator. Circle creation and management is peer-to-peer. AGROPAY does not custody funds (the Leo program does). Regulatory risk shifts from the protocol to the circle organizer.

### 13.2 Privacy and Compliance

Aleo's selective disclosure enables a compliance model where:

- Members can prove to a regulator that they participated in a circle and contributed X amount, without revealing which circle or with whom
- Circle organizers can generate aggregate reports (total flow, member count, completion rate) without revealing individual member identities
- AML/KYC requirements, if triggered, can be satisfied through ZK proofs of identity (e.g., zPass integration) without storing PII on-chain or in the backend

---

## 14. Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| **Wave 4 (Hackathon MVP)** | Mar 22–29, 2026 | Leo program on testnet, frontend with Shield Wallet, create/join/contribute/claim flows |
| **Wave 5 (Enhanced MVP)** | Apr 1–15, 2026 | Nullifier anti-sybil, USDCx integration, reputation credential aggregation, improved UX |
| **Testnet Beta** | Apr–May 2026 | Go backend, PostgreSQL, Redis, chain indexer, full API, notification system |
| **Mainnet Alpha** | Jun–Jul 2026 | Mainnet deployment, USDCx/USAD production integration, alpha test circles |
| **Mainnet Beta** | Aug–Sep 2026 | Lending module, governance module, NGO API, mobile-responsive redesign |
| **Production** | Oct 2026+ | Public launch, MFI partnerships, protocol fee activation, cross-chain bridges |

---

*AGROPAY Production PRD v2.0 — XXIX Labs*
*Save together. Stay private. Build reputation.*
