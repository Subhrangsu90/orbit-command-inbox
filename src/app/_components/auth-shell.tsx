import { CalendarDays, Check, Inbox, Sparkles } from "lucide-react";
import Link from "next/link";
import { Logo } from "./Logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-background text-on-background h-screen overflow-hidden lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)]">
      {/* Left decorative sidebar */}
      <section className="relative hidden h-full overflow-hidden bg-[#1e1a2e] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
        <div className="absolute -top-24 -right-24 size-80 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -top-8 -right-8 size-48 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute bottom-24 -left-32 size-72 rounded-full bg-[#d0bcff]/8 blur-2xl pointer-events-none" />

        <Link
          href="/"
          className="relative inline-block hover:opacity-90 transition"
        >
          <Logo showText={true} textColorClass="text-white font-serif text-2xl" />
        </Link>

        <div className="relative w-full py-6">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-1.5 text-xs text-[#eaddff]">
            <Sparkles className="size-3.5" />
            Your workday, tactically composed
          </div>
          <h2 className="font-serif text-4xl leading-[1.15] font-semibold tracking-[-0.03em] xl:text-5xl">
            Fewer clicks.
            <br />
            More momentum.
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#cbc2db]">
            Turn email and calendar into one command center built around the way
            you actually work.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
              <Inbox className="mb-2.5 size-4 text-[#d0bcff]" />
              <p className="text-sm font-semibold">Triage Gmail faster</p>
              <p className="mt-0.5 text-xs leading-5 text-[#cbc2db]">
                Turn messages into clear actions.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm">
              <CalendarDays className="mb-2.5 size-4 text-[#d0bcff]" />
              <p className="text-sm font-semibold">Command your calendar</p>
              <p className="mt-0.5 text-xs leading-5 text-[#cbc2db]">
                Schedule meetings without busywork.
              </p>
            </div>
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-[#cbc2db]">
          <Check className="size-3.5 text-[#d0bcff]" />
          Built for focus, not another inbox to manage.
        </p>
      </section>

      {/* Right form container */}
      <section className="bg-surface flex h-full flex-col justify-between px-6 py-6 sm:px-10 lg:px-12 xl:px-16 overflow-y-auto">
        <Link
          href="/"
          className="text-on-surface mb-6 flex items-center gap-3 font-semibold lg:hidden"
        >
          <Logo showText={true} />
        </Link>
        
        <div className="flex flex-1 items-center justify-center py-4">
          {children}
        </div>
        
        <p className="text-outline mt-6 text-center text-[10px] leading-4 opacity-80">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </section>
    </main>
  );
}
