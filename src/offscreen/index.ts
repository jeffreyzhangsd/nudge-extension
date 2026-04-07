import { playPing } from "@/lib/audio";

// Listen for play-ping messages from the background service worker
chrome.runtime.onMessage.addListener((msg: unknown) => {
  const m = msg as { type: string; volume?: number };
  if (m.type === "play-ping") {
    playPing(m.volume ?? 1);
  }
});
