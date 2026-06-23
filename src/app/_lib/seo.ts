import { type Metadata } from "next";

export const SITE_CONFIG = {
  name: "Tacta",
  baseUrl: "https://www.tacta.online",
  defaultTitle: "Tacta | Intelligent Workspace Command Center",
  defaultDescription:
    "Intelligent command center for Gmail and Google Calendar. Automate email triage, smart event scheduling, and command-based tasks in one minimalist inbox.",
  defaultKeywords: [
    "Gmail command center",
    "Google Calendar automation",
    "AI email sorting",
    "smart scheduler",
    "inbox triage",
    "tacta",
    "tacta online",
    "productivity command center",
  ],
  logoUrl: "https://www.tacta.online/tacta-logo-120.png",
  ogImageUrl: "https://www.tacta.online/og-image.png",
};

export interface RouteMetadata {
  path: string;
  isPublic: boolean;
  title: string;
  description: string;
  keywords?: string[];
  robots?: {
    index: boolean;
    follow: boolean;
  };
}

export const ROUTES_CONFIG: Record<string, RouteMetadata> = {
  home: {
    path: "/",
    isPublic: true,
    title: "Tacta | Your Intelligent Workspace Command Center",
    description:
      "Tacta is the ultimate command center for Gmail and Google Calendar. Automate email triage, smart event scheduling, and command-based tasks in one minimalist inbox.",
    keywords: [
      "Gmail command center",
      "Google Calendar automation",
      "AI email sorting",
      "smart scheduler",
      "inbox triage",
      "tacta",
      "tacta ai",
      "tacta online",
      "productivity command center",
    ],
    robots: { index: true, follow: true },
  },
  privacy: {
    path: "/privacy",
    isPublic: true,
    title: "Privacy Policy",
    description:
      "Privacy Policy for Tacta Workspace. Learn about how we secure your data and handle Gmail/Google Calendar OAuth scopes.",
    robots: { index: true, follow: true },
  },
  terms: {
    path: "/terms",
    isPublic: true,
    title: "Terms of Service",
    description:
      "Terms of Service for Tacta Workspace. Review the terms, rules, and agreements for using the Tacta command center.",
    robots: { index: true, follow: true },
  },
  login: {
    path: "/login",
    isPublic: true,
    title: "Sign In",
    description: "Sign in to your Tacta intelligent command center.",
    robots: { index: false, follow: true },
  },
  signup: {
    path: "/signup",
    isPublic: true,
    title: "Create Account",
    description: "Get started with Tacta intelligent command center for Gmail and Google Calendar.",
    robots: { index: false, follow: true },
  },
  chat: {
    path: "/chat",
    isPublic: false,
    title: "Workspace Chat",
    description: "Your intelligent assistant chat interface.",
    robots: { index: false, follow: false },
  },
  calendar: {
    path: "/calendar",
    isPublic: false,
    title: "Calendar",
    description: "Intelligent calendar scheduling interface.",
    robots: { index: false, follow: false },
  },
  mail: {
    path: "/mail",
    isPublic: false,
    title: "Inbox",
    description: "Minimalist command center inbox.",
    robots: { index: false, follow: false },
  },
  settings: {
    path: "/settings",
    isPublic: false,
    title: "Settings",
    description: "Configure your Tacta workspace settings and integrations.",
    robots: { index: false, follow: false },
  },
  onboarding: {
    path: "/onboarding",
    isPublic: false,
    title: "Onboarding",
    description: "Set up your workspace and connect Google services.",
    robots: { index: false, follow: false },
  },
};

/**
 * Helper function to generate Next.js Metadata for any configured route.
 */
export function getRouteMetadata(routeKey: keyof typeof ROUTES_CONFIG): Metadata {
  const route = ROUTES_CONFIG[routeKey];
  if (!route) {
    throw new Error(`Route key "${String(routeKey)}" is not defined in seo.ts`);
  }

  const title = route.title;
  const description = route.description;
  const canonicalUrl = `${SITE_CONFIG.baseUrl}${route.path === "/" ? "" : route.path}`;

  return {
    title,
    description,
    keywords: route.keywords ?? SITE_CONFIG.defaultKeywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: SITE_CONFIG.ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_CONFIG.name} Preview`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_CONFIG.ogImageUrl],
    },
    robots: route.robots ?? {
      index: route.isPublic,
      follow: route.isPublic,
    },
  };
}
