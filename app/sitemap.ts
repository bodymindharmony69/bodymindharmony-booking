import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.bodymindharmony.co.uk";
  return ["", "/book", "/privacy", "/terms"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path ? "monthly" : "weekly",
    priority: path ? 0.6 : 1,
  }));
}
