import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Guards the shared design-token contract that the dashboard primitives
// and sibling plans depend on. Values live in app/globals.css @theme.
const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

const TOKENS: Record<string, string> = {
  "--color-ink": "#1F1F1F",
  "--color-muted": "#6B665D",
  "--color-faint": "#A39E94",
  "--color-canvas": "#F7F5F2",
  "--color-surface": "#FFFFFF",
  "--color-inset": "#EFEBE4",
  "--color-hairline": "#E7E2D9",
  "--color-edge": "#D8D2C8",
  "--color-edge-strong": "#C9C2B5",
  "--color-sage-deep": "#5F6B58",
  "--color-sage-tint": "#E7EBE3",
  "--color-positive": "#6F8F5E",
  "--color-alert": "#B65C40",
  "--color-alert-tint": "#F6E7E0",
  "--color-amber": "#9A6B2F",
  "--color-amber-tint": "#F5E9D6",
};

describe("dashboard design tokens", () => {
  for (const [name, value] of Object.entries(TOKENS)) {
    it(`defines ${name}: ${value}`, () => {
      expect(css).toContain(`${name}: ${value};`);
    });
  }

  it("defines --color-sage resolving to #A8B2A1", () => {
    expect(css).toContain("--sage: #A8B2A1;");
    expect(css).toMatch(/--color-sage:\s*(var\(--sage\)|#A8B2A1);/);
  });
});
