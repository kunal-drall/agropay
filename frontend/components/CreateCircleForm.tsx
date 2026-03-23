"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";
import toast from "react-hot-toast";
import {
  generateCircleId,
  creditsToMicrocreditsInput,
  TRANSITIONS,
} from "@/lib/program";
import { executeTransition } from "@/lib/aleo";
import { registerCircleMeta } from "@/lib/records";
import { TxStatus } from "@/components/TxStatus";

const CREATE_FEE = 3_000_000;

export function CreateCircleForm() {
  const router = useRouter();
  const { publicKey, requestTransaction } = useWallet();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [memberCount, setMemberCount] = useState("5");
  const [frequency, setFrequency] = useState("0");

  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [createdCircleId, setCreatedCircleId] = useState<string | null>(null);

  async function handleCreate() {
    if (!publicKey) throw new WalletNotConnectedError();
    if (!requestTransaction) {
      toast.error("Wallet does not support transactions.");
      return;
    }

    const creditsNum = parseFloat(amount);
    if (!amount || isNaN(creditsNum) || creditsNum <= 0) {
      toast.error("Enter a valid contribution amount greater than 0.");
      return;
    }
    if (!name.trim()) {
      toast.error("Give your circle a name.");
      return;
    }

    setLoading(true);
    setTxId(null);

    const circleId = generateCircleId();

    try {
      const txid = await executeTransition(
        publicKey,
        requestTransaction,
        TRANSITIONS.CREATE_CIRCLE,
        [
          circleId,
          creditsToMicrocreditsInput(creditsNum),
          `${memberCount}u8`,
          `${frequency}u8`,
        ],
        CREATE_FEE
      );

      if (!txid) {
        toast.error("Wallet did not return a transaction ID.");
        return;
      }

      setTxId(txid);
      setCreatedCircleId(circleId);
      toast.success(`Circle created — TX: ${txid.slice(0, 10)}…`);

      // Store the circle name in the backend so other members see it.
      // Best-effort — if the backend is down, the circle still exists on-chain.
      await registerCircleMeta(circleId, name.trim(), description.trim());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create circle.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  // ── Not connected ──────────────────────────────────────────────────────────

  if (!publicKey) {
    return (
      <div
        className="max-w-md mx-auto rounded-2xl p-12 text-center border"
        style={{
          background: "rgba(139,92,246,0.05)",
          borderColor: "rgba(139,92,246,0.2)",
          borderStyle: "dashed",
        }}
      >
        <p className="font-medium text-earth-text mb-2">
          Connect your wallet to create a circle.
        </p>
        <p className="text-sm text-earth-muted">
          Use Soter or Leo Wallet on the Aleo testnet.
        </p>
      </div>
    );
  }

  // ── Post-submission: show share link ──────────────────────────────────────

  if (txId && createdCircleId) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/circle/${createdCircleId}`
        : `/circle/${createdCircleId}`;

    return (
      <div className="max-w-md mx-auto space-y-4">
        <TxStatus
          txId={txId}
          onConfirmed={() => router.push(`/circle/${createdCircleId}`)}
        />

        <div className="card space-y-4">
          <div>
            <p className="font-medium text-earth-text mb-0.5">
              Share with your members
            </p>
            <p className="text-xs text-earth-muted">
              Anyone with this link can join while the circle is pending.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="input-field flex-1 font-mono text-xs"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copied!");
              }}
              className="shrink-0 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.25)",
                color: "#a78bfa",
              }}
            >
              Copy
            </button>
          </div>

          <p className="text-xs text-earth-muted">
            The circle activates when all {memberCount} seats are filled.
          </p>
        </div>

        <button
          onClick={() => router.push(`/circle/${createdCircleId}`)}
          className="btn-primary w-full"
        >
          Go to Circle
        </button>
      </div>
    );
  }

  // ── Create form ────────────────────────────────────────────────────────────

  const potPreview =
    amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0
      ? parseFloat(amount) * parseInt(memberCount)
      : null;

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-earth-text mb-2" htmlFor="name">
          Circle name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Amara's Esusu"
          maxLength={120}
          className="input-field"
        />
        <p className="text-xs text-earth-muted mt-1.5">
          Stored off-chain for display only — not visible on-chain.
        </p>
      </div>

      {/* Description */}
      <div>
        <label
          className="block text-sm font-medium text-earth-text mb-2"
          htmlFor="description"
        >
          Description{" "}
          <span className="font-normal text-earth-muted">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="10-person savings group, monthly contributions."
          rows={2}
          maxLength={400}
          className="input-field resize-none"
        />
      </div>

      {/* Contribution amount */}
      <div>
        <label className="block text-sm font-medium text-earth-text mb-2" htmlFor="amount">
          Contribution per round{" "}
          <span className="font-normal text-earth-muted">(credits)</span>
        </label>
        <input
          id="amount"
          type="number"
          min="0.000001"
          step="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10"
          className="input-field"
        />
        {potPreview !== null && (
          <div
            className="mt-2 px-3 py-2 rounded-lg text-sm flex items-center justify-between"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <span className="text-earth-muted">Pot size</span>
            <span className="font-mono font-medium" style={{ color: "#a78bfa" }}>
              {potPreview.toLocaleString()} credits
            </span>
          </div>
        )}
      </div>

      {/* Two-column: Members + Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-medium text-earth-text mb-2"
            htmlFor="members"
          >
            Members
          </label>
          <select
            id="members"
            value={memberCount}
            onChange={(e) => setMemberCount(e.target.value)}
            className="select-field"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <option key={n} value={n} style={{ background: "#13131f" }}>
                {n} members
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-medium text-earth-text mb-2"
            htmlFor="frequency"
          >
            Frequency
          </label>
          <select
            id="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="select-field"
          >
            <option value="0" style={{ background: "#13131f" }}>Weekly</option>
            <option value="1" style={{ background: "#13131f" }}>Biweekly</option>
            <option value="2" style={{ background: "#13131f" }}>Monthly</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-earth-muted">
        Frequency is recorded on-chain as metadata. Deadlines are a social
        convention — not enforced by the contract.
      </p>

      {/* Divider */}
      <div
        className="h-px"
        style={{ background: "rgba(255,255,255,0.07)" }}
      />

      <button
        onClick={handleCreate}
        disabled={loading || !amount || !name.trim()}
        className="btn-leaf w-full"
      >
        {loading ? "Creating…" : "Create Circle"}
      </button>
    </div>
  );
}
