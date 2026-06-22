import { type Metadata } from "next";
import Link from "next/link";
import { Logo } from "~/app/_components/Logo";
import { getRouteMetadata } from "~/app/_lib/seo";

export const metadata: Metadata = getRouteMetadata("terms");

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-neutral-100 mb-2">Terms of Service</h1>
        <p className="text-sm text-neutral-400 mb-8">Last updated: June 18, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-neutral-300">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">1. Agreement to Terms</h2>
            <p>
              By accessing or using Tacta ("Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to all of these Terms, you are prohibited from using the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">2. Description of Service</h2>
            <p>
              Tacta is an automation-centric command center that integrates with your third-party accounts (such as Gmail and Google Calendar) to assist with task triage, message organization, and schedule planning.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">3. Accounts and Integrations</h2>
            <p>
              To use many features of the Service, you must register for an account and authorize integration with Google accounts.
              You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-300">
              <li>Maintaining the confidentiality of your account credentials.</li>
              <li>All activities that occur under your account.</li>
              <li>Ensuring you have the appropriate permissions to connect any Google account you link.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">4. User Conduct</h2>
            <p>
              You agree not to use the Service to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-300">
              <li>Violate any applicable local, state, national, or international laws.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Attempt to gain unauthorized access to our related systems or networks.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">5. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at our sole discretion, without notice or liability, for conduct that we believe violates these Terms or is harmful to other users or our business interests.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">6. Disclaimer of Warranties</h2>
            <p className="italic">
              The service is provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties of any kind, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted, timely, secure, or error-free.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-150">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, in no event shall Tacta or its developers be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section className="space-y-3 border-t border-neutral-800 pt-6">
            <h2 className="text-lg font-semibold text-neutral-150">8. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws applicable in your jurisdiction, without regard to conflict of law principles.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-900/20 py-8 mt-12 text-center text-xs text-neutral-500">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Tacta. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline hover:text-neutral-300">
              Privacy Policy
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
