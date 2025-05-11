"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface LinearInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
  darkMode?: boolean;
}

const LinearInput = React.forwardRef<HTMLInputElement, LinearInputProps>(
  ({ className, fullWidth = true, darkMode = true, ...props }, ref) => {
    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        <Input
          ref={ref}
          className={cn(
            "w-full h-12 text-base px-4 transition-colors focus-visible:outline-none focus-visible:ring-0",
            darkMode ? [
              "bg-[#1a1a1a] text-white border-0 focus-visible:border-blue-600 shadow-sm",
              "placeholder:text-gray-500",
            ] : [
              "bg-white text-gray-900 border-gray-200 hover:border-gray-300 focus-visible:border-blue-600",
              "placeholder:text-gray-400",
            ],
            "focus-visible:ring-offset-0",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

LinearInput.displayName = "LinearInput";

export { LinearInput }; 