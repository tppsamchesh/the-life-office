// Sanity project connection details.
// projectId and dataset are public and safe to expose to the browser.
// Falls back to the known project so the site renders even if env vars are unset.

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "stnrkz1n";
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-02-19";
