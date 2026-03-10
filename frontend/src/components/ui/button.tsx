import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition duration-200",
        variant === "primary" && "bg-accent text-white shadow-lg shadow-accent/20 hover:opacity-90",
        variant === "secondary" && "bg-accentSoft text-foreground hover:bg-accentSoft/80",
        variant === "ghost" && "bg-transparent text-foreground hover:bg-card/60",
        className,
      )}
      {...props}
    />
  );
}

