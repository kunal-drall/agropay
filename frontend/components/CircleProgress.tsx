"use client";

interface CircleProgressProps {
  currentRound: number; // 0-indexed
  totalRounds: number; // total_members
  contributionsReceived: number;
  contributionsNeeded: number; // total_members
}

export function CircleProgress({
  currentRound,
  totalRounds,
  contributionsReceived,
  contributionsNeeded,
}: CircleProgressProps) {
  const roundPercent = Math.round(
    (contributionsReceived / contributionsNeeded) * 100
  );

  return (
    <div className="space-y-4">
      {/* Round indicator dots */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: totalRounds }).map((_, i) => {
          const isDone = i < currentRound;
          const isCurrent = i === currentRound;

          return (
            <div
              key={i}
              className="relative w-4 h-4 rounded-full border transition-all duration-300"
              style={
                isDone
                  ? {
                      background: "#10b981",
                      borderColor: "#10b981",
                      boxShadow: "0 0 8px rgba(16,185,129,0.5)",
                    }
                  : isCurrent
                  ? {
                      background: "#f59e0b",
                      borderColor: "#f59e0b",
                      boxShadow: "0 0 8px rgba(245,158,11,0.5)",
                    }
                  : {
                      background: "transparent",
                      borderColor: "rgba(255,255,255,0.15)",
                    }
              }
              title={
                isDone
                  ? `Round ${i + 1} complete`
                  : isCurrent
                  ? `Round ${i + 1} — current`
                  : `Round ${i + 1} — upcoming`
              }
            />
          );
        })}
        <span className="text-xs font-mono text-earth-muted ml-1">
          Round {currentRound + 1} of {totalRounds}
        </span>
      </div>

      {/* Contribution progress bar */}
      <div>
        <div className="flex justify-between text-xs text-earth-muted mb-1.5">
          <span>Contributions this round</span>
          <span className="font-mono">
            {contributionsReceived} / {contributionsNeeded}
          </span>
        </div>
        <div
          className="w-full rounded-full h-2 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${roundPercent}%`,
              background: "linear-gradient(90deg, #8b5cf6 0%, #06b6d4 100%)",
              boxShadow:
                roundPercent > 0
                  ? "0 0 8px rgba(139,92,246,0.4)"
                  : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
