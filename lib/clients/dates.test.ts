import { describe, expect, it } from "vitest";

import { ageFromDob, buildDateEntries, nextBirthday } from "./dates";

const FROM = new Date("2026-06-17T00:00:00Z");

describe("nextBirthday", () => {
  it("returns this year's date when still upcoming", () => {
    expect(nextBirthday("2017-03-12", FROM).toISOString().slice(0, 10)).toBe("2027-03-12");
  });
  it("returns later-this-year date when still ahead", () => {
    expect(nextBirthday("2020-09-01", FROM).toISOString().slice(0, 10)).toBe("2026-09-01");
  });
});

describe("ageFromDob", () => {
  it("computes age, accounting for whether the birthday has passed", () => {
    expect(ageFromDob("2017-03-12", FROM)).toBe(9);
    expect(ageFromDob("2020-09-01", FROM)).toBe(5);
  });
});

describe("buildDateEntries", () => {
  it("merges upcoming lifecycle dates with derived birthdays, excludes birthday lifecycle rows and past dates, sorted ascending", () => {
    const lifecycle = [
      { id: "L1", item: "Car insurance renewal", date: "2026-08-01", category: "insurance", client_id: "c1", family_member_id: null },
      { id: "L2", item: "Olivia's birthday", date: "2027-03-12", category: "family", client_id: "c1", family_member_id: null },
      { id: "L3", item: "Old MOT", date: "2025-01-01", category: "vehicle", client_id: "c1", family_member_id: null },
    ];
    const members = [
      { id: "M1", first_name: "Olivia", date_of_birth: "2017-03-12", client_id: "c1" },
      { id: "M2", first_name: "Sophie", date_of_birth: null, client_id: "c1" },
    ];
    const entries = buildDateEntries(lifecycle, members, "The Harringtons", FROM);
    expect(entries.map((e) => e.label)).toEqual(["Car insurance renewal", "Olivia's birthday"]);
    expect(entries[1].category).toBe("birthday");
    expect(entries[1].memberId).toBe("M1");
    expect(entries[0].clientName).toBe("The Harringtons");
    expect(entries[1].date).toBe("2027-03-12");
  });
});
