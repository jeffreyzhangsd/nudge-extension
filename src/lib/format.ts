export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "now";
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatIntervalLabel(intervalMinutes: number): string {
  if (intervalMinutes < 60) return `Every ${intervalMinutes} min`;
  if (intervalMinutes % 60 === 0) return `Every ${intervalMinutes / 60} hr`;
  const hrs = Math.floor(intervalMinutes / 60);
  const mins = intervalMinutes % 60;
  return `Every ${hrs}h ${mins}m`;
}
