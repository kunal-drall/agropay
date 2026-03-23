"use client";

import {
  abbreviateCircleId,
  formatCredits,
  FREQUENCY_LABELS,
} from "@/lib/program";
import type { CircleOnChain } from "@/lib/records";

interface CircleCardProps {
  circleId: string;
  name?: string;
  circleInfo: CircleOnChain;
  memberCount?: number;
  contributionsReceived?: number;
  onClick: () => void;
}

const STATUS_STYLES: Record<
  number,
  { label: string; bg: string; color: string; dot: string }
> = {
  0: {
    label: "Pending",
    bg: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    dot: "#f59e0b",
  },
  1: {
    label: "Active",
    bg: "rgba(16,185,129,0.1)",
    color: "#10b981",
    dot: "#10b981",
  },
  2: {
    label: "Completed",
    bg: "rgba(255,255,255,0.06)",
    color: "#64748b",
    dot: "#64748b",
  },
};

export function CircleCard({
  circleId,
  name,
  circleInfo,
  memberCount,
  contributionsReceived,
  onClick,
}: CircleCardProps) {
  const displayName = name || abbreviateCircleId(circleId);
  const conf = STATUS_STYLES[circleInfo.status] ?? STATUS_STYLES[2];
  const creditsDisplay = formatCredits(circleInfo.contribution_amount);
  const potSize = formatCredits(
    circleInfo.contribution_amount * circleInfo.total_members
  );

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-card p-5 border transition-all duration-200 group cursor-pointer"
      style={{
        background: "var(--surface)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(139,92,246,0.35)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 0 24px rgba(139,92,246,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <h3
          className="font-medium text-base text-earth-text truncate group-hover:text-white transition-colors"
        >
          {displayName}
        </h3>
        <span
          className="shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            background: conf.bg,
            color: conf.color,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: conf.dot }}
          />
          {conf.label}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
        <div>
          <p className="text-xs text-earth-muted mb-0.5">Per member</p>
          <p className="text-sm font-medium text-earth-text">{creditsDisplay}</p>
        </div>
        <div>
          <p className="text-xs text-earth-muted mb-0.5">Pot size</p>
          <p className="text-sm font-medium text-earth-text">{potSize}</p>
        </div>
        <div>
          <p className="text-xs text-earth-muted mb-0.5">Members</p>
          <p className="text-sm font-medium text-earth-text">
            {memberCount !== undefined ? memberCount : "—"} /{" "}
            {circleInfo.total_members}
          </p>
        </div>
        <div>
          <p className="text-xs text-earth-muted mb-0.5">Frequency</p>
          <p className="text-sm font-medium text-earth-text">
            {FREQUENCY_LABELS[circleInfo.frequency] ?? "—"}
          </p>
        </div>
      </div>

      {/* Active: contribution progress bar */}
      {circleInfo.status === 1 &&
        contributionsReceived !== undefined &&
        memberCount !== undefined && (
          <div>
            <div className="flex justify-between text-xs text-earth-muted mb-1.5">
              <span>This round</span>
              <span className="font-mono">
                {contributionsReceived} / {circleInfo.total_members}
              </span>
            </div>
            <div
              className="w-full rounded-full h-1 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(contributionsReceived / circleInfo.total_members) * 100}%`,
                  background: "linear-gradient(90deg, #8b5cf6, #06b6d4)",
                }}
              />
            </div>
          </div>
        )}

      {/* Pending: seats remaining */}
      {circleInfo.status === 0 && memberCount !== undefined && (
        <p className="text-xs text-earth-muted">
          <span
            className="font-mono font-medium"
            style={{ color: "#f59e0b" }}
          >
            {circleInfo.total_members - memberCount}
          </span>{" "}
          seat{circleInfo.total_members - memberCount !== 1 ? "s" : ""}{" "}
          remaining
        </p>
      )}
    </button>
  );
}

// Skeleton card shown while circle data is loading
export function CircleCardSkeleton() {
  return (
    <div
      className="rounded-card p-5 border space-y-4"
      style={{
        background: "var(--surface)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="skeleton h-5 w-32 rounded-lg" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-12 rounded" />
          <div className="skeleton h-4 w-18 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-14 rounded" />
          <div className="skeleton h-4 w-10 rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-4 w-14 rounded" />
        </div>
      </div>
      <div className="skeleton h-1 w-full rounded-full" />
    </div>
  );
}
