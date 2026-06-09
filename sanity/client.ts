import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

// Read-only client for fetching published content on the public site.
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // published, public content — served from Sanity's edge cache
});
