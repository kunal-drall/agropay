"use client";

import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import toast from "react-hot-toast";
import { PROGRAM_ID, TRANSITIONS, serializeRecord, formatCredits } from "@/lib/program";
import { TxStatus } from "@/components/TxStatus";

interface ClaimPotButtonProps {
  membershipRecord: unknown;
  expectedRound: number;
  potAmount: number; // microcredits — shown to the user before they confirm
  onSuccess?: () => void;
}

const CLAIM_POT_FEE = 3_000_000;

export function ClaimPotButton({
  membershipRecord,
  expectedRound,
  potAmount,
  onSuccess,
}: ClaimPotButtonProps) {
  const { publicKey, requestTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  async function handleClaim() {
    if (!publicKey || !requestTransaction || !membershipRecord) return;

    setLoading(true);
    setTxId(null);

    try {
      const tx = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        PROGRAM_ID,
        TRANSITIONS.CLAIM_POT,
        [serializeRecord(membershipRecord), `${expectedRound}u8`],
        CLAIM_POT_FEE,
        false
      );

      const id = await requestTransaction(tx);
      if (id) {
        setTxId(id);
        toast.success(`Pot claimed — TX: ${id.slice(0, 10)}…`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Claim failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <p className="text-sm text-earth-muted">Connect your wallet to claim.</p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payout preview */}
      <div
        className="rounded-xl p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.06) 100%)",
          border: "1px solid rgba(139,92,246,0.25)",
        }}
      >
        <p className="text-xs font-medium text-earth-muted mb-1 uppercase tracking-wider">
          Your payout this round
        </p>
        <p
          className="font-serif text-3xl font-medium mb-1"
          style={{
            background: "linear-gradient(135deg, #f1f5f9, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {formatCredits(potAmount)}
        </p>
        <p className="text-xs text-earth-muted">
          Paid directly to your wallet as a private record — only you can see
          it.
        </p>
      </div>

      <button onClick={handleClaim} disabled={loading} className="btn-leaf">
        {loading ? "Claiming…" : "Claim Pot"}
      </button>

      {txId && <TxStatus txId={txId} onConfirmed={onSuccess} />}
    </div>
  );
}
