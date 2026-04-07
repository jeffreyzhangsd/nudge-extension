import { useEffect, useRef, useState } from "react";
import NudgeCard from "@/components/NudgeCard";
import AddNudgeForm from "@/components/AddNudgeForm";
import VolumeControl from "@/components/VolumeControl";
import {
  createNudge,
  deleteNudge,
  loadNudges,
  saveNudges,
  updateNudge,
} from "@/lib/nudge-store";
import type { Nudge, NudgeInterval } from "@/types/nudge";

export default function App() {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [showForm, setShowForm] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const volumeRef = useRef(0.8);

  useEffect(() => {
    loadNudges().then(setNudges);
    chrome.storage.local.get("nudge-volume").then((r) => {
      const v = r["nudge-volume"] as number | undefined;
      if (v != null) {
        setVolume(v);
        volumeRef.current = v;
      }
    });

    // Refresh nudges whenever the background fires one
    const onMessage = (msg: unknown) => {
      if ((msg as { type: string }).type === "nudges-updated") {
        loadNudges().then(setNudges);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  // Countdown display tick — only for UI, firing happens in the background
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  async function handleAdd(
    label: string,
    intervalMinutes: NudgeInterval,
    note?: string,
  ) {
    const nudge = createNudge(label, intervalMinutes, note);
    const updated = [...nudges, nudge];
    setNudges(updated);
    setNow(Date.now());
    setShowForm(false);
    await saveNudges(updated);
  }

  function handleTogglePause(id: string) {
    const nudge = nudges.find((n) => n.id === id);
    if (!nudge) return;

    let toggled: Nudge;
    if (nudge.status === "paused") {
      const remaining =
        nudge.pausedRemaining ?? nudge.intervalMinutes * 60 * 1000;
      toggled = {
        ...nudge,
        status: "active",
        nextFireAt: Date.now() + remaining,
        pausedRemaining: undefined,
      };
    } else {
      toggled = {
        ...nudge,
        status: "paused",
        pausedRemaining: Math.max(0, nudge.nextFireAt - Date.now()),
      };
    }

    const updated = updateNudge(nudges, toggled);
    setNudges(updated);
    void saveNudges(updated);
  }

  function handleDelete(id: string) {
    const updated = deleteNudge(nudges, id);
    setNudges(updated);
    void saveNudges(updated);
  }

  function handleVolumeChange(v: number) {
    volumeRef.current = v;
    setVolume(v);
    void chrome.storage.local.set({ "nudge-volume": v });
  }

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 px-4 pt-5 pb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Nudge
        </h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            + Add
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
        Add a Nudge for anything you want to stay on top of. Each one plays a
        ping at your set interval, even when the popup is closed. Test out the
        volume below or you're in for a surprise!
      </p>

      {showForm && (
        <AddNudgeForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {nudges.length === 0 && !showForm ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">
          No nudges yet. Add one to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {nudges.map((nudge) => (
            <NudgeCard
              key={nudge.id}
              nudge={nudge}
              now={now}
              onTogglePause={handleTogglePause}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <VolumeControl volume={volume} onChange={handleVolumeChange} />
    </div>
  );
}
