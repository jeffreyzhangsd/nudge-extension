import { playPing } from "@/lib/audio";

interface Props {
  volume: number; // 0–1
  onChange: (v: number) => void;
}

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover/tip:block">
        <div className="whitespace-nowrap rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 dark:bg-zinc-700">
          {text}
        </div>
      </div>
    </div>
  );
}

export default function VolumeControl({ volume, onChange }: Props) {
  const pct = Math.round(volume * 100);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-zinc-400">
          <path d="M13 3.5a.5.5 0 0 1 .8-.4l5 4H21a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-2.2l-5 4a.5.5 0 0 1-.8-.4V3.5zM3 9a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2.6l3 2.4A.5.5 0 0 0 9 17V7a.5.5 0 0 0-.8-.4L5.6 9H3z" />
        </svg>
        <Tooltip text={`${pct}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 accent-zinc-900 dark:accent-zinc-50"
            aria-label="Ping volume"
          />
        </Tooltip>
        <button
          onClick={() => playPing(volume)}
          className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
        >
          test
        </button>
        <Tooltip text="Adjust the volume and click test to preview the ping.">
          <span className="cursor-help text-xs text-zinc-300 dark:text-zinc-600 select-none">?</span>
        </Tooltip>
      </div>
      {volume === 0 && (
        <p className="text-xs text-amber-500 dark:text-amber-400">
          Volume is muted — you won&apos;t hear nudges.
        </p>
      )}
    </div>
  );
}
