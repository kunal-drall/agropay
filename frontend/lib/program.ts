export const PROGRAM_ID = "agropay_v1.aleo";

export const TRANSITIONS = {
  CREATE_CIRCLE: "create_circle",
  JOIN_CIRCLE: "join_circle",
  CONTRIBUTE: "contribute",
  CLAIM_POT: "claim_pot",
  CLAIM_CREDENTIAL: "claim_credential",
} as const;

export const FREQUENCY_LABELS: Record<number, string> = {
  0: "Weekly",
  1: "Biweekly",
  2: "Monthly",
};

export const CIRCLE_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Active",
  2: "Completed",
};

// Generate a random field element for circle_id.
// Number.MAX_SAFE_INTEGER (~9e15) is well within the BLS12-377 field modulus (~2^253),
// so this is safe without any modular reduction.
export function generateCircleId(): string {
  const n = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  return `${n}field`;
}

// Convert human-readable credits to the microcredits u64 string Leo expects.
// Example: 10.5 → "10500000u64"
export function creditsToMicrocreditsInput(credits: number): string {
  const microcredits = Math.floor(credits * 1_000_000);
  return `${microcredits}u64`;
}

// Convert microcredits (on-chain integer) back to a human-readable credit amount.
export function microcreditsToCredits(microcredits: number): number {
  return microcredits / 1_000_000;
}

// Format credits for display: "10 credits" or "10.5 credits"
export function formatCredits(microcredits: number): string {
  const c = microcreditsToCredits(microcredits);
  return `${c % 1 === 0 ? c.toFixed(0) : c.toFixed(2)} credits`;
}

// Abbreviate a circle field ID for display: "1234...5678field"
export function abbreviateCircleId(circleId: string): string {
  const digits = circleId.replace("field", "");
  if (digits.length <= 12) return circleId;
  return `${digits.slice(0, 6)}...${digits.slice(-4)}field`;
}

// Serialize a record object for use as a transaction input.
// The Leo Wallet adapter expects the decrypted record as a JSON-encoded string.
export function serializeRecord(record: unknown): string {
  if (typeof record === "string") return record;
  return JSON.stringify(record);
}

// Check whether a raw record from requestRecords is a Membership record
// by verifying the presence of the `position` field (unique to Membership).
export function isMembershipRecord(record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  const data = r.data as Record<string, unknown> | undefined;
  if (!data) return false;
  return "position" in data && "total_members" in data && "circle_id" in data;
}

// Extract a numeric value from an Aleo-typed record field.
// Record fields come as either a plain string ("3u8"), a typed object ({ value: "3u8" }),
// or just a number, depending on the wallet adapter version.
export function extractFieldNumber(field: unknown): number {
  if (field === null || field === undefined) return 0;
  if (typeof field === "number") return field;
  const str =
    typeof field === "string"
      ? field
      : typeof (field as Record<string, unknown>).value === "string"
        ? String((field as Record<string, unknown>).value)
        : String(field);
  return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0;
}

// Extract a string value from an Aleo-typed record field (for addresses and fields).
export function extractFieldString(field: unknown): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  const obj = field as Record<string, unknown>;
  return typeof obj.value === "string" ? obj.value : String(field);
}
