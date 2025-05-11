"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { useTheme } from "next-themes";

// Type and priority color mapping with darker, more vibrant colors
const typeColors = {
  feature: {
    light: '#7c3aed', // purple-600
    dark: '#a78bfa'   // purple-400
  },
  bug: {
    light: '#dc2626', // red-600
    dark: '#f87171'   // red-400
  },
  improvement: {
    light: '#2563eb', // blue-600
    dark: '#60a5fa'   // blue-400
  },
  other: {
    light: '#4b5563', // gray-600
    dark: '#9ca3af'   // gray-400
  }
};

// Completely revised priority colors to ensure clear visual distinction in dark mode
const priorityColors = {
  0: {
    light: '#4b5563', // gray-600
    dark: '#9ca3af'   // gray-400
  },
  1: {
    light: '#4b5563', // gray-600
    dark: '#9ca3af'   // gray-400
  },
  2: {
    light: '#ca8a04', // yellow-600
    dark: '#facc15'   // yellow-400 (distinct yellow for medium)
  },
  3: {
    light: '#c2410c', // orange-700 (more reddish-orange)
    dark: '#f97316'   // orange-500 (more intense reddish-orange)
  },
  4: {
    light: '#b91c1c', // red-700
    dark: '#ef4444'   // red-500
  }
};

// Enhanced color variants that use more specific tailwind classes
const typeBadgeVariants = cva("text-xs font-semibold", {
  variants: {
    type: {
      feature: "text-purple-600 dark:text-purple-400",
      bug: "text-red-600 dark:text-red-400",
      improvement: "text-blue-600 dark:text-blue-400",
      other: "text-gray-600 dark:text-gray-400",
    }
  },
  defaultVariants: {
    type: "other"
  }
});

// Updated priority badge variants to match the new color mapping
const priorityBadgeVariants = cva("text-xs font-semibold", {
  variants: {
    priority: {
      1: "text-gray-600 dark:text-gray-400",
      2: "text-yellow-600 dark:text-yellow-400", 
      3: "text-orange-700 dark:text-orange-500",
      4: "text-red-700 dark:text-red-500",
      0: "text-gray-600 dark:text-gray-400",
    }
  },
  defaultVariants: {
    priority: 0
  }
});

type StatusBadgeProps = {
  type: 'feature' | 'bug' | 'improvement' | 'other';
  className?: string;
};

export function TypeBadge({ type, className }: StatusBadgeProps) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Handle mounting state to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Map types to labels
  const getTypeLabel = () => {
    switch(type) {
      case 'feature': return 'Feature';
      case 'bug': return 'Bug';
      case 'improvement': return 'Improvement';
      default: return 'Task';
    }
  };
  
  // Determine the current theme
  const currentTheme = resolvedTheme || theme;
  const colorKey = !mounted ? 'light' : (currentTheme === 'dark' ? 'dark' : 'light');
  
  // Use both class-based styling and a direct style prop
  return (
    <span 
      className={cn(typeBadgeVariants({ type }), className)}
      style={{ 
        color: typeColors[type][colorKey],
        fontWeight: 600
      }}
    >
      {getTypeLabel()}
    </span>
  );
}

type PriorityLevel = 1 | 2 | 3 | 4 | number;

export function PriorityBadge({ priority, className }: { priority: PriorityLevel, className?: string }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Handle mounting state to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const getPriorityLabel = (level: PriorityLevel) => {
    if (level === 1) return '● Low';
    if (level === 2) return '●● Medium';
    if (level === 3) return '●●● High';
    if (level === 4) return '!!!! Urgent';
    return 'None';
  };

  // Normalize priority to be between 0-4
  const normalizedPriority = priority >= 1 && priority <= 4 ? priority : 0;
  
  // Determine the current theme
  const currentTheme = resolvedTheme || theme;
  const colorKey = !mounted ? 'light' : (currentTheme === 'dark' ? 'dark' : 'light');
  
  // Use both class-based styling and a direct style prop
  return (
    <span 
      className={cn(priorityBadgeVariants({ priority: normalizedPriority as 0 | 1 | 2 | 3 | 4 }), className)}
      style={{ 
        color: priorityColors[normalizedPriority as 0 | 1 | 2 | 3 | 4][colorKey],
        fontWeight: 600
      }}
    >
      {getPriorityLabel(priority)}
    </span>
  );
}

// For the state badge, we'll keep the color prop but add text color adaptation
export function StateBadge({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span 
        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
        style={{ backgroundColor: color, opacity: 1 }} 
      />
      <span 
        className={cn("text-sm font-medium text-foreground", className)}
        style={{ fontWeight: 500 }}
      >
        {name}
      </span>
    </div>
  );
} 