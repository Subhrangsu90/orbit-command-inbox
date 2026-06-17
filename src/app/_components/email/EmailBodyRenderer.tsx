import { useRef, useState } from "react";
import Linkify from "linkify-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";

type EmailBodyRendererProps = {
  content: string;
  contentType?: "html" | "markdown" | "text";
};

const linkifyOptions = {
  target: "_blank",
  rel: "noreferrer",
  className: "text-primary font-semibold break-all hover:underline",
};

function PlainTextBody({ content }: { content: string }) {
  const blocks = content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return (
      <p className="text-on-surface-variant text-xs italic">
        No readable message body.
      </p>
    );
  }

  return (
    <div className="text-on-surface-variant space-y-4 text-xs leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim());
        const isList = lines.every((line) => /^([-*]|\d+\.)\s+/.test(line));

        if (isList) {
          return (
            <ul key={index} className="space-y-2 pl-4">
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="list-disc pl-1">
                  <Linkify options={linkifyOptions}>
                    {line.replace(/^([-*]|\d+\.)\s+/, "")}
                  </Linkify>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="break-words whitespace-pre-wrap">
            <Linkify options={linkifyOptions}>{block}</Linkify>
          </p>
        );
      })}
    </div>
  );
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="space-y-4 text-xs leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1({ children }) {
            return (
              <h1 className="text-on-surface font-serif text-xl font-bold">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-on-surface font-serif text-lg font-bold">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-on-surface text-sm font-bold">{children}</h3>
            );
          },
          p({ children }) {
            return (
              <p className="text-on-surface-variant whitespace-pre-wrap">
                {children}
              </p>
            );
          },
          ul({ children }) {
            return (
              <ul className="text-on-surface-variant list-disc space-y-2 pl-5">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="text-on-surface-variant list-decimal space-y-2 pl-5">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="pl-1">{children}</li>;
          },
          strong({ children }) {
            return (
              <strong className="text-on-surface font-bold">{children}</strong>
            );
          },
          code({ children }) {
            return (
              <code className="bg-surface-container-high text-primary rounded px-1 py-0.5 font-mono text-[11px]">
                {children}
              </code>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-primary/40 bg-surface-container-low text-on-surface-variant rounded-r-xl border-l-3 py-2 pr-3 pl-4 italic">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 break-all"
              >
                {children}
                <ExternalLink className="inline size-3 shrink-0" />
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
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
        const height =
          iframeRef.current.contentWindow.document.body.scrollHeight;
        setIframeHeight(`${height + 30}px`);
      }
    } catch {
      // Cross-origin redirects can block iframe document access.
    }
  };

  if (contentType === "html") {
    return (
      <div className="border-outline-variant/60 w-full overflow-x-auto rounded-2xl border bg-white shadow-xs">
        <iframe
          ref={iframeRef}
          onLoad={handleLoad}
          title="Email content"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          srcDoc={content}
          style={{ height: iframeHeight, minWidth: "min(680px, 100%)" }}
          className="w-full border-0 bg-white"
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden break-words">
      {contentType === "markdown" ? (
        <MarkdownBody content={content} />
      ) : (
        <PlainTextBody content={content} />
      )}
    </div>
  );
}
