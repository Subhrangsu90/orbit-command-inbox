import { type MetadataRoute } from "next";
import { SITE_CONFIG, ROUTES_CONFIG } from "~/app/_lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Automatically retrieve paths that shouldn't be indexed, plus general APIs
  const privatePaths = Object.values(ROUTES_CONFIG)
    .filter((route) => !route.isPublic)
    .map((route) => route.path);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...privatePaths, "/api/"],
    },
    sitemap: `${SITE_CONFIG.baseUrl}/sitemap.xml`,
  };
}
