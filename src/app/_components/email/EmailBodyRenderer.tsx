"use client";

import { useMemo, useRef, useState } from "react";
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

const emailFrameStyles = `
  :root {
    color-scheme: light;
    background: #ffffff;
  }

  html,
  body {
    margin: 0;
    min-width: 0;
    overflow-x: hidden;
    overflow-wrap: normal;
    word-break: normal;
    -webkit-text-size-adjust: 100%;
  }

  body {
    box-sizing: border-box;
    width: 100%;
    padding: 0;
    background: #ffffff;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  img,
  video,
  canvas,
  svg {
    max-width: 100% !important;
    height: auto !important;
  }

  table {
    border-collapse: collapse;
  }

  pre,
  code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  a {
    color: #5e35b1;
  }
`;

function isFullHtmlDocument(content: string) {
  return /<\s*(?:!doctype|html|head|body)\b/i.test(content);
}

function injectEmailFrameStyles(content: string) {
  const headContent = `<base target="_blank"><style>${emailFrameStyles}</style>`;

  if (!isFullHtmlDocument(content)) {
    return `<!doctype html><html><head><meta charset="utf-8">${headContent}</head><body>${content}</body></html>`;
  }

  if (/<\s*head\b[^>]*>/i.test(content)) {
    return content.replace(
      /<\s*head\b[^>]*>/i,
      (match) => `${match}${headContent}`,
    );
  }

  if (/<\s*html\b[^>]*>/i.test(content)) {
    return content.replace(
      /<\s*html\b[^>]*>/i,
      (match) => `${match}<head><meta charset="utf-8">${headContent}</head>`,
    );
  }

  return `<!doctype html><html><head><meta charset="utf-8">${headContent}</head>${content}</html>`;
}

function HtmlEmailBody({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(420);
  const [width, setWidth] = useState<number | undefined>();
  const srcDoc = useMemo(() => injectEmailFrameStyles(content), [content]);

  function resizeFrame() {
    const frameDocument =
      iframeRef.current?.contentDocument ??
      iframeRef.current?.contentWindow?.document;

    if (!frameDocument) return;

    const body = frameDocument.body;
    const html = frameDocument.documentElement;
    const viewportWidth = iframeRef.current?.parentElement?.clientWidth ?? 0;
    const nextHeight = Math.max(
      body?.scrollHeight ?? 0,
      body?.offsetHeight ?? 0,
      html?.clientHeight ?? 0,
      html?.scrollHeight ?? 0,
      html?.offsetHeight ?? 0,
      160,
    );
    const nextWidth = Math.max(
      body?.scrollWidth ?? 0,
      body?.offsetWidth ?? 0,
      html?.scrollWidth ?? 0,
      html?.offsetWidth ?? 0,
      viewportWidth,
    );

    setHeight(Math.min(nextHeight + 8, 12000));
    setWidth(nextWidth > viewportWidth ? nextWidth : undefined);
  }

  return (
    <div className="border-outline-variant/60 w-full overflow-x-auto overflow-y-hidden rounded-2xl border bg-white shadow-xs">
      <iframe
        ref={iframeRef}
        title="Email body"
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="block w-full border-0 bg-white"
        style={{ height, width: width ? `${width}px` : "100%" }}
        onLoad={resizeFrame}
      />
    </div>
  );
}

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
  if (contentType === "html") {
    return <HtmlEmailBody content={content} />;
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
