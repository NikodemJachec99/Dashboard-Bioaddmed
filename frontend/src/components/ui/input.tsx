import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-white/30 bg-white/70 px-4 text-sm outline-none ring-0 placeholder:text-muted/80 focus:border-accent dark:border-white/10 dark:bg-white/5",
        props.className,
      )}
      {...props}
    />
  );
}

