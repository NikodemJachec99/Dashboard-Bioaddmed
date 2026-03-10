import type { KanbanColumn } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

type KanbanBoardProps = {
  columns: KanbanColumn[];
};

export function KanbanBoard({ columns }: KanbanBoardProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {columns.map((column) => (
        <div key={column.id} className="glass-panel hairline min-h-56 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="size-3 rounded-full" style={{ backgroundColor: column.color }} />
              <h3 className="font-semibold">{column.name}</h3>
            </div>
            <Badge>{column.tasks.length}</Badge>
          </div>
          <div className="space-y-3">
            {column.tasks.map((task) => (
              <article key={task.id} className="rounded-[24px] border border-white/20 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium">{task.title}</h4>
                    <p className="mt-1 text-sm text-muted">{task.assignee_email ?? "Bez przypisania"}</p>
                  </div>
                  <Badge tone={task.is_blocker ? "danger" : task.priority === "urgent" ? "warning" : "default"}>
                    {task.priority}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

