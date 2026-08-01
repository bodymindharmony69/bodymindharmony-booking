import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/book", "/privacy", "/terms"], disallow: ["/admin", "/api"] },
    sitemap: "https://www.bodymindharmony.co.uk/sitemap.xml",
  };
}
