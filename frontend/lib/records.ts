import { getMappingValue } from "@/lib/aleo";

// BACKEND_URL is optional — the app works without it (circle names fall back to ID).
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

// ── On-chain data types ──────────────────────────────────────────────────────

export interface CircleOnChain {
  admin: string;
  contribution_amount: number; // microcredits
  total_members: number;
  frequency: number; // 0=weekly, 1=biweekly, 2=monthly
  status: number; // 0=pending, 1=active, 2=completed
  created_at: number; // block height
}

export interface RoundOnChain {
  current_round: number;
  contributions_received: number;
  pot_disbursed: boolean;
  round_start: number; // block height
}

// ── Chain reads ───────────────────────────────────────────────────────────────

export async function getCircleInfo(
  circleId: string
): Promise<CircleOnChain | null> {
  const raw = await getMappingValue("circles", circleId);
  if (!raw) return null;
  return parseCircleInfo(raw);
}

export async function getRoundState(
  circleId: string
): Promise<RoundOnChain | null> {
  const raw = await getMappingValue("rounds", circleId);
  if (!raw) return null;
  return parseRoundState(raw);
}

export async function getMemberCount(circleId: string): Promise<number | null> {
  const raw = await getMappingValue("members", circleId);
  if (!raw) return null;
  // Value comes back as "5u8" or just 5
  return parseInt(raw.toString().replace(/u8/g, "").trim(), 10) || null;
}

// ── Backend API (circle names) ────────────────────────────────────────────────

export interface CircleMeta {
  circle_id: string;
  name: string;
  description: string;
  created_at: string;
}

export async function getCircleMeta(
  circleId: string
): Promise<CircleMeta | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/circles/${circleId}/meta`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as CircleMeta;
  } catch {
    return null;
  }
}

export async function registerCircleMeta(
  circleId: string,
  name: string,
  description: string
): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/v1/circles/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circle_id: circleId, name, description }),
    });
  } catch {
    // Backend is optional — circle names degrade gracefully to abbreviated IDs.
  }
}

// ── Aleo struct string parsers ────────────────────────────────────────────────
//
// The Aleo testnet API returns mapping values as Aleo value strings, e.g.:
// "{ admin: aleo1..., contribution_amount: 10000000u64, total_members: 3u8, ... }"
// These are NOT JSON — parse manually with regex.

function extractField(raw: string, fieldName: string): string {
  const match = raw.match(
    new RegExp(`\\b${fieldName}:\\s*([^,}\\n]+)`)
  );
  return match ? match[1].trim() : "";
}

function parseUint(value: string): number {
  return parseInt(value.replace(/u\d+/g, "").trim(), 10) || 0;
}

function parseBool(value: string): boolean {
  return value.trim() === "true";
}

function parseCircleInfo(raw: string): CircleOnChain | null {
  try {
    return {
      admin: extractField(raw, "admin"),
      contribution_amount: parseUint(extractField(raw, "contribution_amount")),
      total_members: parseUint(extractField(raw, "total_members")),
      frequency: parseUint(extractField(raw, "frequency")),
      status: parseUint(extractField(raw, "status")),
      created_at: parseUint(extractField(raw, "created_at")),
    };
  } catch {
    return null;
  }
}

function parseRoundState(raw: string): RoundOnChain | null {
  try {
    return {
      current_round: parseUint(extractField(raw, "current_round")),
      contributions_received: parseUint(
        extractField(raw, "contributions_received")
      ),
      pot_disbursed: parseBool(extractField(raw, "pot_disbursed")),
      round_start: parseUint(extractField(raw, "round_start")),
    };
  } catch {
    return null;
  }
}
