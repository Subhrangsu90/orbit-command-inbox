import React from "react";

type LogoProps = {
  className?: string;
  size?: number;
  showText?: boolean;
  textColorClass?: string;
};

export function Logo({ className = "", size = 36, showText = true, textColorClass = "text-on-surface" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-500 hover:rotate-90"
      >
        {/* Core star/sphere */}
        <circle cx="20" cy="20" r="6" className="fill-primary" />
        
        {/* Orbit Ring 1 (Inner) */}
        <circle
          cx="20"
          cy="20"
          r="11"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary/20"
          strokeDasharray="4 2"
        />

        {/* Orbit Ring 2 (Outer) */}
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/40"
        />

        {/* Outer Orbiting Planet */}
        <circle cx="32" cy="10" r="3" className="fill-primary animate-pulse" />
        
        {/* Inner Orbiting Planet */}
        <circle cx="9" cy="20" r="2" className="fill-primary-container" />
      </svg>

      {showText && (
        <span className={`font-serif text-xl font-bold tracking-tight ${textColorClass}`}>
          Orbit
        </span>
      )}
    </div>
  );
}
