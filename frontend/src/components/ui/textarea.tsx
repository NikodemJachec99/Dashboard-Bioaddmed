import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-3xl border border-white/30 bg-white/70 px-4 py-3 text-sm outline-none ring-0 placeholder:text-muted/80 focus:border-accent dark:border-white/10 dark:bg-white/5",
        props.className,
      )}
      {...props}
    />
  );
}

