export type BriefOption = {
  name: string;
  summary?: string;
  cost?: number;
  why?: string;
  recommended: boolean;
};

export type NormalizedBrief = {
  facts: { label: string; value: string }[];
  options: BriefOption[];
  recommendationReasoning?: string;
  noteForMeg?: string;
};

// Keys handled specially — excluded from the generic "facts" list.
const RESERVED = new Set([
  "options",
  "recommendation",
  "recommendation_reasoning",
  "notes_for_meg",
]);

function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function toValue(raw: unknown): string {
  if (Array.isArray(raw)) return raw.map((v) => String(v)).join(", ");
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") return JSON.stringify(raw);
  return String(raw);
}

export function normalizeAiBrief(brief: unknown): NormalizedBrief {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return { facts: [], options: [] };
  }

  const b = brief as Record<string, unknown>;
  const result: NormalizedBrief = { facts: [], options: [] };

  if (Array.isArray(b.options)) {
    const recIndex = typeof b.recommendation === "number" ? b.recommendation : -1;
    result.options = b.options.map((opt, i) => {
      const o = (opt ?? {}) as Record<string, unknown>;
      return {
        name: String(o.name ?? ""),
        summary: o.summary != null ? String(o.summary) : undefined,
        cost: typeof o.estimated_cost === "number" ? o.estimated_cost : undefined,
        why: o.why != null ? String(o.why) : undefined,
        recommended: i + 1 === recIndex,
      };
    });
  }

  if (typeof b.recommendation_reasoning === "string") {
    result.recommendationReasoning = b.recommendation_reasoning;
  }
  if (typeof b.notes_for_meg === "string") {
    result.noteForMeg = b.notes_for_meg;
  }

  for (const [key, raw] of Object.entries(b)) {
    if (RESERVED.has(key)) continue;
    const value = toValue(raw);
    if (value !== "") result.facts.push({ label: humanize(key), value });
  }

  return result;
}
