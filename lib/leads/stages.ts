export type LeadStage = "new" | "contacted" | "qualified" | "converted" | "rejected";

export const STAGES: { key: LeadStage; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "converted", label: "Converted" },
  { key: "rejected", label: "Rejected" },
];

export function leadName(lead: { first_name: string; last_name: string | null }): string {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ");
}

// Buckets leads into every stage (empty arrays included); null stage counts as "new".
export function groupByStage<T extends { stage: string | null }>(
  leads: T[],
): Record<LeadStage, T[]> {
  const groups = Object.fromEntries(STAGES.map((s) => [s.key, [] as T[]])) as Record<
    LeadStage,
    T[]
  >;
  for (const lead of leads) {
    const stage = (lead.stage ?? "new") as LeadStage;
    if (groups[stage]) groups[stage].push(lead);
  }
  return groups;
}
