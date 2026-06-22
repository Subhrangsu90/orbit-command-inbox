"use client";

import { useState, useEffect } from "react";
import { 
  Check, 
  Sparkles, 
  Search, 
  Mail, 
  Calendar, 
  FileText, 
  Layers,
  X,
  Terminal
} from "lucide-react";

import { 
  type TimelineStep, 
  type IntentRegistryEntry, 
  intentRegistry 
} from "./ThinkingTimelineRegistry";

export function isWorkspaceActionQuery(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase().trim();

  // 1. Ignore standard greetings
  const greetings = [
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings", "yo", "sup"
  ];
  if (greetings.some(g => q === g || q.startsWith(g + " ") || q.startsWith(g + "?") || q.startsWith(g + "!"))) {
    return false;
  }

  // 2. Ignore simple time/date/day/timezone questions
  const isSimpleTimeQuery = 
    /^(what\s+is\s+the\s+)?(current\s+)?(time|date|day|timezone)([\s\?]*)$/i.test(q) ||
    /^(what's\s+the\s+)?(time|date|day|timezone)([\s\?]*)$/i.test(q) ||
    /^what\s+time\s+is\s+it\??$/i.test(q) ||
    /^what\s+is\s+today's\s+date\??$/i.test(q) ||
    /^time\s+now\??$/i.test(q) ||
    /^today\??$/i.test(q);

  if (isSimpleTimeQuery) {
    return false;
  }

  // 3. Match workspace keywords dynamically from registry
  const keywords = intentRegistry.flatMap(i => i.keywords);
  return keywords.some(kw => q.includes(kw));
}

function getTimelineSteps(query: string): TimelineStep[] {
  const q = query.toLowerCase();
  const activeIntents = intentRegistry.filter((intent) => intent.test(q));

  if (activeIntents.length > 1) {
    // Multi-intent workspace action
    const names = activeIntents.map((i) => i.id.charAt(0).toUpperCase() + i.id.slice(1)).join(" & ");
    return [
      {
        label: `Analyzing Multi-Intent Request`,
        desc: `Resolving instructions for ${names}`,
        icon: Sparkles,
      },
      {
        label: "Checking Workspace Databases",
        desc: "Scanning message history and schedule availability",
        icon: Search,
      },
      {
        label: "Processing Actions",
        desc: "Running multi-tool operations in parallel",
        icon: Layers,
      },
      {
        label: "Finalizing Unified Summary",
        desc: "Compiling draft links and event invite confirmations",
        icon: FileText,
      },
    ];
  }

  if (activeIntents.length === 1) {
    // Single intent workspace action
    return activeIntents[0]!.getSteps(q);
  }

  // Fallback/General Workspace steps
  return [
    {
      label: "Analyzing Workspace Request",
      desc: "Interpreting instruction parameters and intent",
      icon: Sparkles,
    },
    {
      label: "Accessing Workspace Data",
      desc: "Scanning workspace databases and memory context",
      icon: Search,
    },
    {
      label: "Executing Action Tools",
      desc: "Running workspace tools for email or calendar",
      icon: Layers,
    },
    {
      label: "Finalizing Response",
      desc: "Writing final summary and details",
      icon: FileText,
    },
  ];
}

export function ThinkingTimeline({ 
  query = "", 
  plain = false, 
  isPending = false 
}: { 
  query?: string; 
  plain?: boolean; 
  isPending?: boolean;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = getTimelineSteps(query);

  useEffect(() => {
    if (isPending) {
      setCurrentStep(0);
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          const maxPendingStep = Math.max(0, steps.length - 2);
          return prev < maxPendingStep ? prev + 1 : prev;
        });
      }, 1800);
      return () => clearInterval(interval);
    } else {
      setCurrentStep(steps.length - 1);
    }
  }, [isPending, steps.length, query]);

  const timelineContent = (
    <div className="relative space-y-6">
      {/* Dynamic vertical progress line */}
      <div className="absolute left-[18px] top-3.5 bottom-3.5 w-0.5 bg-outline-variant/20 rounded-full overflow-hidden">
        <div 
          className="bg-primary h-full w-full transition-all duration-700 ease-out origin-top" 
          style={{ 
            transform: `scaleY(${currentStep / (steps.length - 1)})` 
          }}
        />
      </div>

      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isActive = idx === currentStep;
        const isPending = idx > currentStep;
        const StepIcon = step.icon;

        return (
          <div key={idx} className="relative flex items-start gap-4 pl-12">
            {/* Icon Container with state-specific styling */}
            <div 
              className={`absolute left-0 top-0.5 flex size-9 items-center justify-center rounded-full border transition-all duration-500 z-10 ${
                isCompleted 
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-xs" 
                  : isActive 
                    ? "bg-primary-container border-primary text-primary shadow-xs" 
                    : "bg-surface-container-high/50 border-outline-variant/30 text-on-surface-variant/30"
              }`}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-full border-2 border-primary/45 animate-ping opacity-75" />
              )}
              {isCompleted ? (
                <Check className="size-4 stroke-[3]" />
              ) : (
                <StepIcon className={`size-4.5 transition-transform duration-500 ${isActive ? "scale-110" : ""}`} />
              )}
            </div>

            {/* Label and description with state-specific typography */}
            <div className="min-w-0 pt-0.5">
              <h4
                className={`text-xs font-semibold tracking-wide transition-colors duration-300 ${
                  isActive
                    ? "text-primary font-bold"
                    : isCompleted
                      ? "text-on-surface/70 font-medium"
                      : "text-on-surface-variant/30"
                }`}
              >
                {step.label}
              </h4>
              <p
                className={`text-3xs mt-1 leading-normal transition-colors duration-300 ${
                  isActive
                    ? "text-on-surface-variant font-medium animate-pulse"
                    : isCompleted
                      ? "text-on-surface-variant/50"
                      : "text-on-surface-variant/20"
                }`}
              >
                {step.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (plain) {
    return timelineContent;
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant/40 rounded-2xl p-5 shadow-xs max-w-md w-full backdrop-blur-md transition-all duration-500">
      {timelineContent}
    </div>
  );
}

