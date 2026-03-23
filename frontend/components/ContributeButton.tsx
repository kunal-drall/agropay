"use client";

import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import toast from "react-hot-toast";
import { PROGRAM_ID, TRANSITIONS, serializeRecord } from "@/lib/program";
import { TxStatus } from "@/components/TxStatus";

interface ContributeButtonProps {
  membershipRecord: unknown;
  onSuccess?: () => void;
}

const CONTRIBUTE_FEE = 3_000_000;

export function ContributeButton({
  membershipRecord,
  onSuccess,
}: ContributeButtonProps) {
  const { publicKey, requestTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  async function handleContribute() {
    if (!publicKey || !requestTransaction || !membershipRecord) return;

    setLoading(true);
    setTxId(null);

    try {
      const tx = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        PROGRAM_ID,
        TRANSITIONS.CONTRIBUTE,
        [serializeRecord(membershipRecord)],
        CONTRIBUTE_FEE,
        false
      );

      const id = await requestTransaction(tx);
      if (id) {
        setTxId(id);
        toast.success(`Contribution submitted — TX: ${id.slice(0, 10)}…`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Contribution failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <p className="text-sm text-earth-muted">
        Connect your wallet to contribute.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-4 text-sm"
        style={{
          background: "rgba(139,92,246,0.06)",
          border: "1px solid rgba(139,92,246,0.15)",
        }}
      >
        <p className="font-medium mb-0.5" style={{ color: "#a78bfa" }}>
          Your turn to contribute
        </p>
        <p className="text-earth-muted text-xs">
          Contribution is private — the amount and your identity stay hidden
          on-chain.
        </p>
      </div>

      <button
        onClick={handleContribute}
        disabled={loading || !membershipRecord}
        className="btn-leaf"
      >
        {loading ? "Submitting…" : "Contribute"}
      </button>

      {txId && <TxStatus txId={txId} onConfirmed={onSuccess} />}
    </div>
  );
}
