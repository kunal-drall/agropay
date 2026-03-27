---
sidebar_position: 2
title: Transitions
---

# Transitions

## create_circle

Creates a new savings circle. The caller becomes the admin at position 0.

```leo
async transition create_circle(
    circle_id: field,
    contribution_amount: u64,
    total_members: u8,
    frequency: u8,
) -> (Membership, Future)
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `circle_id` | `field` | Unique ID generated client-side (random field element) |
| `contribution_amount` | `u64` | Per-member contribution in microcredits (1 ALEO = 1,000,000) |
| `total_members` | `u8` | Number of members — must be 3–12 |
| `frequency` | `u8` | 0 = weekly, 1 = bi-weekly, 2 = monthly |

**Assertions**

```leo
assert(total_members >= 3u8);
assert(total_members <= 12u8);
assert(contribution_amount > 0u64);
assert(frequency <= 2u8);
```

**On-Chain Effect (finalize)**

- Writes `circles[circle_id]` with status = PENDING (0)
- Writes `members[circle_id]` = 1
- Writes `rounds[circle_id]` with round = 0, contributions = 0

**Returns** `Membership` record to the caller at position 0.

**Privacy:** Admin identity is public (they called `create_circle`). All other member identities are private.

---

## join_circle

Join a pending circle at the next available position.

```leo
async transition join_circle(
    circle_id: field,
    position: u8,
    contribution_amount: u64,
    total_members: u8,
) -> (Membership, Future)
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `circle_id` | `field` | Circle to join |
| `position` | `u8` | Expected position (read from `members` mapping before calling) |
| `contribution_amount` | `u64` | Must match circle's configured amount |
| `total_members` | `u8` | Must match circle's configured member count |

**On-Chain Effect (finalize)**

- Increments `members[circle_id]`
- If member count reaches `total_members`: sets circle status to ACTIVE (1), sets `rounds[circle_id].current_round = 0`
- Verifies position matches current member count (prevents position hijacking)

**Returns** `Membership` record to the caller at the given position.

**Privacy:** WHO joined is private. Only the member count increment (N → N+1) is public.

:::caution Race Condition
If two users try to join simultaneously at the same position, one will fail. The finalize assertion `members[circle_id] == position` rejects the second transaction. The frontend should detect this and prompt the user to retry.
:::

---

## contribute

Contribute for the current round. Consumes the caller's `Membership` record and reissues it.

```leo
async transition contribute(
    membership: Membership,
) -> (Membership, ContributionReceipt, Future)
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `membership` | `Membership` | The caller's current membership record (consumed) |

**On-Chain Effect (finalize)**

- Verifies circle is ACTIVE
- Verifies `contributions_received < total_members`
- Increments `rounds[circle_id].contributions_received`

**Returns**
- New `Membership` record (same fields, updated after consumption)
- `ContributionReceipt` record as proof of contribution

**Privacy:** The contribution counter increments publicly (N → N+1). WHO incremented it is private — the record input is encrypted and the ZK proof validates it without revealing the caller's identity in the context of this specific contribution.

:::note v1 Limitation
`ContributionReceipt.round` is hardcoded to `0u8`. Leo async transitions cannot read mapping values (round number lives in the `rounds` mapping, not accessible in the transition). The actual current round is enforced in finalize. This is a known v1 limitation.
:::

---

## claim_pot

Claim the round's pot. Only the member whose position matches the current round can call this.

```leo
async transition claim_pot(
    membership: Membership,
    expected_round: u8,
) -> (Membership, Payout, Future)
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `membership` | `Membership` | The caller's membership record |
| `expected_round` | `u8` | The round number the caller expects to claim |

**On-Chain Effect (finalize)**

- Verifies circle is ACTIVE
- Verifies `contributions_received == total_members` (everyone contributed)
- Verifies `membership.position == current_round`
- Computes pot: `contribution_amount * total_members as u64`
- If last round: sets circle status to COMPLETED (2)
- Else: increments `current_round`, resets `contributions_received` to 0

**Returns**
- New `Membership` record
- `Payout` record with the pot amount (private — only recipient sees it)

**Privacy:** That a pot was claimed is public. The recipient is private.

---

## claim_credential

After circle completion, any member can claim a `Credential` as proof of their savings history.

```leo
async transition claim_credential(
    membership: Membership,
) -> (Credential, Future)
```

**On-Chain Effect (finalize)**

- Verifies circle status is COMPLETED (2)

**Returns** `Credential` record to the caller.

**Privacy:** Fully private — no on-chain trace of who claimed a credential. The `Credential` record is never published to any mapping.
