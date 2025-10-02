import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Material Design 3 Badge (Chip)
// https://m3.material.io/components/chips
const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        // MD3 Assist chip
        default:
          "border border-md-outline bg-transparent text-md-on-surface hover:bg-md-on-surface/[0.08]",
        // MD3 Filter chip
        filter:
          "bg-md-surface-container-low text-md-on-surface-variant hover:bg-md-on-surface/[0.08] border border-md-outline",
        // MD3 Input chip
        input:
          "bg-transparent border border-md-outline text-md-on-surface-variant hover:bg-md-on-surface/[0.08]",
        // MD3 Suggestion chip
        suggestion:
          "bg-transparent border border-md-outline text-md-on-surface-variant hover:bg-md-on-surface/[0.08]",
        // Filled variants
        primary:
          "border-transparent bg-md-primary-container text-md-on-primary-container",
        secondary:
          "border-transparent bg-md-secondary-container text-md-on-secondary-container",
        tertiary:
          "border-transparent bg-md-tertiary-container text-md-on-tertiary-container",
        error:
          "border-transparent bg-md-error-container text-md-on-error-container",
        outline: "border border-md-outline text-md-on-surface bg-transparent",
        // Legacy
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
