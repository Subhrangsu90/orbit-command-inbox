import { type MetadataRoute } from "next";
import { SITE_CONFIG, ROUTES_CONFIG } from "~/app/_lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Dynamically build the sitemap using public route configuration
  const publicRoutes = Object.values(ROUTES_CONFIG).filter(
    (route) => route.isPublic && route.path !== "/login" && route.path !== "/signup"
  );

  return publicRoutes.map((route) => {
    const isHome = route.path === "/";
    return {
      url: `${SITE_CONFIG.baseUrl}${route.path === "/" ? "" : route.path}`,
      lastModified: new Date(),
      changeFrequency: isHome ? "weekly" : "monthly",
      priority: isHome ? 1.0 : 0.3,
    };
  });
}
