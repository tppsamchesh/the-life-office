export type Fact = { label: string; value: string };

function humanize(key: string): string {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function jsonbToFacts(value: unknown): Fact[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const facts: Fact[] = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const text = Array.isArray(raw)
      ? raw.map((v) => String(v)).join(", ")
      : raw === null || raw === undefined
        ? ""
        : typeof raw === "object"
          ? JSON.stringify(raw)
          : String(raw);
    if (text !== "") facts.push({ label: humanize(key), value: text });
  }
  return facts;
}
