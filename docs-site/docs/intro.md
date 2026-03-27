---
id: intro
sidebar_position: 1
title: Introduction
---

# AGROPAY

**Privacy-preserving savings circles (ROSCAs) on the Aleo blockchain.**

AGROPAY digitizes **ROSCAs** (Rotating Savings and Credit Associations) — informal savings circles known as *esusu*, *tanda*, *susu*, *stokvel*, *chit fund*, and *committee* across 100+ countries — with zero-knowledge cryptography that keeps individual activity private while keeping collective state publicly verifiable.

---

## How a ROSCA works

N members each contribute a fixed amount every round. One member receives the full pot each round. After N rounds, every member has contributed N×A and received N×A exactly once. It's a trust-based credit system that predates banking.

**The problem with on-chain ROSCAs:** Transparent blockchains (Ethereum, Solana) solve the fraud problem but worsen the social dynamics problem — every contribution, payout, and participant identity is permanently public. This breaks the social trust that makes ROSCAs work.

**AGROPAY's solution:** Aleo's record model keeps individual activity cryptographically private. Only the circle's aggregate health (how many contributed, whether the pot was claimed) is public. WHO did what is known only to the person who did it.

---

## Privacy Model

| Information | Visibility |
|-------------|-----------|
| Circle exists with its parameters | **Public** |
| N of M members contributed | **Public** |
| Pot was claimed in round R | **Public** |
| WHO contributed | **Private** — record owner only |
| WHO received the pot | **Private** — record owner only |
| Member identities | **Private** |
| Your savings history | **Private** — shareable via view key |

---

## Core Components

| Layer | What it is |
|-------|-----------|
| **Leo Contract** | `agropay_v1.aleo` — 5 transitions enforcing all ROSCA rules on-chain |
| **Frontend** | Next.js 14 dapp — wallet integration, real chain state, no mock data |
| **Go Backend** | Minimal API — stores off-chain circle names (Leo has no string type) |

---

## Quick Links

- **App** → [agropay-frontend.vercel.app](https://agropay-frontend.vercel.app)
- **Contract on Testnet** → [testnet.aleoscan.io/program?id=agropay_v1.aleo](https://testnet.aleoscan.io/program?id=agropay_v1.aleo)
- **GitHub** → [github.com/kunal-drall/agropay](https://github.com/kunal-drall/agropay)

---

## Built by XXIX Labs

XXIX Labs previously built [Halo Protocol](https://kosh.finance) on Solana — 50+ active users, 94% retention, 0% defaults, 510+ person waitlist. The top user request was privacy for contributions and payouts. That feedback is the direct origin of AGROPAY.

**Contact:** kd@kosh.finance | hello@29projectslab.com
