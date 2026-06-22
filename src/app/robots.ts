import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://www.tacta.online";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/chat",
        "/calendar",
        "/mail",
        "/settings",
        "/onboarding",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
