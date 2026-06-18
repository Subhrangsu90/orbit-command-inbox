import { type Metadata } from "next";
import Link from "next/link";
import { Logo } from "~/app/_components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Tacta Workspace. Learn about how we secure your data and handle Gmail/Google Calendar OAuth scopes.",
  alternates: {
    canonical: "https://www.tacta.online/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-purple-900 selection:text-purple-200">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={24} />
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-lg transition-colors border border-neutral-700"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-neutral-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-neutral-400 mb-8">Last updated: June 18, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-300">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">1. Introduction</h2>
            <p>
              Welcome to Tacta ("we," "our," or "us"). We are committed to protecting your personal data and your privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information when you use our command center interface and automation services (collectively, the "Service").
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">2. Information We Collect</h2>
            <p>
              To provide our automated sorting and scheduling features, we collect and process the following information:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-300">
              <li>
                <strong>Account Information:</strong> Your name, email address, profile picture, and login credentials provided during sign-up.
              </li>
              <li>
                <strong>Google Integration Data:</strong> When you connect your Gmail or Google Calendar accounts, we temporarily access metadata necessary to list, process, and draft replies, or to organize and create calendar invites. We prioritize your privacy and minimize the scope of requested permissions.
              </li>
              <li>
                <strong>Usage Data:</strong> Technical logs, database statistics, and configuration preferences stored locally to configure your workspaces.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">3. How We Use Your Data</h2>
            <p>
              We use the collected data strictly to operate, maintain, and improve Tacta, specifically to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-300">
              <li>Facilitate real-time event synchronization and command execution.</li>
              <li>Manage your account preferences and personal workspace settings.</li>
              <li>Send critical system notices and security alerts.</li>
            </ul>
            <p>
              We <strong>never</strong> sell your personal data or email message content to third parties, nor do we use it for advertising.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">4. Google API Services Disclosure</h2>
            <p>
              Tacta's use and transfer to any other app of information received from Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">5. Data Retention & Security</h2>
            <p>
              We store your account preferences and integration metadata in a secure PostgreSQL database. Your email contents are processed in-memory and are not persisted on our databases. We implement industry-standard administrative and technical security measures to prevent unauthorized access or disclosure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">6. Your Rights</h2>
            <p>
              You can disconnect Google services, export your configuration metadata, or request full account deletion at any time via the Settings page or by contacting support.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-800 pt-6">
            <h2 className="text-lg font-semibold text-neutral-150">7. Contact Us</h2>
            <p>
              If you have any questions or feedback regarding this Privacy Policy, you can reach out to us at:
              <br />
              Email: <span className="text-neutral-250 font-medium">subhrangsubera@gmail.com</span>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/20 py-8 mt-12 text-center text-xs text-neutral-500">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Tacta. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline hover:text-neutral-300">
              Terms of Service
            </Link>
            <Link href="/" className="hover:underline hover:text-neutral-300">
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
