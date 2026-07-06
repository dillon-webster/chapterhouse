import type { MetadataRoute } from "next";

// PWA web app manifest. Drives "Add to Home Screen" into a full-screen,
// standalone launch (the app is used almost entirely on phones from the home
// screen). Colors mirror the "library" palette in tailwind.config.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chapterhouse",
    short_name: "Chapterhouse",
    description: "A self-hosted reading club for you and your friends.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f3", // paper
    theme_color: "#6b4423", // accent-dark
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
