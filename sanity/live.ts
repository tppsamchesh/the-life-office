import { defineLive } from "next-sanity/live";

import { client } from "./client";

// A "Viewer" token enables live draft preview / visual editing. Without it,
// the public (published) site still works and updates live; only the in-Studio
// preview of unpublished edits is disabled.
const token = process.env.SANITY_API_READ_TOKEN;

export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  browserToken: token,
});
