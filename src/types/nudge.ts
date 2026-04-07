/** Minutes. Presets: 5, 15, 30, 60. Custom: any integer 1–360. */
export type NudgeInterval = number;

export type NudgeStatus = "active" | "paused";

export interface Nudge {
  id: string;
  label: string;
  note?: string;
  intervalMinutes: NudgeInterval;
  status: NudgeStatus;
  nextFireAt: number; // unix timestamp ms
  pausedRemaining?: number; // ms remaining when paused
  createdAt: number;
}
