// Validation for the snooze form. An invalid or past date previously
// redirected silently; now it returns an inline error message.
export function parseSnoozeUntil(
  raw: unknown,
  now: Date = new Date(),
): { until: string } | { error: string } {
  const value = typeof raw === "string" ? raw : "";
  if (!value) return { error: "Pick a date to snooze until." };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: "That isn't a valid date." };
  if (date.getTime() <= now.getTime()) return { error: "Snooze date must be in the future." };
  return { until: date.toISOString() };
}
