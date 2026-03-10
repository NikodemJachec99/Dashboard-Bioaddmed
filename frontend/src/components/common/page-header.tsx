import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/30 bg-gradient-to-br from-white/80 via-cyan-50/70 to-sky-100/70 px-6 py-7 shadow-glass backdrop-blur-xl dark:border-white/10 dark:from-slate-950/90 dark:via-slate-900/80 dark:to-sky-950/60">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.28),transparent_55%)]" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-accent/20 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent dark:bg-white/5">
            {eyebrow}
          </span>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold tracking-[-0.03em] md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted md:text-base">{description}</p>
        </div>
        {actions ? <div className="relative z-10 flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
