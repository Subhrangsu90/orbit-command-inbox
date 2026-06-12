"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNavigation } from "../_lib/navigation";

export function MobileNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface-container px-sm md:hidden">
      {mobileNavigation.map((item) => {
        const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            aria-label={item.label}
            className={`grid size-10 place-items-center transition-all ${
              isActive
                ? "bg-primary-container text-on-primary-container rounded-full scale-95 shadow-sm"
                : "text-on-surface-variant"
            }`}
            title={item.label}
            href={item.to}
          >
            <span className="material-symbols-outlined">
              {item.icon}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
