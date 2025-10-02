import * as React from "react"

import { cn } from "@/lib/utils"

// Material Design 3 Text Field
// https://m3.material.io/components/text-fields
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full rounded-sm bg-md-surface-container-highest px-4 py-2 text-base text-md-on-surface",
          "border-b-2 border-md-outline",
          "placeholder:text-md-on-surface-variant",
          "focus-visible:outline-none focus-visible:border-md-primary",
          "hover:bg-md-on-surface/[0.04]",
          "disabled:cursor-not-allowed disabled:opacity-38 disabled:bg-md-on-surface/[0.04]",
          "transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-md-on-surface",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
