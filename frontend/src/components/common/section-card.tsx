import type { PropsWithChildren, ReactNode } from "react";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
}>;

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <section className="tile-panel hairline relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(14,165,233,0.1),transparent)] dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.08),transparent)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_72%)]" />
      <div className="relative mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.03em]">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
