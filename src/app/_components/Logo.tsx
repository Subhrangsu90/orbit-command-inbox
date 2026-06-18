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
        className="shrink-0"
      >
        {/* Rounded flat container */}
        <rect width="40" height="40" rx="10" className="fill-primary" />
        
        {/* Stylized letter T */}
        {/* Horizontal bar */}
        <rect x="10" y="11" width="20" height="4" rx="2" fill="#ffffff" />
        {/* Vertical stem */}
        <rect x="18" y="11" width="4" height="18" rx="2" fill="#ffffff" />
        
        {/* Connected tactile node */}
        <circle cx="26" cy="22" r="2.5" fill="#ffd8e4" />
      </svg>

      {showText && (
        <span className={`font-sans text-xl font-bold tracking-tight ${textColorClass}`}>
          Tacta
        </span>
      )}
    </div>
  );
}

