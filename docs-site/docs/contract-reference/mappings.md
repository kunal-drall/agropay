---
sidebar_position: 4
title: Mappings
---

# Mappings

Mappings are **public state** in Aleo. Anyone can read them via the Aleo RPC API. They are modified in `finalize` (the on-chain, synchronous part of async transitions).

---

## circles

Stores the core configuration and status of each circle.

```leo
mapping circles: field => CircleInfo;
```

### Reading via RPC

```bash
curl https://api.explorer.provable.com/v1/testnet/program/agropay_v1.aleo/mapping/circles/{circle_id}
```

### CircleInfo fields

| Field | Type | Values |
|-------|------|--------|
| `admin` | `address` | Circle creator's address |
| `contribution_amount` | `u64` | Per-member amount in microcredits |
| `total_members` | `u8` | 3–12 |
| `frequency` | `u8` | 0=weekly, 1=bi-weekly, 2=monthly |
| `status` | `u8` | 0=pending, 1=active, 2=completed |

### Example Response

```json
{
  "admin": "aleo1abc...xyz",
  "contribution_amount": "10000000u64",
  "total_members": "3u8",
  "frequency": "0u8",
  "status": "1u8"
}
```

---

## rounds

Tracks the current round and contribution count for each active circle.

```leo
mapping rounds: field => RoundState;
```

### Reading via RPC

```bash
curl https://api.explorer.provable.com/v1/testnet/program/agropay_v1.aleo/mapping/rounds/{circle_id}
```

### RoundState fields

| Field | Type | Description |
|-------|------|-------------|
| `current_round` | `u8` | 0-indexed round number (0 to total_members - 1) |
| `contributions_received` | `u8` | How many members contributed this round |

### Example Response

```json
{
  "current_round": "0u8",
  "contributions_received": "2u8"
}
```

---

## members

Tracks how many members have joined a circle.

```leo
mapping members: field => u8;
```

### Reading via RPC

```bash
curl https://api.explorer.provable.com/v1/testnet/program/agropay_v1.aleo/mapping/members/{circle_id}
```

Returns a `u8` value (0–12).

---

## Frontend Usage

The frontend reads these mappings directly without a backend:

```typescript
// lib/records.ts
const API = "https://api.explorer.provable.com/v1/testnet/program/agropay_v1.aleo/mapping";

export async function getCircleInfo(circleId: string): Promise<CircleInfo | null> {
  const res = await fetch(`${API}/circles/${circleId}`);
  if (!res.ok) return null;
  return parseCircleInfo(await res.json());
}

export async function getRoundState(circleId: string): Promise<RoundState | null> {
  const res = await fetch(`${API}/rounds/${circleId}`);
  if (!res.ok) return null;
  return parseRoundState(await res.json());
}

export async function getMemberCount(circleId: string): Promise<number | null> {
  const res = await fetch(`${API}/members/${circleId}`);
  if (!res.ok) return null;
  const val = await res.json();
  return parseInt(val.replace("u8", ""), 10);
}
```
