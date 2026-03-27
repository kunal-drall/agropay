---
sidebar_position: 1
title: Overview
---

# Contract Overview

## Program Info

| Property | Value |
|----------|-------|
| **Program ID** | `agropay_v1.aleo` |
| **Network** | Aleo Testnet |
| **Leo version** | 3.5.x |
| **Constructor** | `@noupgrade async constructor() {}` |
| **Explorer** | [testnet.aleoscan.io/program?id=agropay_v1.aleo](https://testnet.aleoscan.io/program?id=agropay_v1.aleo) |

---

## Constructor

```leo
@noupgrade
async constructor() {}
```

The `@noupgrade` annotation means this program cannot be upgraded after deployment. The Leo compiler auto-inserts `assert.eq edition 0u16` in the finalize body, permanently locking the program to its deployed bytecode.

This is the strongest upgrade-resistance guarantee available in Leo 3.5. Users can be certain the contract logic they audited is the contract running on-chain.

---

## Structs

### CircleInfo

Stored in the `circles` mapping. Public — readable by anyone.

```leo
struct CircleInfo {
    admin: address,               // Circle creator
    contribution_amount: u64,     // Per-member contribution (microcredits)
    total_members: u8,            // 3–12
    frequency: u8,                // 0=weekly, 1=bi-weekly, 2=monthly
    status: u8,                   // 0=pending, 1=active, 2=completed
}
```

### RoundState

Stored in the `rounds` mapping. Public.

```leo
struct RoundState {
    current_round: u8,            // 0-indexed round number
    contributions_received: u8,   // How many contributed this round
}
```

---

## Transitions at a Glance

| Transition | Input Records | Output Records | Effect |
|------------|--------------|----------------|--------|
| `create_circle` | — | `Membership` | Creates circle, admin gets position 0 |
| `join_circle` | — | `Membership` | Join pending circle at next position |
| `contribute` | `Membership` | `Membership`, `ContributionReceipt` | Increment counter |
| `claim_pot` | `Membership` | `Membership`, `Payout` | Claim pot, advance round |
| `claim_credential` | `Membership` | `Credential` | Issue completion proof |

---

## Constraints

| Parameter | Constraint |
|-----------|------------|
| `total_members` | 3 ≤ n ≤ 12 |
| `contribution_amount` | > 0 |
| `frequency` | 0, 1, or 2 |
| Circle status for `join_circle` | Must be `PENDING` (0) |
| Circle status for `contribute` | Must be `ACTIVE` (1) |
| Circle status for `claim_pot` | Must be `ACTIVE` (1) |
| Membership position to claim | Must equal `current_round` |
| Contributions before claim | Must equal `total_members` |
