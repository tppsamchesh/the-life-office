import { describe, expect, it } from "vitest";

import { jsonbToFacts } from "./preferences";

describe("jsonbToFacts", () => {
  it("returns [] for null/non-object", () => {
    expect(jsonbToFacts(null)).toEqual([]);
    expect(jsonbToFacts("x")).toEqual([]);
  });
  it("humanises keys and joins array values", () => {
    const facts = jsonbToFacts({ hotel_style: "boutique", cuisines: ["Italian", "Japanese"] });
    expect(facts).toContainEqual({ label: "Hotel style", value: "boutique" });
    expect(facts).toContainEqual({ label: "Cuisines", value: "Italian, Japanese" });
  });
  it("skips empty values", () => {
    expect(jsonbToFacts({ a: "", b: null, c: "ok" })).toEqual([{ label: "C", value: "ok" }]);
  });
});
