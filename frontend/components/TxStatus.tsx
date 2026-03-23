"use client";

import { useEffect, useRef, useState } from "react";
import { getTransactionStatus } from "@/lib/aleo";

type Status = "pending" | "confirmed" | "timeout" | "failed";

interface TxStatusProps {
  txId: string;
  onConfirmed?: () => void;
}

const EXPLORER_BASE = "https://testnet.aleoscan.io/transaction";
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;

export function TxStatus({ txId, onConfirmed }: TxStatusProps) {
  const [status, setStatus] = useState<Status>("pending");
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    attemptsRef.current = 0;
    setStatus("pending");

    const poll = async () => {
      const result = await getTransactionStatus(txId);

      if (result === "confirmed") {
        setStatus("confirmed");
        onConfirmed?.();
        return;
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setStatus("timeout");
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [txId, onConfirmed]);

  const explorerUrl = `${EXPLORER_BASE}?id=${txId}`;

  if (status === "pending") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
        style={{
          background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <span
          className="inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin shrink-0"
          style={{ borderColor: "rgba(139,92,246,0.5)", borderTopColor: "#8b5cf6" }}
        />
        <span className="text-earth-muted">
          Confirming on testnet&hellip;{" "}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-earth-text transition-colors"
            style={{ color: "#a78bfa" }}
          >
            View TX
          </a>
        </span>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
        style={{
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        <span
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#10b981" }}
        >
          <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
            <path
              d="M1 3.5L3 5.5L7 1.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span style={{ color: "#10b981" }} className="font-medium">
          Confirmed
        </span>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-earth-text transition-colors text-earth-muted font-normal"
        >
          View TX
        </a>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-earth-muted"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Still confirming — check{" "}
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-earth-text transition-colors"
          style={{ color: "#a78bfa" }}
        >
          the explorer
        </a>{" "}
        for final status.
      </div>
    );
  }

  return null;
}
