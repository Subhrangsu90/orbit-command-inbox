import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import LandingPage from "~/app/_components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Tacta | Your Intelligent Workspace Command Center",
  description: "Tacta is the ultimate command center for Gmail and Google Calendar. Automate email triage, smart event scheduling, and command-based tasks in one minimalist inbox.",
  keywords: [
    "Gmail command center",
    "Google Calendar automation",
    "AI email sorting",
    "smart scheduler",
    "inbox triage",
    "tacta",
    "tacta online",
    "productivity command center",
  ],
  alternates: {
    canonical: "https://www.tacta.online",
  },
  openGraph: {
    title: "Tacta | Your Intelligent Workspace Command Center",
    description: "Tacta is the ultimate command center for Gmail and Google Calendar. Automate email triage, smart event scheduling, and command-based tasks in one minimalist inbox.",
    url: "https://www.tacta.online",
    siteName: "Tacta",
    images: [
      {
        url: "https://www.tacta.online/tacta-logo-120.png",
        width: 120,
        height: 120,
        alt: "Tacta Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Tacta | Your Intelligent Workspace Command Center",
    description: "Tacta is the ultimate command center for Gmail and Google Calendar. Automate email triage, smart event scheduling, and command-based tasks in one minimalist inbox.",
    images: ["https://www.tacta.online/tacta-logo-120.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/chat");
  }

  // Structured Data (JSON-LD) for Search Engine Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Tacta",
    "operatingSystem": "All",
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    },
    "description": "An intelligent command center that automating Gmail, calendar scheduling, and task triage in a minimalist workspace.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1024"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
