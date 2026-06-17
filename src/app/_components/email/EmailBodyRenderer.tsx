import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { 
  ExternalLink, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Building,
  CheckCircle,
  FileText
} from "lucide-react";

type EmailBodyRendererProps = {
  content: string;
  contentType?: "html" | "markdown" | "text";
};

export interface ActionLink {
  label: string;
  url: string;
  category: "primary" | "rsvp" | "secondary" | "other";
}

export interface ParsedEmail {
  paragraphs: string[];
  primaryActions: ActionLink[];
  rsvpActions: ActionLink[];
  secondaryActions: ActionLink[];
  otherActions: ActionLink[];
  jobDetails?: {
    role?: string;
    company?: string;
    location?: string;
    pay?: string;
    type?: string;
    setting?: string;
  };
}

export function parseEmailContent(content: string): ParsedEmail {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  
  const primaryActions: ActionLink[] = [];
  const rsvpActions: ActionLink[] = [];
  const secondaryActions: ActionLink[] = [];
  const otherActions: ActionLink[] = [];
  
  let jobTypeIdx = -1;
  let workSettingIdx = -1;
  let basePayLine = "";
  let basePayUrl = "";

  // 1. Identify key indexes and extract raw lines containing links
  const processedLines = lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase().includes("job type:")) {
      jobTypeIdx = idx;
    }
    if (trimmed.toLowerCase().includes("work setting:")) {
      workSettingIdx = idx;
    }
    
    // Extract url from line
    const urlMatch = trimmed.match(/(https?:\/\/\S+)/);
    if (urlMatch) {
      const url = urlMatch[1]!;
      let label = trimmed.replace(url, "").trim();
      // Clean up label from characters like ':', '-', '–', '—', and whitespace
      label = label.replace(/^[:\-–—\s\?]+/, "").replace(/[:\-–—\s\?]+$/, "").trim();
      
      // Special case: "Minimum base pay: ₹20,000 a month - https://..."
      if (label.toLowerCase().includes("minimum base pay")) {
        basePayLine = label;
        basePayUrl = url;
      }
      
      return { line, url, label };
    }
    return { line, url: null, label: null };
  });

  // 2. Classify actions and strip them if appropriate
  const linesToKeep: string[] = [];
  
  processedLines.forEach((item) => {
    if (item.url && item.label) {
      const lowerLabel = item.label.toLowerCase();
      
      // Decide if it's a known action link
      let category: "primary" | "rsvp" | "secondary" | "other" | null = null;
      
      if (
        lowerLabel === "apply now" ||
        lowerLabel === "view job" ||
        lowerLabel === "get started" ||
        lowerLabel === "view application"
      ) {
        category = "primary";
      } else if (
        lowerLabel === "yes" ||
        lowerLabel === "no" ||
        lowerLabel === "maybe" ||
        lowerLabel === "interested" ||
        lowerLabel === "not interested"
      ) {
        category = "rsvp";
      } else if (
        lowerLabel === "edit profile" ||
        lowerLabel === "unsubscribe" ||
        lowerLabel === "manage email settings" ||
        lowerLabel === "help centre" ||
        lowerLabel === "privacy policy" ||
        lowerLabel === "terms" ||
        lowerLabel.includes("manage settings") ||
        lowerLabel.includes("preferences")
      ) {
        category = "secondary";
      } else if (item.label.length < 50) {
        // Fallback for short label-URL pairs to keep the email clean
        category = "other";
      }

      if (category) {
        const action: ActionLink = { label: item.label, url: item.url, category };
        if (category === "primary") primaryActions.push(action);
        else if (category === "rsvp") rsvpActions.push(action);
        else if (category === "secondary") secondaryActions.push(action);
        else otherActions.push(action);
        
        // Strip the line from the main body content
        return;
      }
    }
    
    // Check if it's a line we want to skip or clean
    const lowerLine = item.line.toLowerCase().trim();
    if (
      lowerLine === "do you want to get more jobs like this?" ||
      lowerLine === "keep your indeed profile up to date" ||
      lowerLine === "this job match email is provided by the employer posting this job on indeed." ||
      lowerLine === "this message is intended only for you. do not forward this email." ||
      lowerLine === "indeed"
    ) {
      // Skip redundant boilerplate headers for actions
      return;
    }

    linesToKeep.push(item.line);
  });

  // 3. Extract Job Details if they are in the expected layout
  let jobDetails: ParsedEmail["jobDetails"] = undefined;
  
  if (jobTypeIdx !== -1 || workSettingIdx !== -1) {
    jobDetails = {};
    
    // Scan around jobTypeIdx or workSettingIdx
    const baseIdx = jobTypeIdx !== -1 ? jobTypeIdx : workSettingIdx;
    
    // Extract setting (e.g. Remote)
    if (workSettingIdx !== -1) {
      const match = lines[workSettingIdx]?.match(/work setting:\s*(.+)/i);
      if (match) jobDetails.setting = match[1]?.trim();
    }
    
    // Extract type (e.g. Permanent)
    if (jobTypeIdx !== -1) {
      const match = lines[jobTypeIdx]?.match(/job type:\s*(.+)/i);
      if (match) jobDetails.type = match[1]?.trim();
    }
    
    // Extract pay from basePayLine (e.g. Minimum base pay: ₹20,000 a month)
    if (basePayLine) {
      const match = basePayLine.match(/minimum base pay:\s*(.+)/i);
      if (match) {
        jobDetails.pay = match[1]?.trim();
      } else {
        jobDetails.pay = basePayLine.replace(/minimum base pay/i, "").replace(/^[:\-–—\s]+/, "").trim();
      }
    }
    
    // Guess role, company, location from preceding lines
    if (baseIdx > 2) {
      const roleLine = lines[baseIdx - 3]?.trim();
      const companyLine = lines[baseIdx - 2]?.trim();
      const locationLine = lines[baseIdx - 1]?.trim();
      
      if (roleLine && roleLine.length < 50 && !roleLine.includes(":") && !roleLine.includes("http")) {
        jobDetails.role = roleLine;
      }
      if (companyLine && companyLine.length < 50 && !companyLine.includes(":") && !companyLine.includes("http")) {
        jobDetails.company = companyLine;
      }
      if (locationLine && locationLine.length < 40 && !locationLine.includes(":") && !locationLine.includes("http")) {
        jobDetails.location = locationLine;
      }
    }
  }

  // 4. Remove the raw job detail block from body lines to keep content clean and avoid duplication
  let bodyLines = [...linesToKeep];
  if (jobDetails?.role && jobDetails?.company) {
    bodyLines = bodyLines.filter(line => {
      const trimmed = line.trim();
      return (
        trimmed !== jobDetails.role &&
        trimmed !== jobDetails.company &&
        trimmed !== jobDetails.location &&
        !trimmed.toLowerCase().startsWith("job type:") &&
        !trimmed.toLowerCase().startsWith("work setting:") &&
        !trimmed.toLowerCase().startsWith("minimum base pay")
      );
    });
  }

  // Build clean text
  const cleanText = bodyLines.join("\n").trim();
  
  // Split into paragraphs (grouping consecutive non-empty lines, separating by empty lines)
  const paragraphs = cleanText
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return {
    paragraphs,
    primaryActions,
    rsvpActions,
    secondaryActions,
    otherActions,
    jobDetails,
  };
}

