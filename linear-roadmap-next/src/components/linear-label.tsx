"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface LinearLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  darkMode?: boolean;
}

const LinearLabel = React.forwardRef<HTMLLabelElement, LinearLabelProps>(
  ({ className, darkMode = true, ...props }, ref) => {
    return (
      <Label
        ref={ref}
        className={cn(
          "text-sm font-medium mb-1.5 block",
          darkMode ? "text-white" : "text-gray-700",
          className
        )}
        {...props}
      />
    );
  }
);

LinearLabel.displayName = "LinearLabel";

export { LinearLabel }; 