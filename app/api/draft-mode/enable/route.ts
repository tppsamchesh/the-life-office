import { defineEnableDraftMode } from "next-sanity/draft-mode";

import { client } from "@/sanity/client";

// Called by the Studio's Presentation tool to turn on live draft preview.
export const { GET } = defineEnableDraftMode({
  client: client.withConfig({ token: process.env.SANITY_API_READ_TOKEN }),
});
