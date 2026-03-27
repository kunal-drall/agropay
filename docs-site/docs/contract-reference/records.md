---
sidebar_position: 3
title: Records
---

# Records

Records are **private state** in Aleo. They are stored as encrypted ciphertexts on-chain and can only be decrypted by the record owner (using their view key). They are consumed and recreated on each use — there is no mutable record state.

---

## Membership

Issued on `create_circle` or `join_circle`. Consumed and reissued on `contribute`, `claim_pot`, and `claim_credential`.

```leo
record Membership {
    owner: address,               // The wallet that owns this record
    circle_id: field,             // Which circle this membership belongs to
    position: u8,                 // 0-indexed position in the rotation
    contribution_amount: u64,     // Per-round contribution (microcredits)
    total_members: u8,            // Total members in the circle
}
```

**Usage:** The `Membership` record is the caller's proof of membership. It must be held in the wallet and passed as input to `contribute`, `claim_pot`, and `claim_credential`. When consumed, a new `Membership` with identical fields is returned to the caller.

**Privacy:** Only the owner can read the `circle_id`, `position`, `contribution_amount`, and `total_members`. The existence of a `Membership` record in someone's wallet is not observable externally.

---

## ContributionReceipt

Issued on `contribute`. Proves the holder contributed in a round.

```leo
record ContributionReceipt {
    owner: address,
    circle_id: field,
    round: u8,                    // ⚠ Hardcoded to 0u8 in v1 (see note)
}
```

:::note v1 Limitation
`round` is hardcoded to `0u8` because async transitions cannot read mapping values. The actual round enforcement happens in `finalize`. Production fix: pass the round as a transition input and verify it matches `rounds[circle_id].current_round` in finalize.
:::

**Usage:** Not consumed by any transition in v1. Held as a receipt in the wallet.

---

## Payout

Issued on `claim_pot`. Proves the holder received the pot for a round.

```leo
record Payout {
    owner: address,
    circle_id: field,
    round: u8,
    amount: u64,                  // Total pot = contribution_amount * total_members
}
```

**Privacy:** The payout recipient is never revealed on-chain. Only the fact that a pot was claimed (via `contributions_received` reset and `current_round` increment) is observable.

---

## Credential

Issued on `claim_credential` after circle completion. Proves the holder completed a full savings circle.

```leo
record Credential {
    owner: address,
    circle_id: field,
    total_members: u8,
    contribution_amount: u64,
    rounds_completed: u8,         // = total_members (all rounds)
}
```

**Usage:** The credential is designed for selective disclosure. The holder can share their view key with a lender or institution to prove savings discipline without revealing which circles they were in or who their circle members were.

**Future use:** v2 reputation aggregation will allow summing `Credential.contribution_amount * rounds_completed` across multiple credentials to compute a verifiable savings score.
