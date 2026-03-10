import { cn } from "@/lib/cn";

type AppLogoProps = {
  className?: string;
  markClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  compact?: boolean;
};

export function AppLogo({ className, markClassName, titleClassName, subtitleClassName, compact = false }: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-[22px] border border-white/60 bg-white/80 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-950/70",
          compact ? "size-12" : "size-16",
          markClassName,
        )}
      >
        <img src="/logo-bioaddmed.jpg" alt="Logo BioAddMed" className={cn("h-full w-full object-cover", compact && "scale-[1.04]")} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-xs font-semibold uppercase tracking-[0.24em] text-accent", subtitleClassName)}>BioAddMed</p>
        <h1 className={cn("text-lg font-bold tracking-[-0.03em] text-foreground", titleClassName)}>{compact ? "Hub" : "Hub operacyjny"}</h1>
      </div>
    </div>
  );
}
