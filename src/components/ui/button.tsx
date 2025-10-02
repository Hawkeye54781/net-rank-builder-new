import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Material Design 3 Button Variants
// https://m3.material.io/components/buttons
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        // MD3 Filled button - high emphasis
        filled: "bg-md-primary text-md-on-primary shadow-md-elevation-1 hover:shadow-md-elevation-2 hover:brightness-110 active:shadow-md-elevation-1 rounded-full",
        // MD3 Filled Tonal button - medium emphasis
        tonal: "bg-md-secondary-container text-md-on-secondary-container shadow-md-elevation-0 hover:shadow-md-elevation-1 hover:brightness-105 active:shadow-md-elevation-0 rounded-full",
        // MD3 Outlined button - medium emphasis
        outlined: "border-2 border-md-outline bg-transparent text-md-primary font-semibold hover:bg-md-primary/[0.08] hover:border-md-primary active:bg-md-primary/[0.12] rounded-full",
        // MD3 Text button - low emphasis
        text: "bg-transparent text-md-primary font-semibold hover:bg-md-primary/[0.08] active:bg-md-primary/[0.12] rounded-full",
        // MD3 Elevated button
        elevated: "bg-md-surface-container-low text-md-primary font-semibold shadow-md-elevation-1 hover:shadow-md-elevation-2 hover:bg-md-surface-container active:shadow-md-elevation-1 rounded-full",
        // Error variant
        error: "bg-md-error text-md-on-error shadow-md-elevation-1 hover:shadow-md-elevation-2 hover:brightness-110 active:shadow-md-elevation-1 rounded-full",
        // Legacy variants for backward compatibility
        default: "bg-primary text-primary-foreground shadow-md-elevation-1 hover:shadow-md-elevation-2 hover:brightness-110 rounded-full",
        destructive: "bg-destructive text-destructive-foreground shadow-md-elevation-1 hover:shadow-md-elevation-2 hover:brightness-110 rounded-full",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:brightness-105 rounded-full",
        ghost: "text-foreground font-semibold hover:bg-foreground/[0.08] hover:text-foreground active:bg-foreground/[0.12] rounded-full",
        link: "text-md-primary font-semibold underline-offset-4 hover:underline hover:brightness-110",
      },
      size: {
        default: "h-10 px-6 py-2.5",
        sm: "h-9 px-4 py-2 text-xs",
        lg: "h-14 px-8 py-3.5 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "filled",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
