"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline:
          "text-foreground",
        low: 
          "border-transparent bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
        medium: 
          "border-transparent bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200",
        high: 
          "border-transparent bg-orange-200 text-orange-700 dark:bg-orange-800 dark:text-orange-200",
        urgent: 
          "border-transparent bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200",
        feature:
          "border-transparent bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200 flex gap-1.5 items-center",
        bug:
          "border-transparent bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200 flex gap-1.5 items-center",
        improvement:
          "border-transparent bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200 flex gap-1.5 items-center",
        other:
          "border-transparent bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 flex gap-1.5 items-center"
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants } 