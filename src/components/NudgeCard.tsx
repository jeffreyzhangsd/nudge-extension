import { formatCountdown, formatIntervalLabel } from "@/lib/format";
import type { Nudge } from "@/types/nudge";

interface Props {
  nudge: Nudge;
  now: number;
  onTogglePause: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function NudgeCard({ nudge, now, onTogglePause, onDelete }: Props) {
  const isPaused = nudge.status === "paused";
  const msRemaining = nudge.nextFireAt - now;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col gap-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {nudge.label}
          </span>
          {nudge.note && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {nudge.note}
            </span>
          )}
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatIntervalLabel(nudge.intervalMinutes)}
          </span>
        </div>
        <button
          onClick={() => onDelete(nudge.id)}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors text-xs mt-0.5 shrink-0"
          aria-label="Delete nudge"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
          {isPaused ? "Paused" : formatCountdown(msRemaining)}
        </span>
        <button
          onClick={() => onTogglePause(nudge.id)}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  );
}
