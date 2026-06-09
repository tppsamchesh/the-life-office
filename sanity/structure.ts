import type { StructureResolver } from "sanity/structure";

// One editable document, pinned by a fixed id so it behaves as a singleton —
// Megan always lands on the same "Landing Page" entry.
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Landing Page")
        .id("landingPage")
        .child(S.document().schemaType("landingPage").documentId("landingPage")),
    ]);
