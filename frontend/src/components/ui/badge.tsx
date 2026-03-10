import type { PropsWithChildren } from "react";

import { cn } from "@/lib/cn";

type BadgeProps = PropsWithChildren<{
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
}>;

export function Badge({ children, tone = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        tone === "default" && "bg-accentSoft text-foreground",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "danger" && "bg-danger/15 text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}

