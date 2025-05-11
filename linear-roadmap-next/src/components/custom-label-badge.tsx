import React from "react";

type LabelBadgeProps = {
  color: string;
  children: React.ReactNode;
  className?: string;
};

export function LabelBadge({ color, children, className = "" }: LabelBadgeProps) {
  // Use font color instead of background color
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mr-1 bg-secondary/30 ${className}`}
      style={{ color: color || "#6b7280" }}
    >
      {children}
    </span>
  );
} 