function inlineMarkdown(value: string): ReactNode[] {
  const parts = value.split(
    /(\[[^\]]+\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s\)\],]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  );
  return parts.map((part, index) => {
    // 1. Markdown link
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5"
        >
          {link[1]}
          <ExternalLink className="size-2.5 inline shrink-0" />
        </a>
      );
    }
    
    // 2. Bold
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-bold text-on-surface">{part.slice(2, -2)}</strong>;
    }
    
    // 3. Inline code
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-surface-container-high rounded px-1.5 py-0.5 text-[11px] font-mono text-primary font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    
    // 4. Raw URL
    if (part.startsWith("http://") || part.startsWith("https://")) {
      let displayUrl = part;
      try {
        const urlObj = new URL(part);
        displayUrl = urlObj.hostname + (urlObj.pathname.length > 15 ? urlObj.pathname.slice(0, 12) + "..." : urlObj.pathname);
      } catch (e) {}
      
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline font-semibold inline-flex items-center gap-0.5 break-all"
        >
          {displayUrl}
          <ExternalLink className="size-2.5 inline shrink-0" />
        </a>
      );
    }
    
    // 5. Email address
    if (part.includes("@") && !part.includes(" ")) {
      return (
        <a
          key={index}
          href={`mailto:${part}`}
          className="text-primary hover:underline font-semibold"
        >
          {part}
        </a>
      );
    }
    
    return part;
  });
}

