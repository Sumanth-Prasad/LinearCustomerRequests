"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LinearSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean;
  darkMode?: boolean;
}

const LinearSelect = React.forwardRef<HTMLSelectElement, LinearSelectProps>(
  ({ className, fullWidth = true, darkMode = true, ...props }, ref) => {
    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        <select
          ref={ref}
          className={cn(
            "w-full h-12 text-base px-4 transition-colors focus-visible:outline-none rounded-md appearance-none",
            "pr-10 bg-no-repeat bg-right",
            darkMode ? [
              "bg-[#1a1a1a] text-white border border-[#333] focus:border-blue-600",
              "placeholder:text-gray-500",
            ] : [
              "bg-white text-gray-900 border-gray-200 hover:border-gray-300 focus:border-blue-600",
              "placeholder:text-gray-400",
            ],
            className
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${darkMode ? '%23ffffff' : '%23666666'}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundPosition: "right 10px center",
          }}
          {...props}
        />
      </div>
    );
  }
);

LinearSelect.displayName = "LinearSelect";

export { LinearSelect }; 