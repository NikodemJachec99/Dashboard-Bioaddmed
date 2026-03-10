import { motion } from "framer-motion";

type StatCardProps = {
  label: string;
  value: string | number;
  delta?: string;
};

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel hairline p-5"
    >
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-3xl font-bold">{value}</p>
        {delta ? <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">{delta}</span> : null}
      </div>
    </motion.div>
  );
}

