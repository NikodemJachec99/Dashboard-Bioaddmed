import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addTaskChecklistItem, addTaskComment, createTask, fetchProjectActivity, fetchProjectBoard, fetchProjectOverview, fetchProjects, fetchTasks, moveTask, queryKeys } from "@/api/queries";
import { KanbanBoard } from "@/components/common/kanban-board";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/providers/auth-provider";

export function ProjectDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { slug } = useParams();
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const project = useMemo(() => projects.find((item) => item.slug === slug) ?? projects[0], [projects, slug]);
  const isProjectMember =
    user?.global_role === "admin" || project?.memberships.some((membership) => membership.user === user?.id && membership.is_active !== false);
  const { data: board } = useQuery({
    queryKey: ["project-board", project?.id],
    queryFn: () => fetchProjectBoard(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: overview } = useQuery({
    queryKey: ["project-overview", project?.id],
    queryFn: () => fetchProjectOverview(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["project-activity", project?.id],
    queryFn: () => fetchProjectActivity(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", project?.id],
    queryFn: () => fetchTasks(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", assignee: "" });
  const [commentTextByTask, setCommentTextByTask] = useState<Record<number, string>>({});
  const [checklistTextByTask, setChecklistTextByTask] = useState<Record<number, string>>({});

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", project?.id] });
      await queryClient.invalidateQueries({ queryKey: ["project-board", project?.id] });
      setTaskForm({ title: "", description: "", priority: "medium", assignee: "" });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, columnId, order }: { taskId: number; columnId: number; order: number }) => moveTask(taskId, { column: columnId, order }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", project?.id] });
      await queryClient.invalidateQueries({ queryKey: ["project-board", project?.id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskComment(taskId, content),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", project?.id] });
      setCommentTextByTask((prev) => ({ ...prev, [vars.taskId]: "" }));
    },
  });

  const checklistMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskChecklistItem(taskId, { content, is_done: false }),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ["tasks", project?.id] });
      setChecklistTextByTask((prev) => ({ ...prev, [vars.taskId]: "" }));
    },
  });

  const columns = board?.columns ?? [];
  if (!project) {
    return null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Projekt"
        title={project.name}
        description={project.full_description ?? project.short_description}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.42fr]">
        <SectionCard title="Kanban" description="Bieżąca praca, blokery i review w układzie projektowym.">
          {isProjectMember ? (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="Tytuł taska" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} />
            <Input
              placeholder="Opis"
              value={taskForm.description}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={taskForm.priority}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={taskForm.assignee}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, assignee: event.target.value }))}
            >
              <option value="">Bez assignee</option>
              {project.memberships.map((membership) => (
                <option key={membership.id} value={membership.user}>
                  {membership.user_name}
                </option>
              ))}
            </select>
            <Button
              onClick={() =>
                createTaskMutation.mutate({
                  project: project.id,
                  column: columns[0]?.id,
                  title: taskForm.title,
                  description: taskForm.description,
                  priority: taskForm.priority,
                  assignee: taskForm.assignee ? Number(taskForm.assignee) : null,
                  status: "todo",
                })
              }
              disabled={!taskForm.title}
            >
              Dodaj task
            </Button>
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted">Dane operacyjne projektu są dostępne tylko dla członków zespołu.</p>
          )}
          {isProjectMember ? <KanbanBoard columns={columns} /> : null}
          {isProjectMember ? <div className="mt-6 space-y-3">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-[18px] bg-white/60 p-4 text-sm dark:bg-white/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-muted">{task.assignee_email ?? "Bez przypisania"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {columns.map((column, index) => (
                      <Button
                        key={column.id}
                        variant="ghost"
                        onClick={() => moveTaskMutation.mutate({ taskId: task.id, columnId: column.id, order: task.order ?? index })}
                      >
                        {column.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Komentarz"
                    value={commentTextByTask[task.id] ?? ""}
                    onChange={(event) => setCommentTextByTask((prev) => ({ ...prev, [task.id]: event.target.value }))}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => commentMutation.mutate({ taskId: task.id, content: commentTextByTask[task.id] ?? "" })}
                    disabled={!commentTextByTask[task.id]}
                  >
                    Dodaj komentarz
                  </Button>
                  <Input
                    placeholder="Checklist item"
                    value={checklistTextByTask[task.id] ?? ""}
                    onChange={(event) => setChecklistTextByTask((prev) => ({ ...prev, [task.id]: event.target.value }))}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => checklistMutation.mutate({ taskId: task.id, content: checklistTextByTask[task.id] ?? "" })}
                    disabled={!checklistTextByTask[task.id]}
                  >
                    Dodaj checklistę
                  </Button>
                </div>
              </article>
            ))}
          </div> : null}
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="Zespół">
            <div className="space-y-3">
              {project.memberships.map((membership) => (
                <article key={membership.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <p className="font-semibold">{membership.user_name}</p>
                  <p className="text-muted">{membership.project_role}</p>
                </article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Status projektu">
            <div className="space-y-2 text-sm text-muted">
              <p>Etap: {project.stage}</p>
              <p>Status: {project.status}</p>
              <p>Progress: {project.progress_percent}%</p>
              <p>Taski: {overview?.stats?.total_tasks ?? 0}</p>
              <p>Overdue: {overview?.stats?.overdue ?? 0}</p>
              <p>Członkowie: {overview?.stats?.members ?? 0}</p>
              <p>Spotkania: {overview?.stats?.meetings ?? 0}</p>
            </div>
          </SectionCard>
          <SectionCard title="Aktywność">
            <div className="space-y-2 text-sm text-muted">
              {activity.slice(0, 8).map((item) => (
                <p key={item.id}>
                  <Badge>{item.action_type}</Badge> {item.description}
                </p>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
