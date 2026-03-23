"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import toast from "react-hot-toast";
import {
  PROGRAM_ID,
  TRANSITIONS,
  CIRCLE_STATUS_LABELS,
  FREQUENCY_LABELS,
  isMembershipRecord,
  extractFieldString,
  extractFieldNumber,
  formatCredits,
  serializeRecord,
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
import { CircleProgress } from "@/components/CircleProgress";
import { ContributeButton } from "@/components/ContributeButton";
import { ClaimPotButton } from "@/components/ClaimPotButton";
import { TxStatus } from "@/components/TxStatus";
import { useAppStore } from "@/lib/store";
import type { RawRecord } from "@/lib/store";

const JOIN_FEE = 3_000_000;
const CLAIM_CREDENTIAL_FEE = 2_000_000;

const STATUS_CONFIG: Record<
  number,
  { label: string; bg: string; color: string }
> = {
  0: {
    label: "Pending",
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
  },
  1: {
    label: "Active",
    bg: "rgba(16,185,129,0.1)",
    color: "#10b981",
  },
  2: {
    label: "Completed",
    bg: "rgba(255,255,255,0.06)",
    color: "#64748b",
  },
};

export default function CircleDetailPage() {
  const params = useParams<{ id: string }>();
  const circleId = params.id;
  const router = useRouter();

  const { publicKey, requestTransaction, requestRecords, connected } =
    useWallet();
  const { membershipRecords, setMembershipRecords } = useAppStore();

  const [circleInfo, setCircleInfo] = useState<CircleOnChain | null>(null);
  const [roundInfo, setRoundInfo] = useState<RoundOnChain | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [meta, setMeta] = useState<CircleMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [myMembership, setMyMembership] = useState<RawRecord | null>(null);

  const [joining, setJoining] = useState(false);
  const [joinTxId, setJoinTxId] = useState<string | null>(null);

  const [claimingCredential, setClaimingCredential] = useState(false);
  const [credentialTxId, setCredentialTxId] = useState<string | null>(null);

  const loadChainState = useCallback(async () => {
    const [info, round, count, circleMeta] = await Promise.all([
      getCircleInfo(circleId),
      getRoundState(circleId),
      getMemberCount(circleId),
      getCircleMeta(circleId),
    ]);

    if (!info) {
      setNotFound(true);
    } else {
      setCircleInfo(info);
      setRoundInfo(round);
      setMemberCount(count);
      setMeta(circleMeta);
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    loadChainState();
  }, [loadChainState]);

  useEffect(() => {
    if (!publicKey || !requestRecords) {
      setMyMembership(null);
      return;
    }

    async function findMembership() {
      let records = membershipRecords;

      if (records.length === 0) {
        try {
          const all = await requestRecords!(PROGRAM_ID);
          records = (all ?? []).filter(isMembershipRecord) as RawRecord[];
          setMembershipRecords(records);
        } catch {
          return;
        }
      }

      const mine = records.find((r) => {
        const id = extractFieldString(r.data?.circle_id);
        return id.replace("field", "") === circleId.replace("field", "");
      });

      setMyMembership(mine ?? null);
    }

    findMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, connected, membershipRecords.length]);

  async function handleJoin() {
    if (!publicKey || !requestTransaction || !circleInfo) return;

    const currentCount = await getMemberCount(circleId);
    if (currentCount === null) {
      toast.error("Could not read circle state from chain. Please retry.");
      return;
    }

    setJoining(true);
    try {
      const tx = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        PROGRAM_ID,
        TRANSITIONS.JOIN_CIRCLE,
        [
          circleId,
          `${currentCount}u8`,
          `${circleInfo.contribution_amount}u64`,
          `${circleInfo.total_members}u8`,
        ],
        JOIN_FEE,
        false
      );

      const txId = await requestTransaction(tx);
      if (txId) {
        setJoinTxId(txId);
        toast.success(`Join submitted — TX: ${txId.slice(0, 10)}…`);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes("position") || raw.includes("assertion")) {
        toast.error(
          "Someone joined at the same moment — please refresh and retry."
        );
      } else {
        toast.error(raw || "Join failed.");
      }
    } finally {
      setJoining(false);
    }
  }

  async function handleClaimCredential() {
    if (!publicKey || !requestTransaction || !myMembership) return;

    setClaimingCredential(true);
    try {
      const tx = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        PROGRAM_ID,
        TRANSITIONS.CLAIM_CREDENTIAL,
        [serializeRecord(myMembership)],
        CLAIM_CREDENTIAL_FEE,
        false
      );

      const txId = await requestTransaction(tx);
      if (txId) {
        setCredentialTxId(txId);
        toast.success("Credential claimed — it's now in your wallet.");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Credential claim failed."
      );
    } finally {
      setClaimingCredential(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-content mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="skeleton h-10 w-56 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
          <div className="skeleton h-40 rounded-xl" />
          <div className="skeleton h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="max-w-content mx-auto px-6 py-32 text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
          style={{ background: "rgba(248,113,113,0.1)" }}
        >
          <span className="text-rust font-mono text-2xl">?</span>
        </div>
        <h1 className="text-2xl font-semibold text-earth-text mb-3">
          Circle not found
        </h1>
        <p className="text-earth-muted mb-2">
          This circle ID does not exist on testnet yet.
        </p>
        <p className="text-sm text-earth-muted mb-8">
          If you just created it, wait for the transaction to confirm and
          refresh.
        </p>
        <button onClick={() => router.push("/")} className="btn-primary">
          Back to dashboard
        </button>
      </div>
    );
  }

  if (!circleInfo) return null;

  const isMember = myMembership !== null;
  const myPosition = isMember
    ? extractFieldNumber(myMembership!.data?.position)
    : null;
  const potAmount = circleInfo.contribution_amount * circleInfo.total_members;

  const isMyTurnToClaim =
    circleInfo.status === 1 &&
    roundInfo !== null &&
    isMember &&
    myPosition === roundInfo.current_round &&
    roundInfo.contributions_received === circleInfo.total_members;

  const statusConf = STATUS_CONFIG[circleInfo.status] ?? STATUS_CONFIG[2];

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/circle/${circleId}`
      : `/circle/${circleId}`;

  return (
    <div className="max-w-content mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-serif text-3xl sm:text-4xl text-earth-text truncate">
                {meta?.name || abbreviateCircleId(circleId)}
              </h1>
              <span
                className="badge shrink-0 text-xs font-medium"
                style={{
                  background: statusConf.bg,
                  color: statusConf.color,
                  border: `1px solid ${statusConf.color}30`,
                }}
              >
                {statusConf.label}
              </span>
            </div>
            {meta?.description && (
              <p className="text-earth-muted text-sm mt-1">{meta.description}</p>
            )}
            <p className="font-mono text-xs mt-2" style={{ color: "#334155" }}>
              {circleId}
            </p>
          </div>
        </div>

        {/* ── Stat tiles ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Per member",
              value: formatCredits(circleInfo.contribution_amount),
            },
            { label: "Pot size", value: formatCredits(potAmount) },
            {
              label: "Members",
              value: `${memberCount ?? "—"} / ${circleInfo.total_members}`,
            },
            {
              label: "Frequency",
              value: FREQUENCY_LABELS[circleInfo.frequency] ?? "—",
            },
          ].map(({ label, value }) => (
            <div key={label} className="stat-tile">
              <p className="text-xs text-earth-muted mb-1.5">{label}</p>
              <p className="font-serif text-lg text-earth-text">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Round progress (active circles) ────────────────────────────── */}
        {circleInfo.status === 1 && roundInfo && (
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-earth-text">Round progress</h2>
              <span className="text-xs font-mono text-earth-muted">
                {CIRCLE_STATUS_LABELS[circleInfo.status]}
              </span>
            </div>
            <CircleProgress
              currentRound={roundInfo.current_round}
              totalRounds={circleInfo.total_members}
              contributionsReceived={roundInfo.contributions_received}
              contributionsNeeded={circleInfo.total_members}
            />
            {isMember && myPosition !== null && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(139,92,246,0.08)",
                  border: "1px solid rgba(139,92,246,0.15)",
                }}
              >
                <span className="text-earth-muted">Your position:</span>
                <span
                  className="font-mono font-medium"
                  style={{ color: "#a78bfa" }}
                >
                  #{myPosition + 1}
                </span>
                <span className="text-earth-muted">
                  — pot in round {myPosition + 1}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Action panel ───────────────────────────────────────────────── */}
        <div className="card space-y-5">
          <h2 className="font-medium text-earth-text">Actions</h2>

          {!connected && (
            <p className="text-sm text-earth-muted">
              Connect your wallet to interact with this circle.
            </p>
          )}

          {/* PENDING: join or waiting */}
          {connected && circleInfo.status === 0 && (
            <>
              {!isMember ? (
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-4 text-sm"
                    style={{
                      background: "rgba(245,158,11,0.06)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    <p className="font-medium mb-1" style={{ color: "#f59e0b" }}>
                      Open for members
                    </p>
                    <p className="text-earth-muted">
                      {circleInfo.total_members - (memberCount ?? 0)} seat
                      {circleInfo.total_members - (memberCount ?? 0) !== 1
                        ? "s"
                        : ""}{" "}
                      remaining &middot; Contribution:{" "}
                      <strong className="text-earth-text">
                        {formatCredits(circleInfo.contribution_amount)}
                      </strong>{" "}
                      per round
                    </p>
                  </div>

                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="btn-leaf"
                  >
                    {joining ? "Joining…" : "Join Circle"}
                  </button>

                  {joinTxId && (
                    <TxStatus
                      txId={joinTxId}
                      onConfirmed={() => {
                        loadChainState();
                        toast.success(
                          "You joined! Refresh to see your membership."
                        );
                      }}
                    />
                  )}
                </div>
              ) : (
                <div
                  className="rounded-xl p-4 text-sm"
                  style={{
                    background: "rgba(139,92,246,0.06)",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                >
                  <p className="font-medium mb-1" style={{ color: "#a78bfa" }}>
                    You&apos;re in at position{" "}
                    <span className="font-mono">#{(myPosition ?? 0) + 1}</span>
                  </p>
                  <p className="text-earth-muted">
                    Waiting for{" "}
                    {circleInfo.total_members - (memberCount ?? 0)} more
                    member
                    {circleInfo.total_members - (memberCount ?? 0) !== 1
                      ? "s"
                      : ""}{" "}
                    to join before the circle activates.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ACTIVE: contribute or claim pot */}
          {connected && circleInfo.status === 1 && (
            <>
              {!isMember && (
                <p className="text-sm text-earth-muted">
                  This circle is full and active. You can view its progress but
                  cannot join.
                </p>
              )}

              {isMember && isMyTurnToClaim && (
                <ClaimPotButton
                  membershipRecord={myMembership}
                  expectedRound={roundInfo!.current_round}
                  potAmount={potAmount}
                  onSuccess={loadChainState}
                />
              )}

              {isMember && !isMyTurnToClaim && (
                <div className="space-y-3">
                  {roundInfo &&
                  roundInfo.contributions_received < circleInfo.total_members ? (
                    <ContributeButton
                      membershipRecord={myMembership}
                      onSuccess={loadChainState}
                    />
                  ) : (
                    <div
                      className="rounded-xl p-4 text-sm"
                      style={{
                        background: "rgba(16,185,129,0.06)",
                        border: "1px solid rgba(16,185,129,0.2)",
                      }}
                    >
                      <p className="font-medium mb-1" style={{ color: "#10b981" }}>
                        All contributions received
                      </p>
                      <p className="text-earth-muted">
                        Waiting for position{" "}
                        <span className="font-mono">
                          #{(roundInfo?.current_round ?? 0) + 1}
                        </span>{" "}
                        to claim the pot.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* COMPLETED: claim credential */}
          {connected && circleInfo.status === 2 && (
            <div className="space-y-4">
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                <p
                  className="font-medium mb-1.5"
                  style={{ color: "#10b981" }}
                >
                  Circle complete
                </p>
                <p className="text-sm text-earth-muted">
                  All {circleInfo.total_members} rounds finished. Claim your
                  CompletionCredential — a private proof of your savings history
                  usable in future circles.
                </p>
              </div>

              {isMember && !credentialTxId && (
                <button
                  onClick={handleClaimCredential}
                  disabled={claimingCredential}
                  className="btn-leaf"
                >
                  {claimingCredential ? "Claiming…" : "Claim Credential"}
                </button>
              )}

              {credentialTxId && <TxStatus txId={credentialTxId} />}

              {!isMember && (
                <p className="text-sm text-earth-muted">
                  You were not a member of this circle.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Share link ──────────────────────────────────────────────────── */}
        <div className="card space-y-3">
          <div>
            <h2 className="font-medium text-sm text-earth-text">
              Share this circle
            </h2>
            <p className="text-xs text-earth-muted mt-0.5">
              Anyone with this link can view and join while it&apos;s pending.
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
        </div>

      </div>
    </div>
  );
}