function MarkdownBody({ content }: { content: string }) {
  const parsed = parseEmailContent(content);
  
  return (
    <div className="space-y-4">
      {/* 1. Job details Card if applicable */}
      {parsed.jobDetails && (
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Job Match Alert
              </span>
              <h4 className="text-on-surface text-base font-bold font-serif mt-2">
                {parsed.jobDetails.role}
              </h4>
              {parsed.jobDetails.company && (
                <p className="text-on-surface-variant text-xs font-semibold flex items-center gap-1.5 mt-1.5">
                  <Building className="size-3.5 text-primary" />
                  {parsed.jobDetails.company}
                </p>
              )}
            </div>
            
            {parsed.primaryActions.length > 0 && (
              <div className="flex gap-2 shrink-0">
                {parsed.primaryActions.map((action, idx) => (
                  <a
                    key={idx}
                    href={action.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-2xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      idx === 0 
                        ? "bg-primary text-on-primary shadow-xs hover:bg-primary/90"
                        : "bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {action.label}
                    <ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-outline-variant/40">
            {parsed.jobDetails.location && (
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <MapPin className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-on-surface-variant/70 leading-none">Location</p>
                  <p className="text-2xs font-bold text-on-surface mt-0.5 truncate">{parsed.jobDetails.location}</p>
                </div>
              </div>
            )}
            
            {parsed.jobDetails.setting && (
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <Briefcase className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-on-surface-variant/70 leading-none">Setting</p>
                  <p className="text-2xs font-bold text-on-surface mt-0.5 truncate">{parsed.jobDetails.setting}</p>
                </div>
              </div>
            )}
            
            {parsed.jobDetails.type && (
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <Clock className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-on-surface-variant/70 leading-none">Job Type</p>
                  <p className="text-2xs font-bold text-on-surface mt-0.5 truncate">{parsed.jobDetails.type}</p>
                </div>
              </div>
            )}

            {parsed.jobDetails.pay && (
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                  <DollarSign className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-on-surface-variant/70 leading-none">Base Pay</p>
                  <p className="text-2xs font-bold text-primary font-serif mt-0.5 truncate">{parsed.jobDetails.pay}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Main content paragraphs */}
      <div className="space-y-3 font-sans text-xs leading-relaxed text-on-surface-variant">
        {parsed.paragraphs.map((para, index) => {
          // Check if bullet point
          if (/^[-*]\s+/.test(para)) {
            return (
              <div key={index} className="flex gap-2.5 pl-2 py-0.5">
                <span className="text-primary font-bold text-xs select-none">•</span>
                <span className="flex-1">{inlineMarkdown(para.replace(/^[-*]\s+/, ""))}</span>
              </div>
            );
          }
          // Check if quote
          if (para.startsWith("> ")) {
            return (
              <blockquote
                key={index}
                className="border-primary/40 bg-surface-container-low border-l-3 rounded-r-xl py-2 pl-4 pr-3 italic text-on-surface-variant/90 my-2 shadow-sm"
              >
                {inlineMarkdown(para.slice(2))}
              </blockquote>
            );
          }
          // Normal paragraph
          return (
            <p key={index} className="whitespace-pre-wrap">
              {inlineMarkdown(para)}
            </p>
          );
        })}
      </div>

      {/* 3. Non-job primary actions */}
      {!parsed.jobDetails && parsed.primaryActions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-outline-variant/30">
          {parsed.primaryActions.map((action, idx) => (
            <a
              key={idx}
              href={action.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-2xs font-bold bg-primary text-on-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs"
            >
              {action.label}
              <ExternalLink className="size-3" />
            </a>
          ))}
        </div>
      )}

      {/* 4. RSVP actions */}
      {parsed.rsvpActions.length > 0 && (
        <div className="bg-surface-container border border-outline-variant/40 rounded-2xl p-4 my-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <span className="text-2xs font-semibold text-on-surface flex items-center gap-1.5 select-none">
            <CheckCircle className="size-4 text-primary" />
            Do you want to get more jobs like this?
          </span>
          <div className="flex gap-2">
            {parsed.rsvpActions.map((action, idx) => {
              const isYes = action.label.toLowerCase() === "yes";
              const isNo = action.label.toLowerCase() === "no";
              return (
                <a
                  key={idx}
                  href={action.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                    isYes 
                      ? "bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : isNo
                        ? "bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface border-outline-variant"
                  }`}
                >
                  {action.label}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Other unclassified actions */}
      {parsed.otherActions.length > 0 && (
        <div className="flex flex-wrap gap-2.5 py-2 select-none">
          {parsed.otherActions.map((action, idx) => (
            <a
              key={idx}
              href={action.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:underline"
            >
              <FileText className="size-3" />
              {action.label}
            </a>
          ))}
        </div>
      )}

      {/* 6. Secondary footer links */}
      {parsed.secondaryActions.length > 0 && (
        <div className="mt-8 pt-5 border-t border-outline-variant/40 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] text-on-surface-variant/50 font-semibold select-none">
          {parsed.secondaryActions.map((action, idx) => (
            <a
              key={idx}
              href={action.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary transition-colors hover:underline"
            >
              {action.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmailBodyRenderer({
  content,
  contentType = "text",
}: EmailBodyRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState("360px");

  const handleLoad = () => {
    try {
      if (iframeRef.current?.contentWindow?.document?.body) {
        const height = iframeRef.current.contentWindow.document.body.scrollHeight;
        setIframeHeight(`${height + 30}px`);
      }
    } catch (e) {
      // Catch cross-origin domain error if iframe is redirected
    }
  };

  if (contentType === "html") {
    return (
      <div className="w-full rounded-2xl border border-outline-variant/60 overflow-hidden bg-white shadow-xs">
        <iframe
          ref={iframeRef}
          onLoad={handleLoad}
          title="Email content"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          srcDoc={content}
          style={{ height: iframeHeight }}
          className="w-full border-0 bg-white"
        />
      </div>
    );
  }

  // Treat both markdown and text with the rich parser
  return <MarkdownBody content={content} />;
}
