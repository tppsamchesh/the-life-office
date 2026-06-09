"use client";

import { NextStudio } from "next-sanity/studio";

import config from "@/sanity.config";

// Importing the config inside this client component keeps the (non-serializable)
// Studio config out of the server→client props boundary.
export function Studio() {
  return <NextStudio config={config} />;
}
