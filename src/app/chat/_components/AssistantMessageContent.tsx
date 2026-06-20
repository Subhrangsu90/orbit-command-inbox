"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AssistantMessageContent({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-body-md text-on-surface leading-relaxed font-sans">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="text-on-surface font-sans font-bold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic font-sans">{children}</em>,
          hr: () => <div className="border-outline-variant/60 my-3 border-t" />,
          ul: ({ children }) => (
            <ul className="text-body-md text-on-surface list-disc space-y-1 pl-5 font-sans">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="text-body-md text-on-surface list-decimal space-y-1 pl-5 font-sans">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1 font-sans">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary font-semibold underline underline-offset-2 font-sans"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-primary/40 bg-primary/5 rounded-r-xl border-l-4 px-3 py-2 font-sans">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-surface-container-high text-on-surface rounded-md px-1.5 py-0.5 text-[0.9em] font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-surface-container text-on-surface border-outline-variant/60 overflow-x-auto rounded-xl border p-3 text-sm font-mono">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
