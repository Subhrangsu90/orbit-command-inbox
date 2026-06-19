"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { mobileNavigation } from "../_lib/navigation";

export function MobileNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-outline-variant bg-surface-container px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] md:hidden">
      {mobileNavigation.map((item) => {
        const [itemPath, itemQuery] = item.to.split("?");
        const itemParams = new URLSearchParams(itemQuery);
        const isActive = item.exact
          ? pathname === itemPath &&
            Array.from(itemParams.entries()).every(
              ([key, value]) => searchParams.get(key) === value,
            )
          : pathname.startsWith(itemPath ?? item.to);
        return (
          <Link
            key={item.to}
            aria-label={item.label}
            className={`mx-auto flex min-h-12 w-full max-w-20 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold leading-none transition-all ${
              isActive
                ? "bg-primary-container text-on-primary-container shadow-sm"
                : "text-on-surface-variant"
            }`}
            title={item.label}
            href={item.to}
          >
            <span className="material-symbols-outlined text-[1.35rem]">
              {item.icon}
            </span>
            <span className="max-w-full truncate">{item.label.replace("Agent ", "")}</span>
          </Link>
        );
      })}
    </nav>
  );
}
