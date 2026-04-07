import type { Nudge, NudgeInterval } from "@/types/nudge";

export async function loadNudges(): Promise<Nudge[]> {
  const result = await chrome.storage.local.get("nudges");
  return (result.nudges as Nudge[]) ?? [];
}

export async function saveNudges(nudges: Nudge[]): Promise<void> {
  await chrome.storage.local.set({ nudges });
}

export function createNudge(
  label: string,
  intervalMinutes: NudgeInterval,
  note?: string,
): Nudge {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    label,
    ...(note && { note }),
    intervalMinutes,
    status: "active",
    nextFireAt: now + intervalMinutes * 60 * 1000,
    createdAt: now,
  };
}

export function updateNudge(nudges: Nudge[], updated: Nudge): Nudge[] {
  return nudges.map((n) => (n.id === updated.id ? updated : n));
}

export function deleteNudge(nudges: Nudge[], id: string): Nudge[] {
  return nudges.filter((n) => n.id !== id);
}
