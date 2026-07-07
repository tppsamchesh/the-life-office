export type SnoozePreset = { label: string; iso: string };

// Computed in the caller's local timezone. This runs in Meg's browser
// (Europe/London), so 18:00 means 18:00 on her wall clock. The ISO value is
// what gets stored in tasks.snoozed_until.
export function snoozePresets(now: Date = new Date()): SnoozePreset[] {
  const presets: SnoozePreset[] = [];

  const evening = new Date(now);
  evening.setHours(18, 0, 0, 0);
  if (evening.getTime() > now.getTime()) {
    presets.push({ label: "This evening (18:00)", iso: evening.toISOString() });
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  presets.push({ label: "Tomorrow (09:00)", iso: tomorrow.toISOString() });

  const monday = new Date(now);
  const shift = (8 - monday.getDay()) % 7 || 7; // always a future Monday
  monday.setDate(monday.getDate() + shift);
  monday.setHours(9, 0, 0, 0);
  presets.push({ label: "Monday (09:00)", iso: monday.toISOString() });

  return presets;
}
