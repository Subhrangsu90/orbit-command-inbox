import type { ReactNode } from "react";

type EmailBodyRendererProps = {
  content: string;
  contentType?: "html" | "markdown" | "text";
};

function inlineMarkdown(value: string): ReactNode[] {
  const parts = value.split(
    /(\[[^\]]+\]\(https?:\/\/[^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g,
  );
  return parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="bg-surface-container-high rounded px-1 py-0.5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function MarkdownBody({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let inCodeBlock = false;
  const codeLines: string[] = [];
  const nodes: ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        nodes.push(
          <pre
            key={`code-${index}`}
            className="bg-surface-container-high overflow-x-auto rounded-xl p-3 text-xs"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>,
        );
        codeLines.length = 0;
      }
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      nodes.push(
        <h4 key={index} className="text-on-surface mt-4 mb-2 text-sm font-bold">
          {inlineMarkdown(heading[2] ?? "")}
        </h4>,
      );
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      nodes.push(
        <div key={index} className="flex gap-2 pl-2">
          <span aria-hidden="true">•</span>
          <span>{inlineMarkdown(line.replace(/^[-*]\s+/, ""))}</span>
        </div>,
      );
      return;
    }
    if (line.startsWith("> ")) {
      nodes.push(
        <blockquote
          key={index}
          className="border-outline border-l-2 pl-3 italic opacity-80"
        >
          {inlineMarkdown(line.slice(2))}
        </blockquote>,
      );
      return;
    }
    nodes.push(
      line ? <p key={index}>{inlineMarkdown(line)}</p> : <br key={index} />,
    );
  });

  return <div className="space-y-1.5">{nodes}</div>;
}

export function EmailBodyRenderer({
  content,
  contentType = "text",
}: EmailBodyRendererProps) {
  if (contentType === "html") {
    return (
      <iframe
        title="Email content"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={content}
        className="min-h-[360px] w-full rounded-xl border-0 bg-white"
      />
    );
  }

  if (contentType === "markdown") return <MarkdownBody content={content} />;

  return <div className="whitespace-pre-wrap">{content}</div>;
}
