import { describe, expect, it } from "vitest";

import { groupByStage, leadName, STAGES } from "./stages";

describe("STAGES", () => {
  it("are the five pipeline stages in order", () => {
    expect(STAGES.map((s) => s.key)).toEqual([
      "new",
      "contacted",
      "qualified",
      "converted",
      "rejected",
    ]);
  });
});

describe("leadName", () => {
  it("joins first and last name", () => {
    expect(leadName({ first_name: "Eleanor", last_name: "Vance" })).toBe("Eleanor Vance");
  });
  it("handles a missing last name", () => {
    expect(leadName({ first_name: "Marcus", last_name: null })).toBe("Marcus");
  });
});

describe("groupByStage", () => {
  it("buckets leads by stage with every stage present", () => {
    const groups = groupByStage([
      { stage: "new" },
      { stage: "new" },
      { stage: "qualified" },
    ]);
    expect(groups.new).toHaveLength(2);
    expect(groups.qualified).toHaveLength(1);
    expect(groups.converted).toEqual([]);
  });
  it("treats a null stage as 'new'", () => {
    const groups = groupByStage([{ stage: null }]);
    expect(groups.new).toHaveLength(1);
  });
});
