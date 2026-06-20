"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

export function isWorkspaceActionQuery(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  const keywords = [
    "mail", "email", "draft", "send", "reply", "inbox", "subject", "recipient", "to:", "cc:",
    "schedule", "event", "meeting", "calendar", "appointment", "list", "search",
    "delete", "remove", "update", "change", "cancel", "date", "time", "tomorrow"
  ];
  return keywords.some(kw => q.includes(kw));
}

export function ThinkingTimeline() {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: "Analyzing Request", desc: "Interpreting instructions and parameters" },
    { label: "Accessing Workspace", desc: "Fetching email history and calendar schedules" },
    { label: "Executing Actions", desc: "Invoking calendar or email tools" },
    { label: "Finalizing Response", desc: "Writing final summary" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant/30">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const isPending = idx > currentStep;

        return (
          <div key={idx} className="relative flex items-start gap-3">
            {/* Status dot */}
            <div className="absolute -left-[23px] top-1 flex items-center justify-center">
              {isCompleted ? (
                <div className="bg-emerald-500 text-white flex size-[14px] items-center justify-center rounded-full shadow-xs">
                  <Check className="size-2.5 stroke-[3]" />
                </div>
              ) : isActive ? (
                <div className="border-primary bg-background flex size-[14px] items-center justify-center rounded-full border-2">
                  <span className="bg-primary size-1.5 animate-pulse rounded-full" />
                </div>
              ) : (
                <div className="border-outline-variant/60 bg-background size-[14px] rounded-full border-2" />
              )}
            </div>

            {/* Label and description */}
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold transition-colors duration-300 ${
                  isActive
                    ? "text-primary font-bold"
                    : isCompleted
                      ? "text-on-surface/70"
                      : "text-on-surface-variant/40"
                }`}
              >
                {step.label}
              </p>
              {isActive && (
                <p className="text-3xs text-on-surface-variant/70 mt-0.5 animate-pulse leading-none">
                  {step.desc}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
