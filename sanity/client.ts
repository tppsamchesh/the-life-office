import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // live content + drafts need fresh data; Next + SanityLive handle caching
  stega: {
    // Lets the Presentation tool map text on the page back to the right field
    // (click-to-edit). studioUrl is the embedded Studio route on this same site.
    studioUrl: "/studio",
  },
});
