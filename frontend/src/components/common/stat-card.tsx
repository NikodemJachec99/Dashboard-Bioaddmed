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
      className="glass-panel hairline relative overflow-hidden p-5"
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
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{label}</p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-3xl font-bold tracking-[-0.03em]">{value}</p>
              {delta ? (
                <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">{delta}</span>
              ) : null}
            </div>
          </div>
          {icon ? <div className="rounded-2xl bg-white/70 p-3 text-accent dark:bg-white/10">{icon}</div> : null}
        </div>
        {detail ? <p className="mt-4 text-xs leading-5 text-muted">{detail}</p> : null}
      </div>
    </motion.div>
  );
}
