"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
  if (!content) return null;
  
  return (
    <div className={cn(
      "prose prose-invert max-w-none",
      "prose-headings:font-medium prose-headings:text-white",
      "prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-4",
      "prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-3",
      "prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2",
      "prose-p:my-3 prose-p:text-gray-200",
      "prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline",
      "prose-code:bg-[#2a2a2a] prose-code:text-gray-200 prose-code:p-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal",
      "prose-pre:bg-[#2a2a2a] prose-pre:border prose-pre:border-[#333] prose-pre:rounded-md",
      "prose-li:text-gray-200 prose-li:my-1",
      "prose-ul:my-3 prose-ol:my-3",
      "prose-blockquote:border-l-2 prose-blockquote:border-[#444] prose-blockquote:text-gray-300 prose-blockquote:pl-4 prose-blockquote:italic",
      "prose-hr:border-[#333]",
      className
    )}>
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </div>
  );
} 