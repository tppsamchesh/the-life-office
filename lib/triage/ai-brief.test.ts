import { describe, expect, it } from "vitest";

import { normalizeAiBrief } from "./ai-brief";

describe("normalizeAiBrief", () => {
  it("returns empty structure for null/non-object input", () => {
    expect(normalizeAiBrief(null)).toEqual({ facts: [], options: [] });
    expect(normalizeAiBrief("nope")).toEqual({ facts: [], options: [] });
  });

  it("renders proactive renewal context as facts (no options)", () => {
    const result = normalizeAiBrief({
      date: "2026-05-18",
      trigger: "car_insurance_renewal",
      current_provider: "Admiral",
      last_known_premium: 487,
      suggested_action: "Offer to review market or renew existing policy",
    });
    expect(result.options).toEqual([]);
    expect(result.facts).toContainEqual({ label: "Current provider", value: "Admiral" });
    expect(result.facts).toContainEqual({ label: "Trigger", value: "car_insurance_renewal" });
    expect(result.facts).toContainEqual({ label: "Last known premium", value: "487" });
  });

  it("joins array fact values (childcare children)", () => {
    const result = normalizeAiBrief({
      holiday: "May half term",
      children: ["Freddie (6)", "Isla (4)"],
    });
    expect(result.facts).toContainEqual({ label: "Children", value: "Freddie (6), Isla (4)" });
    expect(result.facts).toContainEqual({ label: "Holiday", value: "May half term" });
  });

  it("maps research options and flags the 1-indexed recommendation", () => {
    const result = normalizeAiBrief({
      options: [
        { name: "Porsche Taycan", summary: "Understated.", estimated_cost: 85000 },
        { name: "BMW i5", summary: "Subtle.", estimated_cost: 62000 },
      ],
      recommendation: 1,
    });
    expect(result.options).toHaveLength(2);
    expect(result.options[0]).toMatchObject({ name: "Porsche Taycan", cost: 85000, recommended: true });
    expect(result.options[1].recommended).toBe(false);
    expect(result.facts.find((f) => f.label.toLowerCase().includes("option"))).toBeUndefined();
  });

  it("captures travel reasoning, per-option why, and note for meg", () => {
    const result = normalizeAiBrief({
      options: [
        { name: "Morzine", summary: "Family-friendly.", estimated_cost: 8200, why: "Best ski school" },
        { name: "La Clusaz", summary: "Charming.", estimated_cost: 7800, why: "Authentic" },
      ],
      recommendation: 1,
      recommendation_reasoning: "Morzine is the best all-round.",
      notes_for_meg: "Dates unconfirmed.",
    });
    expect(result.options[0]).toMatchObject({ recommended: true, why: "Best ski school" });
    expect(result.recommendationReasoning).toBe("Morzine is the best all-round.");
    expect(result.noteForMeg).toBe("Dates unconfirmed.");
  });
});
