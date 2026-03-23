"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import toast from "react-hot-toast";
import {
  PROGRAM_ID,
  isMembershipRecord,
  extractFieldString,
  abbreviateCircleId,
} from "@/lib/program";
import {
  getCircleInfo,
  getRoundState,
  getMemberCount,
  getCircleMeta,
  type CircleOnChain,
  type RoundOnChain,
  type CircleMeta,
} from "@/lib/records";
import { CircleCard, CircleCardSkeleton } from "@/components/CircleCard";
import { useAppStore } from "@/lib/store";
import type { RawRecord } from "@/lib/store";

interface CircleEntry {
  circleId: string;
  record: RawRecord;
  circleInfo: CircleOnChain | null;
  roundInfo: RoundOnChain | null;
  memberCount: number | null;
  meta: CircleMeta | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { publicKey, requestRecords, connected } = useWallet();
  const {
    membershipRecords,
    recordsLoading,
    recordsError,
    setMembershipRecords,
    setRecordsLoading,
    setRecordsError,
    clearRecords,
  } = useAppStore();

  const [circles, setCircles] = useState<CircleEntry[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey || !requestRecords) {
      clearRecords();
      setCircles([]);
      return;
    }

    async function fetchRecords() {
      if (!requestRecords) return;
      setRecordsLoading(true);
      setRecordsError(null);
      try {
        const all = await requestRecords(PROGRAM_ID);
        const memberships = (all ?? []).filter(
          isMembershipRecord
        ) as RawRecord[];
        setMembershipRecords(memberships);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load records from wallet.";
        setRecordsError(message);
        toast.error(message);
      } finally {
        setRecordsLoading(false);
      }
    }

    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, connected]);

  useEffect(() => {
    if (membershipRecords.length === 0) {
      setCircles([]);
      return;
    }

    async function loadCircleData() {
      setCirclesLoading(true);
      const entries = await Promise.all(
        membershipRecords.map(async (record) => {
          const rawId = record.data?.circle_id;
          const circleId = extractFieldString(rawId);
          if (!circleId) return null;

          const [circleInfo, roundInfo, memberCount, meta] = await Promise.all([
            getCircleInfo(circleId),
            getRoundState(circleId),
            getMemberCount(circleId),
            getCircleMeta(circleId),
          ]);

          return {
            circleId,
            record,
            circleInfo,
            roundInfo,
            memberCount,
            meta,
          } satisfies CircleEntry;
        })
      );

      setCircles(entries.filter((e): e is CircleEntry => e !== null));
      setCirclesLoading(false);
    }

    loadCircleData();
  }, [membershipRecords]);

  // ── Not connected — hero landing ──────────────────────────────────────────

  if (!connected) {
    return (
      <div className="relative hero-grid overflow-hidden">
        {/* Ambient violet glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.15) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-content mx-auto px-6 py-32 text-center">
          {/* Protocol chip */}
          <div className="flex justify-center mb-10">
            <span className="protocol-badge">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"
                style={{ boxShadow: "0 0 6px #10b981" }}
              />
              Aleo Testnet
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-6xl sm:text-7xl leading-tight mb-6 gradient-text">
            Save together.
            <br />
            Stay private.
          </h1>

          <p
            className="text-lg leading-relaxed mb-12 max-w-lg mx-auto"
            style={{ color: "#94a3b8" }}
          >
            AGROPAY brings savings circles on-chain with zero-knowledge privacy.
            Nobody knows who contributed or who received the pot — only that the
            circle is healthy.
          </p>

          <p className="text-sm mb-16" style={{ color: "#475569" }}>
            Connect Soter or Leo Wallet on Aleo testnet to get started.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              {
                accent: "#8b5cf6",
                label: "ZK Private",
                desc: "Contributions are hidden by zero-knowledge proofs — only you see what you do",
              },
              {
                accent: "#10b981",
                label: "On-chain rules",
                desc: "Every rotation is enforced by a Leo smart contract on Aleo — no trust required",
              },
              {
                accent: "#f59e0b",
                label: "Build reputation",
                desc: "Claim a private CompletionCredential when your circle finishes",
              },
            ].map(({ accent, label, desc }) => (
              <div
                key={label}
                className="rounded-xl p-5 text-left"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-8 h-0.5 rounded-full mb-4"
                  style={{ background: accent }}
                />
                <p className="font-medium text-sm text-earth-text mb-1.5">
                  {label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (recordsLoading || circlesLoading) {
    return (
      <div className="max-w-content mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-earth-text">My Circles</h1>
            <p className="text-sm text-earth-muted mt-0.5">
              Fetching your records from the wallet…
            </p>
          </div>
          <div className="skeleton h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <CircleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (recordsError) {
    return (
      <div className="max-w-content mx-auto px-6 py-12">
        <div
          className="max-w-md mx-auto rounded-xl p-8 text-center space-y-4 border"
          style={{
            background: "rgba(248,113,113,0.06)",
            borderColor: "rgba(248,113,113,0.2)",
          }}
        >
          <div className="w-10 h-10 rounded-full bg-rust-light flex items-center justify-center mx-auto">
            <span className="text-rust font-bold text-lg">!</span>
          </div>
          <p className="font-medium text-earth-text">Could not load your records</p>
          <p className="text-sm text-earth-muted">{recordsError}</p>
          <button
            onClick={() => {
              clearRecords();
              window.location.reload();
            }}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-earth-text">My Circles</h1>
          <p className="text-sm text-earth-muted mt-0.5">
            {circles.length} active{" "}
            {circles.length === 1 ? "circle" : "circles"}
          </p>
        </div>
        <button
          onClick={() => router.push("/create")}
          className="btn-leaf"
        >
          + New Circle
        </button>
      </div>

      {/* Empty state */}
      {circles.length === 0 ? (
        <div
          className="max-w-sm mx-auto rounded-2xl p-12 text-center border"
          style={{
            background: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.07)",
            borderStyle: "dashed",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center text-2xl"
            style={{ background: "rgba(139,92,246,0.12)" }}
          >
            ◎
          </div>
          <p className="font-medium text-earth-text mb-2">No circles yet</p>
          <p className="text-sm text-earth-muted mb-6">
            Create a circle or ask a friend to share their invite link.
          </p>
          <button
            onClick={() => router.push("/create")}
            className="btn-leaf"
          >
            Create your first circle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {circles.map(({ circleId, circleInfo, roundInfo, memberCount, meta }) =>
            circleInfo ? (
              <CircleCard
                key={circleId}
                circleId={circleId}
                name={meta?.name}
                circleInfo={circleInfo}
                memberCount={memberCount ?? undefined}
                contributionsReceived={roundInfo?.contributions_received}
                onClick={() => router.push(`/circle/${circleId}`)}
              />
            ) : (
              <div
                key={circleId}
                className="rounded-card p-6 border"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.07)",
                }}
              >
                <p className="font-mono text-xs text-earth-muted mb-1">
                  {abbreviateCircleId(circleId)}
                </p>
                <div className="flex items-center gap-2 text-sm text-earth-muted">
                  <span className="inline-block w-3 h-3 border-2 border-earth-muted border-t-transparent rounded-full animate-spin" />
                  Waiting for confirmation…
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
