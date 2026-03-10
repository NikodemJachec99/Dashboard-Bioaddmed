import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { KanbanColumn, Task } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

type KanbanBoardProps = {
  columns: KanbanColumn[];
  taskLookup?: Record<number, Task>;
  selectedTaskId?: number | null;
  canDragTask?: (taskId: number) => boolean;
  onTaskMove?: (payload: { taskId: number; columnId: number; order: number }) => void;
  onTaskSelect?: (taskId: number) => void;
};

function taskDndId(taskId: number) {
  return `task-${taskId}`;
}

function columnDndId(columnId: number) {
  return `column-${columnId}`;
}

function parseTaskId(rawId: string | number): number | null {
  const value = String(rawId);
  if (!value.startsWith("task-")) return null;
  const parsed = Number(value.replace("task-", ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseColumnId(rawId: string | number): number | null {
  const value = String(rawId);
  if (!value.startsWith("column-")) return null;
  const parsed = Number(value.replace("column-", ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function priorityTone(priority: string, isBlocker?: boolean) {
  if (isBlocker) return "danger";
  if (priority === "urgent" || priority === "high") return "warning";
  if (priority === "low") return "success";
  return "default";
}

function dueDateLabel(task: Task) {
  if (!task.due_date) return "bez terminu";
  return new Date(task.due_date).toLocaleDateString("pl-PL");
}

function TaskCardContent({ task, selected = false }: { task: Task; selected?: boolean }) {
  return (
    <div
      className={[
        "tile-soft relative overflow-hidden p-4 transition",
        selected ? "border-accent shadow-[0_20px_50px_rgba(14,165,233,0.14)]" : "",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute inset-y-3 left-2 w-1 rounded-full",
          task.is_blocker ? "bg-danger" : task.priority === "urgent" || task.priority === "high" ? "bg-warning" : "bg-accent",
        ].join(" ")}
      />
      <div className="pl-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold tracking-[-0.02em]">{task.title}</h4>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{task.description || "Brak doprecyzowanego opisu taska."}</p>
          </div>
          <Badge tone={priorityTone(task.priority, task.is_blocker)}>{task.priority}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{task.assignee_email ?? "bez assignee"}</Badge>
          <Badge tone={task.is_blocker ? "danger" : "default"}>{task.is_blocker ? "blocker" : task.status}</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-[18px] bg-white/80 px-3 py-2 text-xs dark:bg-white/5">
            <p className="uppercase tracking-[0.16em] text-muted">Due</p>
            <p className="mt-1 font-semibold">{dueDateLabel(task)}</p>
          </div>
          <div className="rounded-[18px] bg-white/80 px-3 py-2 text-xs dark:bg-white/5">
            <p className="uppercase tracking-[0.16em] text-muted">Komentarze</p>
            <p className="mt-1 font-semibold">{task.comments?.length ?? 0}</p>
          </div>
          <div className="rounded-[18px] bg-white/80 px-3 py-2 text-xs dark:bg-white/5">
            <p className="uppercase tracking-[0.16em] text-muted">Checklist</p>
            <p className="mt-1 font-semibold">{task.checklist_items?.length ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type SortableTaskCardProps = {
  task: Task;
  disabled: boolean;
  selected?: boolean;
  onTaskSelect?: (taskId: number) => void;
};

function SortableTaskCard({ task, disabled, selected, onTaskSelect }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: taskDndId(task.id),
    data: {
      type: "task",
      taskId: task.id,
    },
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "grab",
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={() => onTaskSelect?.(task.id)}
      {...attributes}
      {...listeners}
    >
      <TaskCardContent task={task} selected={selected} />
    </article>
  );
}

type KanbanColumnCardProps = {
  column: KanbanColumn;
  taskLookup?: Record<number, Task>;
  selectedTaskId?: number | null;
  canDragTask?: (taskId: number) => boolean;
  onTaskSelect?: (taskId: number) => void;
};

function KanbanColumnCard({ column, taskLookup, selectedTaskId, canDragTask, onTaskSelect }: KanbanColumnCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDndId(column.id) });
  const taskIds = useMemo(() => column.tasks.map((task) => taskDndId(task.id)), [column.tasks]);
  const taskCount = column.tasks.length;

  return (
    <div
      ref={setNodeRef}
      className={[
        "tile-panel flex min-h-[640px] min-w-[350px] flex-col p-4 transition",
        isOver ? "border-accent shadow-[0_22px_60px_rgba(14,165,233,0.18)]" : "",
      ].join(" ")}
    >
      <div className="mb-4 rounded-[24px] bg-slate-950 px-4 py-4 text-white dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="size-3 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.08)]" style={{ backgroundColor: column.color }} />
            <div>
              <h3 className="text-base font-semibold tracking-[-0.02em]">{column.name}</h3>
              <p className="text-xs text-slate-400">W tej kolumnie zespol trzyma jeden etap przeplywu pracy.</p>
            </div>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{taskCount}</div>
        </div>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-3">
          {column.tasks.length > 0 ? (
            column.tasks.map((task) => {
              const resolvedTask = taskLookup?.[task.id] ?? task;
              return (
                <SortableTaskCard
                  key={task.id}
                  task={resolvedTask}
                  disabled={canDragTask ? !canDragTask(task.id) : false}
                  selected={selectedTaskId === task.id}
                  onTaskSelect={onTaskSelect}
                />
              );
            })
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-[24px] border border-dashed border-slate-300/80 bg-white/40 p-6 text-center text-sm text-muted dark:border-white/10 dark:bg-white/5">
              Upusc tutaj task lub utworz nowy element dla tej fazy pracy.
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ columns, taskLookup, selectedTaskId, canDragTask, onTaskMove, onTaskSelect }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const taskLookupByColumn = useMemo(() => {
    const map = new Map<number, { columnId: number; index: number }>();
    for (const column of columns) {
      column.tasks.forEach((task, index) => {
        map.set(task.id, { columnId: column.id, index });
      });
    }
    return map;
  }, [columns]);

  const activeTask = activeTaskId ? taskLookup?.[activeTaskId] ?? columns.flatMap((column) => column.tasks).find((task) => task.id === activeTaskId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseTaskId(event.active.id);
    if (taskId) setActiveTaskId(taskId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = parseTaskId(event.active.id);
    setActiveTaskId(null);
    if (!taskId || !event.over || !onTaskMove) return;
    if (canDragTask && !canDragTask(taskId)) return;

    const source = taskLookupByColumn.get(taskId);
    if (!source) return;

    const overTaskId = parseTaskId(event.over.id);
    const overColumnId = parseColumnId(event.over.id);

    if (overTaskId) {
      const overMeta = taskLookupByColumn.get(overTaskId);
      if (!overMeta) return;
      onTaskMove({ taskId, columnId: overMeta.columnId, order: overMeta.index });
      return;
    }

    if (overColumnId) {
      const targetColumn = columns.find((column) => column.id === overColumnId);
      if (!targetColumn) return;
      onTaskMove({ taskId, columnId: overColumnId, order: targetColumn.tasks.length });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {columns.map((column) => (
            <KanbanColumnCard
              key={column.id}
              column={column}
              taskLookup={taskLookup}
              selectedTaskId={selectedTaskId}
              canDragTask={canDragTask}
              onTaskSelect={onTaskSelect}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-[340px]">
            <TaskCardContent task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
