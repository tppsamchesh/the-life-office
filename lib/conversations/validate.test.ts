import { describe, expect, it } from "vitest";

import { validateReplyBody } from "./validate";

describe("validateReplyBody", () => {
  it("rejects an empty body", () => {
    expect(validateReplyBody("")).toEqual({ error: "Reply can't be empty." });
  });

  it("rejects a whitespace-only body (previously a silent no-op)", () => {
    expect(validateReplyBody("   \n ")).toEqual({ error: "Reply can't be empty." });
  });

  it("rejects a missing body", () => {
    expect(validateReplyBody(null)).toEqual({ error: "Reply can't be empty." });
  });

  it("trims and accepts a real body", () => {
    expect(validateReplyBody("  On it — booking now. ")).toEqual({
      body: "On it — booking now.",
    });
  });
});
