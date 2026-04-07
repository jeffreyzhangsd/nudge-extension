import type { Nudge } from "@/types/nudge";

const KEEPALIVE = "nudge-keepalive";
const NEXT = "nudge-next";

// Create alarms on install and on every browser startup.
// chrome.alarms persist across service worker restarts, but onStartup
// is a safety net in case Chrome clears them.
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

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

  // Notify the popup if it happens to be open
  chrome.runtime.sendMessage({ type: "nudges-updated" }).catch(() => {});
}

async function fireNudge(label: string, volume: number): Promise<void> {
  await playPingOffscreen(volume);
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "Nudge",
    message: label,
    silent: true, // we supply our own audio
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
