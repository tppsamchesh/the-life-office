export function threadTitle(
  client: { first_name: string; last_name: string | null },
  person: { first_name: string } | null,
): string {
  const first = person?.first_name ?? client.first_name;
  const family = client.last_name ?? "";
  return family ? `${family} · ${first}` : first;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export type GraceStatus = { label: string; overdue: boolean };

// Minute-granular grace countdown. Past the deadline it keeps counting up as
// "overdue Xm" instead of freezing, so a lapsed grace window is visibly
// different from a healthy one.
export function graceCountdown(deadlineIso: string | null, now: Date = new Date()): GraceStatus | null {
  if (!deadlineIso) return null;
  const ms = new Date(deadlineIso).getTime() - now.getTime();
  if (ms <= 0) {
    const overdueMin = Math.floor(-ms / 60_000);
    return { label: overdueMin < 1 ? "overdue" : `overdue ${overdueMin}m`, overdue: true };
  }
  return { label: `${Math.ceil(ms / 60_000)}m`, overdue: false };
}

// en-CA gives ISO-style YYYY-MM-DD, which we use as a stable London-day key.
const LONDON_DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
});
const LONDON_DAY_LABEL = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long",
});

export function londonDayKey(iso: string): string {
  return LONDON_DAY_KEY.format(new Date(iso));
}

export function dayDividerLabel(iso: string, now: Date = new Date()): string {
  const key = londonDayKey(iso);
  if (key === LONDON_DAY_KEY.format(now)) return "Today";
  if (key === LONDON_DAY_KEY.format(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return LONDON_DAY_LABEL.format(new Date(iso));
}

export function londonTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/London",
  });
}
