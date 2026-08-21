"use client";

import { InlineMath, BlockMath } from "react-katex";

/** Renders text containing $inline$ and $$block$$ LaTeX segments; everything else is plain text. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = splitMath(text);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "block") {
          return <BlockMath key={i} errorColor="#e0554f">{part.value}</BlockMath>;
        }
        if (part.type === "inline") {
          return <InlineMath key={i} errorColor="#e0554f">{part.value}</InlineMath>;
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part.value}
          </span>
        );
      })}
    </span>
  );
}

type Part = { type: "text" | "inline" | "block"; value: string };

function splitMath(input: string): Part[] {
  const parts: Part[] = [];
  const regex = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input))) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      parts.push({ type: "block", value: match[1] });
    } else if (match[2] !== undefined) {
      parts.push({ type: "inline", value: match[2] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    parts.push({ type: "text", value: input.slice(lastIndex) });
  }
  return parts.length > 0 ? parts : [{ type: "text", value: input }];
}