export function ThinkingTimelineDrawer({
  isOpen,
  onClose,
  query,
  isPending = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  isPending?: boolean;
}) {
  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-xs z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-surface-container-lowest border-l border-outline-variant/50 shadow-2xl z-50 flex flex-col transition-transform duration-500 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/45">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-primary animate-pulse" />
            <div>
              <h3 className="text-on-surface text-sm font-bold">Workspace Agent</h3>
              <p className="text-on-surface-variant/60 text-4xs font-bold tracking-wider uppercase leading-none mt-0.5">Execution steps</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface rounded-xl p-1.5 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-grow overflow-y-auto p-5 space-y-6">
          {/* User Prompt Context */}
          {query && (
            <div className="space-y-1.5">
              <span className="text-on-surface-variant/55 text-4xs font-bold tracking-wider uppercase block">User Prompt</span>
              <div className="bg-surface-container-low text-on-surface-variant/80 border-l-2 border-primary/50 px-3.5 py-2.5 rounded-r-xl text-xs leading-relaxed italic max-h-32 overflow-y-auto">
                "{query}"
              </div>
            </div>
          )}

          {/* Timeline Section */}
          <div className="space-y-1.5">
            <span className="text-on-surface-variant/55 text-4xs font-bold tracking-wider uppercase block mb-1">Live Progress</span>
            <div className="px-1 py-1">
              <ThinkingTimeline query={query} plain={true} isPending={isPending} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-outline-variant/45 bg-surface-container-low/40 flex items-center justify-between text-4xs text-on-surface-variant/55 font-bold tracking-wider uppercase">
          <span>Status: Executing</span>
          <span className="animate-pulse flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            Live
          </span>
        </div>
      </div>
    </>
  );
}
