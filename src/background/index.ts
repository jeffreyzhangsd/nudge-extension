import type { Nudge } from "@/types/nudge";

const KEEPALIVE = "nudge-keepalive";
const NEXT = "nudge-next";

chrome.runtime.onInstalled.addListener(init);

// ── Startup detection ──────────────────────────────────────────────────────
//
// Problem: Edge's "startup boost" keeps the browser process alive after all
// windows close, so chrome.runtime.onStartup never fires on reopen, and
// chrome.storage.session is never cleared (process never quits).
//
// Solution — use only chrome.storage.local:
//   1. windows.onRemoved → when last *normal* window closes, set allWindowsClosed.
//   2. windows.onCreated → if allWindowsClosed is set, clear it and pause nudges.
//   3. onStartup → also clears allWindowsClosed (prevents double-fire on true
//      fresh starts where both onStartup and windows.onCreated both fire).
//
// The allWindowsClosed flag itself acts as the dedup guard — whoever clears
// it first wins; the second caller sees it gone and skips.

chrome.runtime.onStartup.addListener(async () => {
  await chrome.storage.local.remove("allWindowsClosed");
  await pauseAllAndNotify();
});

chrome.windows.onRemoved.addListener(async () => {
  const all = await chrome.windows.getAll({ windowTypes: ["normal"] });
  if (all.length === 0) {
    await chrome.storage.local.set({ allWindowsClosed: true });
  }
});

chrome.windows.onCreated.addListener(async () => {
  const { allWindowsClosed } = await chrome.storage.local.get("allWindowsClosed");
  if (!allWindowsClosed) return;
  await chrome.storage.local.remove("allWindowsClosed");
  await pauseAllAndNotify();
});

async function pauseAllAndNotify(): Promise<void> {
  chrome.alarms.create(KEEPALIVE, { periodInMinutes: 1 });

  const { nudges = [] } = await chrome.storage.local.get("nudges");
  const typedNudges = nudges as Nudge[];
  const now = Date.now();

  const hasActive = typedNudges.some((n) => n.status === "active");
  if (!hasActive) return;

  const paused = typedNudges.map((n) =>
    n.status === "active"
      ? {
          ...n,
          status: "paused" as const,
          pausedRemaining: Math.max(0, n.nextFireAt - now),
        }
      : n,
  );

  await chrome.storage.local.set({ nudges: paused });
  chrome.runtime.sendMessage({ type: "nudges-updated" }).catch(() => {});

  // Switch to warning icon — more reliable than OS notifications.
  // The popup restores the normal icon when the user opens it.
  await setActionIcon(true);
}

// ── Icon helpers ───────────────────────────────────────────────────────────

const NORMAL_PATHS = {
  "16": "icons/icon-16.png",
  "48": "icons/icon-48.png",
  "128": "icons/icon-128.png",
};

export async function setActionIcon(paused: boolean): Promise<void> {
  if (!paused) {
    void chrome.action.setIcon({ path: NORMAL_PATHS });
    return;
  }

  // Use OffscreenCanvas to draw the bell icon with an amber warning dot
  // in the bottom-right corner. No extra PNG files required.
  const imageData: Record<number, ImageData> = {};

  for (const size of [16, 48, 128]) {
    const resp = await fetch(chrome.runtime.getURL(`icons/icon-${size}.png`));
    const blob = await resp.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(size, size);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = canvas.getContext("2d") as any;
    ctx.drawImage(bitmap, 0, 0);

    // Amber dot
    const r = Math.max(3, Math.round(size * 0.2));
    const cx = size - r - 1;
    const cy = size - r - 1;
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // "!" inside dot
    const fontSize = Math.max(5, Math.round(r * 1.3));
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", cx, cy + 1);

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void chrome.action.setIcon({ imageData } as any);
}

// ── Alarm setup ────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  chrome.alarms.create(KEEPALIVE, { periodInMinutes: 1 });
  const { nudges = [] } = await chrome.storage.local.get("nudges");
  scheduleNextAlarm(nudges as Nudge[]);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === KEEPALIVE || alarm.name === NEXT) {
    await checkAndFireNudges();
  }
});

async function checkAndFireNudges(): Promise<void> {
  const data = await chrome.storage.local.get(["nudges", "nudge-volume"]);
  const nudges: Nudge[] = (data.nudges as Nudge[]) ?? [];
  const volume: number = (data["nudge-volume"] as number) ?? 0.8;
  const now = Date.now();

  const anyFired = nudges.some(
    (n) => n.status === "active" && n.nextFireAt <= now,
  );
  if (!anyFired) {
    scheduleNextAlarm(nudges);
    return;
  }

  const updated: Nudge[] = nudges.map((n) => {
    if (n.status === "active" && n.nextFireAt <= now) {
      void fireNudge(n.label, volume);
      return { ...n, nextFireAt: now + n.intervalMinutes * 60 * 1000 };
    }
    return n;
  });

  await chrome.storage.local.set({ nudges: updated });
  scheduleNextAlarm(updated);
  chrome.runtime.sendMessage({ type: "nudges-updated" }).catch(() => {});
}

async function fireNudge(label: string, volume: number): Promise<void> {
  await playPingOffscreen(volume);
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "Nudge",
    message: label,
    silent: true,
  });
}

async function playPingOffscreen(volume: number): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType],
    documentUrls: [offscreenUrl],
  });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ["AUDIO_PLAYBACK" as chrome.offscreen.Reason],
      justification: "Play ping sound for nudge reminders",
    });
  }

  chrome.runtime.sendMessage({ type: "play-ping", volume }).catch(() => {});
}

function scheduleNextAlarm(nudges: Nudge[]): void {
  const nextFire = nudges
    .filter((n) => n.status === "active")
    .map((n) => n.nextFireAt)
    .sort((a, b) => a - b)[0];

  chrome.alarms.clear(NEXT, () => {
    if (nextFire !== undefined) {
      chrome.alarms.create(NEXT, { when: nextFire });
    }
  });
}
