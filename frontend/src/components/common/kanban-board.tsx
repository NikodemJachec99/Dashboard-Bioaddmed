import { useMemo } from "react";
import { DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { KanbanColumn } from "@/types/domain";
import { Badge } from "@/components/ui/badge";

type KanbanBoardProps = {
  columns: KanbanColumn[];
  canDragTask?: (taskId: number) => boolean;
  onTaskMove?: (payload: { taskId: number; columnId: number; order: number }) => void;
};

function taskDndId(taskId: number) {
  return `task-${taskId}`;
}

function columnDndId(columnId: number) {
  return `column-${columnId}`;
}

function parseTaskId(rawId: string | number): number | null {
  const value = String(rawId);
  if (!value.startsWith("task-")) {
    return null;
  }
  const parsed = Number(value.replace("task-", ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseColumnId(rawId: string | number): number | null {
  const value = String(rawId);
  if (!value.startsWith("column-")) {
    return null;
  }
  const parsed = Number(value.replace("column-", ""));
  return Number.isNaN(parsed) ? null : parsed;
}

type SortableTaskCardProps = {
  task: KanbanColumn["tasks"][number];
  disabled: boolean;
};

function SortableTaskCard({ task, disabled }: SortableTaskCardProps) {
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
    opacity: isDragging ? 0.6 : 1,
    cursor: disabled ? "not-allowed" : "grab",
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-[24px] border border-white/20 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">{task.title}</h4>
          <p className="mt-1 text-sm text-muted">{task.assignee_email ?? "Bez przypisania"}</p>
        </div>
        <Badge tone={task.is_blocker ? "danger" : task.priority === "urgent" ? "warning" : "default"}>{task.priority}</Badge>
      </div>
    </article>
  );
}

type KanbanColumnCardProps = {
  column: KanbanColumn;
  canDragTask?: (taskId: number) => boolean;
};

function KanbanColumnCard({ column, canDragTask }: KanbanColumnCardProps) {
  const { setNodeRef } = useDroppable({ id: columnDndId(column.id) });
  const taskIds = useMemo(() => column.tasks.map((task) => taskDndId(task.id)), [column.tasks]);

  return (
    <div ref={setNodeRef} className="glass-panel hairline min-h-56 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="font-semibold">{column.name}</h3>
        </div>
        <Badge>{column.tasks.length}</Badge>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {column.tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} disabled={canDragTask ? !canDragTask(task.id) : false} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ columns, canDragTask, onTaskMove }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const taskLookup = useMemo(() => {
    const map = new Map<number, { columnId: number; index: number }>();
    for (const column of columns) {
      column.tasks.forEach((task, index) => {
        map.set(task.id, { columnId: column.id, index });
      });
    }
    return map;
  }, [columns]);

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = parseTaskId(event.active.id);
    if (!taskId || !event.over || !onTaskMove) {
      return;
    }

    if (canDragTask && !canDragTask(taskId)) {
      return;
    }

    const source = taskLookup.get(taskId);
    if (!source) {
      return;
    }

    const overTaskId = parseTaskId(event.over.id);
    const overColumnId = parseColumnId(event.over.id);
    if (overTaskId) {
      const overMeta = taskLookup.get(overTaskId);
      if (!overMeta) {
        return;
      }
      onTaskMove({ taskId, columnId: overMeta.columnId, order: overMeta.index });
      return;
    }

    if (overColumnId) {
      const targetColumn = columns.find((column) => column.id === overColumnId);
      if (!targetColumn) {
        return;
      }
      onTaskMove({ taskId, columnId: overColumnId, order: targetColumn.tasks.length });
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <KanbanColumnCard key={column.id} column={column} canDragTask={canDragTask} />
        ))}
      </div>
    </DndContext>
  );
}
