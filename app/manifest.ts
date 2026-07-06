import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TLO Dashboard",
    short_name: "TLO",
    start_url: "/dashboard/conversations",
    display: "standalone",
    background_color: "#EFEBE4",
    theme_color: "#EFEBE4",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
