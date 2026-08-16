// src/react-app/utils/time.ts

/**
 * Calculates the remaining time in seconds between now and an expiry date string.
 * Returns 0 if already expired.
 */
export function getRemainingSeconds(expiresAtISO: string): number {
  const expiresAt = new Date(expiresAtISO).getTime();
  const now = Date.now();
  const diff = Math.floor((expiresAt - now) / 1000);
  return Math.max(0, diff);
}

/**
 * Formats seconds into MM:SS string.
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
