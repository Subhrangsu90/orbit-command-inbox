import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import LandingPage from "~/app/_components/landing/LandingPage";
import { getRouteMetadata } from "~/app/_lib/seo";

export const metadata: Metadata = getRouteMetadata("home");

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/chat");
  }

  // Structured Data (JSON-LD) for Search Engine Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.tacta.online/#website",
        "url": "https://www.tacta.online",
        "name": "Tacta",
        "description": "Intelligent command center for Gmail and Google Calendar. Automate email triage, smart event scheduling, and command-based tasks in one minimalist inbox.",
        "publisher": {
          "@id": "https://www.tacta.online/#organization"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://www.tacta.online/#organization",
        "name": "Tacta",
        "url": "https://www.tacta.online",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.tacta.online/tacta-logo-120.png",
          "width": "120",
          "height": "120"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.tacta.online/#application",
        "name": "Tacta",
        "operatingSystem": "All",
        "applicationCategory": "BusinessApplication",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "description": "An intelligent command center that automates Gmail, calendar scheduling, and task triage in a minimalist workspace.",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "1024"
        },
        "publisher": {
          "@id": "https://www.tacta.online/#organization"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does Tacta connect to my Google account?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Tacta connects securely via Google OAuth. We request minimal read/write permissions for Gmail and Calendar to automate tasks. You can disconnect your account at any time with a single click in your Settings."
            }
          },
          {
            "@type": "Question",
            "name": "Is my email data safe and private?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, security is our top priority. We process email summaries in-memory, and we never store your email contents on our databases. We are fully compliant with Google API Services User Data Policy, adhering to Limited Use requirements."
            }
          },
          {
            "@type": "Question",
            "name": "Can I use Tacta for multiple email addresses?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely! Tacta Pro supports connecting up to 5 different Google accounts, allowing you to view and automate all your emails and calendars in one unified, minimalist command center."
            }
          },
          {
            "@type": "Question",
            "name": "What is the workspace command center?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "It's a keyboard-driven interface where you can press a simple shortcut key (like 'C' to create, 'J/K' to navigate, or 'R' to refresh) to manage all scheduling and inbox triage without touching your mouse."
            }
          },
          {
            "@type": "Question",
            "name": "How does the AI triage work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Our background AI model analyzes inbound messages, generates bulleted summaries, highlights urgent deadlines, and categorizes emails automatically, saving you hours of manual sorting every day."
            }
          }
        ]
      }
    ]
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
