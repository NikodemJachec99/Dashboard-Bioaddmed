import { motion } from "framer-motion";
import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  delta?: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
};

export function StatCard({ label, value, delta, detail, icon, tone = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="tile-panel hairline relative overflow-hidden p-5"
    >
      <div
        className={[
          "pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl",
          tone === "success" ? "bg-success/15" : "",
          tone === "warning" ? "bg-warning/20" : "",
          tone === "danger" ? "bg-danger/20" : "",
          tone === "default" ? "bg-accent/10" : "",
        ].join(" ")}
      />
      <div
        className={[
          "pointer-events-none absolute inset-x-5 top-0 h-px",
          tone === "success" ? "bg-success/50" : "",
          tone === "warning" ? "bg-warning/50" : "",
          tone === "danger" ? "bg-danger/50" : "",
          tone === "default" ? "bg-accent/40" : "",
        ].join(" ")}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">{label}</p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-3xl font-bold tracking-[-0.03em]">{value}</p>
              {delta ? (
                <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">{delta}</span>
              ) : null}
            </div>
          </div>
          {icon ? <div className="rounded-[20px] bg-white/80 p-3 text-accent shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:bg-white/10">{icon}</div> : null}
        </div>
        {detail ? <p className="mt-4 text-xs leading-5 text-muted">{detail}</p> : null}
      </div>
    </motion.div>
  );
}
