import React from "react";

export function Footer() {
  return (
    <footer className="w-full border-t border-outline-variant bg-surface px-margin py-4 text-center text-xs text-on-surface-variant/80 shrink-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} Orbit Workspace. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:underline hover:text-primary transition">Terms of Service</a>
          <a href="#" className="hover:underline hover:text-primary transition">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
