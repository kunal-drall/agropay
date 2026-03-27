---
sidebar_position: 6
title: Security
---

# Security

## Trust Model

| Component | Trust Level | Notes |
|-----------|-------------|-------|
| Aleo Network (AleoBFT) | High | BFT consensus; audited by Trail of Bits, NCC Group, zkSecurity |
| `agropay_v1.aleo` | High (after audit) | Deterministic execution; open source; `@noupgrade` constructor |
| Leo / Soter Wallet | Medium | Third-party; open source; ecosystem-endorsed |
| Go Backend | Low | Convenience layer; never touches funds. Compromise = degraded UX only |

---

## Threat Model

### T1: Double Contribution

**Severity:** High | **Likelihood in v1:** Medium

A member calls `contribute` twice before others contribute, incrementing the counter to `total_members` and locking out legitimate contributors.

**v1 Mitigation:** `assert(contributions_received < total_members)` in finalize bounds the damage. A member can over-contribute but cannot cause the circle to think it's full with false data (they'd need their own membership record to do it twice, and the record is consumed each time — a second TX would fail as the first record is already spent on-chain).

**Production Mitigation (v2):**
```leo
// In contribute finalize:
let nullifier: field = BHP256::hash_to_field(membership.owner_commitment || circle_id || current_round);
assert(!Mapping::contains(nullifiers, nullifier));
Mapping::set(nullifiers, nullifier, true);
```

---

### T2: Position Hijacking

**Severity:** High | **Likelihood:** Low

An attacker tries to join at a position that isn't theirs.

**Mitigation:** `join_circle` finalize asserts `members[circle_id] == position`. If two users race to the same position, the second transaction fails. The member count is the authoritative position counter — it cannot be manipulated.

---

### T3: Premature Pot Claim

**Severity:** High | **Likelihood:** Low

A member tries to claim the pot before everyone has contributed.

**Mitigation:** `claim_pot` finalize asserts `contributions_received == total_members`. No exceptions.

---

### T4: Wrong-Round Claim

**Severity:** High | **Likelihood:** Low

A member tries to claim the pot in a round that isn't theirs.

**Mitigation:** `claim_pot` finalize asserts `membership.position == current_round`. Position is set at join time and cannot be changed.

---

### T5: Circle Stall (Member Doesn't Contribute)

**Severity:** Medium | **Likelihood:** Medium

A member stops contributing, preventing the circle from advancing. There is no on-chain mechanism to remove a member in v1.

**v1 Mitigation:** Social pressure via the public "X of N contributed" counter. The circle effectively stalls.

**Production Mitigation (v2):** 67% governance vote to eject a non-contributing member and redistribute their position.

---

### T6: Frontend Compromise

**Severity:** Medium | **Likelihood:** Low

If the frontend CDN serves malicious code, users could be tricked into signing bad transactions.

**Mitigations:**
- All financial logic is enforced on-chain in the Leo program — the frontend cannot override invariants
- Wallet extension shows the user the exact program ID, function name, and inputs before signing
- Pinned Vercel deployments with immutable URLs

---

## What the Contract CANNOT Do

Because `agropay_v1.aleo` uses `@noupgrade`:

- **Cannot be upgraded** after deployment — the bytecode is frozen
- **Cannot be paused** by any admin (no admin key in v1)
- **Cannot steal funds** — the Leo program only issues records; it doesn't custody any ALEO itself

:::note v1 Credit Movement
In v1, contributions are tracked without actual ALEO credit movement (i.e., the `contribute` transition does not call `credits.aleo`). The contract is a valid ROSCA coordination mechanism but does not yet move real money. Production integration with `credits.aleo` is documented in the [Roadmap](/docs/roadmap).
:::

---

## v2 Contract (Emergency Pause)

`agropay_v2.aleo` uses a `@custom` constructor with an admin key and emergency pause:

```leo
@custom
async constructor() {
    Mapping::set(admins, ADMIN_ADDRESS, true);
    Mapping::set(paused, 0field, false);
}
```

This trades upgrade-resistance for operational control — appropriate for an actively-developed protocol where the team needs to respond to exploits quickly. The v2 upgrade policy is explicitly documented and the admin address is published.
