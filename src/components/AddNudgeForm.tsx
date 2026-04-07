import { useState } from "react";
import type { NudgeInterval } from "@/types/nudge";
import { formatIntervalLabel } from "@/lib/format";

const PRESETS: NudgeInterval[] = [5, 15, 30, 60];
const MAX_INTERVAL = 360;

interface Props {
  onAdd: (label: string, intervalMinutes: NudgeInterval, note?: string) => void;
  onCancel: () => void;
}

export default function AddNudgeForm({ onAdd, onCancel }: Props) {
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [interval, setInterval] = useState<NudgeInterval>(15);
  const [isCustom, setIsCustom] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");

  const effectiveInterval = isCustom ? Number(customMinutes) : interval;
  const customValid =
    !isCustom ||
    (Number(customMinutes) >= 1 && Number(customMinutes) <= MAX_INTERVAL);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || !customValid) return;
    onAdd(trimmed, effectiveInterval, note.trim() || undefined);
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-500";

  const pillClass = (active: boolean) =>
    [
      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      active
        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800",
    ].join(" ");

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col gap-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input
        autoFocus
        type="text"
        placeholder="What should I nudge you about?"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={60}
        className={inputClass}
      />
      <textarea
        placeholder="Add a note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        rows={2}
        className={`${inputClass} resize-none`}
      />
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => { setInterval(i); setIsCustom(false); }}
            className={pillClass(!isCustom && interval === i)}
          >
            {formatIntervalLabel(i)}
          </button>
        ))}
        <button type="button" onClick={() => setIsCustom(true)} className={pillClass(isCustom)}>
          Custom
        </button>
      </div>
      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            placeholder="e.g. 45"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value.replace(/\D/g, ""))}
            className="w-20 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
          />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">min</span>
          {customMinutes && !customValid && (
            <span className="text-xs text-red-500">1–{MAX_INTERVAL}</span>
          )}
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!label.trim() || !customValid || (isCustom && !customMinutes)}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
        >
          Add nudge
        </button>
      </div>
    </form>
  );
}
