import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  addTaskChecklistItem,
  addTaskComment,
  applyToRecruitment,
  archiveProject,
  createProjectMilestone,
  createProjectRisk,
  createRecruitmentOpening,
  createTask,
  deleteProjectMilestone,
  deleteProjectRisk,
  deleteRecruitmentOpening,
  fetchProjectActivity,
  fetchProjectBoard,
  fetchProjectMilestones,
  fetchProjectOverview,
  fetchProjectRecruitment,
  fetchProjectRisks,
  fetchProjects,
  fetchTasks,
  moveTask,
  queryKeys,
  updateProjectMilestone,
  updateProjectRisk,
  updateRecruitmentOpening,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { KanbanBoard } from "@/components/common/kanban-board";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KanbanColumn, Task } from "@/types/domain";

function domainError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 404) return "Element nie istnieje.";
    if (error.status === 409) return "Konflikt danych. Odswiez widok i sprobuj ponownie.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function normalize(tasks: Task[], columnId: number) {
  return tasks.map((task, index) => ({ ...task, column: columnId, order: index }));
}

function moveOptimistic(columns: KanbanColumn[], taskId: number, targetColumnId: number, targetOrder: number) {
  const source = columns.find((column) => column.tasks.some((task) => task.id === taskId));
  const target = columns.find((column) => column.id === targetColumnId);
  if (!source || !target) return columns;

  const sourceTasks = [...source.tasks];
  const fromIndex = sourceTasks.findIndex((task) => task.id === taskId);
  if (fromIndex < 0) return columns;

  const [movedTask] = sourceTasks.splice(fromIndex, 1);
  const targetTasks = source.id === target.id ? sourceTasks : [...target.tasks];
  const order = Math.min(Math.max(targetOrder, 0), targetTasks.length);
  targetTasks.splice(order, 0, { ...movedTask, column: target.id });

  return columns.map((column) => {
    if (column.id === target.id) return { ...column, tasks: normalize(targetTasks, target.id) };
    if (column.id === source.id && source.id !== target.id) return { ...column, tasks: normalize(sourceTasks, source.id) };
    return column;
  });
}

export function ProjectDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { slug } = useParams();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const project = useMemo(() => projects.find((item) => item.slug === slug) ?? projects[0], [projects, slug]);

  const activeMembership = project?.memberships.find((item) => item.user === user?.id && item.is_active !== false);
  const isAdmin = user?.global_role === "admin";
  const isProjectMember = Boolean(isAdmin || activeMembership);
  const canManageProject = Boolean(isAdmin || activeMembership?.project_role === "coordinator");

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
  const { data: board } = useQuery({
    queryKey: ["project-board", project?.id],
    queryFn: () => fetchProjectBoard(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", project?.id],
    queryFn: () => fetchTasks(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: milestones = [] } = useQuery({
    queryKey: ["project-milestones", project?.id],
    queryFn: () => fetchProjectMilestones(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: risks = [] } = useQuery({
    queryKey: ["project-risks", project?.id],
    queryFn: () => fetchProjectRisks(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: recruitment = [] } = useQuery({
    queryKey: ["project-recruitment", project?.id],
    queryFn: () => fetchProjectRecruitment(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });

  const [columnsState, setColumnsState] = useState<KanbanColumn[]>([]);
  useEffect(() => {
    setColumnsState(board?.columns ?? []);
  }, [board]);

  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", assignee: "" });
  const [commentTextByTask, setCommentTextByTask] = useState<Record<number, string>>({});
  const [checklistTextByTask, setChecklistTextByTask] = useState<Record<number, string>>({});
  const [milestoneForm, setMilestoneForm] = useState({ title: "", due_date: "", progress_percent: "0" });
  const [riskForm, setRiskForm] = useState({ title: "", description: "", severity: "medium", status: "open" });
  const [openingForm, setOpeningForm] = useState({ title: "", description: "", competencies: "" });
  const [applyByOpening, setApplyByOpening] = useState<Record<number, { motivation: string; availability_note: string }>>({});

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["project-board", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["tasks", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-overview", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-milestones", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-risks", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-recruitment", project?.id] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
    ]);
  };

  const canMoveTask = (taskId: number) => {
    if (canManageProject) return true;
    const task = tasks.find((item) => item.id === taskId);
    return Boolean(task && task.assignee === user?.id);
  };

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      setTaskForm({ title: "", description: "", priority: "medium", assignee: "" });
      setFeedback("Task utworzony.");
      setError(null);
      await refresh();
    },
    onError: (e) => setError(domainError(e, "Nie udalo sie utworzyc taska.")),
  });
  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, columnId, order }: { taskId: number; columnId: number; order: number }) => moveTask(taskId, { column: columnId, order }),
    onMutate: ({ taskId, columnId, order }) => {
      const previous = columnsState;
      setColumnsState((current) => moveOptimistic(current, taskId, columnId, order));
      return { previous };
    },
    onError: (e, _vars, ctx) => {
      setError(domainError(e, "Nie udalo sie przeniesc taska."));
      if (ctx?.previous) setColumnsState(ctx.previous);
    },
    onSettled: async () => {
      await refresh();
    },
  });
  const commentMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskComment(taskId, content),
    onSuccess: async (_d, vars) => {
      setCommentTextByTask((prev) => ({ ...prev, [vars.taskId]: "" }));
      await refresh();
    },
    onError: (e) => setError(domainError(e, "Nie udalo sie dodac komentarza.")),
  });
  const checklistMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskChecklistItem(taskId, { content, is_done: false }),
    onSuccess: async (_d, vars) => {
      setChecklistTextByTask((prev) => ({ ...prev, [vars.taskId]: "" }));
      await refresh();
    },
    onError: (e) => setError(domainError(e, "Nie udalo sie dodac checklisty.")),
  });

  const createMilestoneMutation = useMutation({
    mutationFn: () =>
      createProjectMilestone(project!.id, {
        title: milestoneForm.title,
        due_date: milestoneForm.due_date || null,
        progress_percent: Number(milestoneForm.progress_percent) || 0,
      }),
    onSuccess: async () => {
      setMilestoneForm({ title: "", due_date: "", progress_percent: "0" });
      await refresh();
    },
    onError: (e) => setError(domainError(e, "Nie udalo sie dodac milestone.")),
  });
  const createRiskMutation = useMutation({
    mutationFn: () => createProjectRisk(project!.id, riskForm),
    onSuccess: async () => {
      setRiskForm({ title: "", description: "", severity: "medium", status: "open" });
      await refresh();
    },
    onError: (e) => setError(domainError(e, "Nie udalo sie dodac ryzyka.")),
  });
  const createOpeningMutation = useMutation({
    mutationFn: () =>
      createRecruitmentOpening(project!.id, {
        title: openingForm.title,
        description: openingForm.description,
        required_competencies: openingForm.competencies.split(",").map((x) => x.trim()).filter(Boolean),
      }),
    onSuccess: async () => {
      setOpeningForm({ title: "", description: "", competencies: "" });
      await refresh();
    },
    onError: (e) => setError(domainError(e, "Nie udalo sie dodac rekrutacji.")),
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveProject(project!.id),
    onSuccess: refresh,
    onError: (e) => setError(domainError(e, "Nie udalo sie zarchiwizowac projektu.")),
  });

  if (!project) return null;

  return (
    <>
      <PageHeader eyebrow="Projekt" title={project.name} description={project.full_description ?? project.short_description} />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_.42fr]">
        <SectionCard title="Kanban" description="Realny DnD z walidacja uprawnien i rollbackiem.">
          {isProjectMember ? (
            <>
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <Input placeholder="Tytul taska" value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} />
                <Input placeholder="Opis" value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} />
                <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}>
                  <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option>
                </select>
                <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={taskForm.assignee} onChange={(e) => setTaskForm((p) => ({ ...p, assignee: e.target.value }))}>
                  <option value="">Bez assignee</option>
                  {project.memberships.map((m) => <option key={m.id} value={m.user}>{m.user_name}</option>)}
                </select>
                <Button disabled={!canManageProject || !taskForm.title} onClick={() => createTaskMutation.mutate({ project: project.id, column: columnsState[0]?.id, title: taskForm.title, description: taskForm.description, priority: taskForm.priority, assignee: taskForm.assignee ? Number(taskForm.assignee) : null, status: "todo" })}>Dodaj task</Button>
              </div>
              <KanbanBoard
                columns={columnsState}
                canDragTask={(taskId) => canMoveTask(taskId)}
                onTaskMove={({ taskId, columnId, order }) => {
                  if (!canMoveTask(taskId)) {
                    setError("Nie masz uprawnien do przesuwania tego taska.");
                    return;
                  }
                  moveTaskMutation.mutate({ taskId, columnId, order });
                }}
              />
              <div className="mt-6 space-y-3">
                {tasks.map((task) => (
                  <article key={task.id} className="rounded-[18px] bg-white/60 p-4 text-sm dark:bg-white/5">
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-muted">{task.assignee_email ?? "Bez przypisania"}</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <Input placeholder="Komentarz" value={commentTextByTask[task.id] ?? ""} onChange={(e) => setCommentTextByTask((p) => ({ ...p, [task.id]: e.target.value }))} />
                      <Button variant="secondary" onClick={() => commentMutation.mutate({ taskId: task.id, content: commentTextByTask[task.id] ?? "" })} disabled={!commentTextByTask[task.id]}>Dodaj komentarz</Button>
                      <Input placeholder="Checklist item" value={checklistTextByTask[task.id] ?? ""} onChange={(e) => setChecklistTextByTask((p) => ({ ...p, [task.id]: e.target.value }))} />
                      <Button variant="secondary" onClick={() => checklistMutation.mutate({ taskId: task.id, content: checklistTextByTask[task.id] ?? "" })} disabled={!checklistTextByTask[task.id]}>Dodaj checklist</Button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Dane operacyjne projektu sa dostepne tylko dla czlonkow zespolu.</p>
          )}
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="Status projektu">
            <div className="space-y-2 text-sm text-muted">
              <p>Etap: {project.stage}</p><p>Status: {project.status}</p><p>Progress: {project.progress_percent}%</p>
              <p>Taski: {overview?.stats?.total_tasks ?? 0}</p><p>Overdue: {overview?.stats?.overdue ?? 0}</p><p>Czlonkowie: {overview?.stats?.members ?? 0}</p>
            </div>
          </SectionCard>
          <SectionCard title="Archiwum">
            <Button disabled={!canManageProject || project.status === "archived"} onClick={() => archiveMutation.mutate()}>Zarchiwizuj projekt</Button>
          </SectionCard>
          <SectionCard title="Aktywnosc">
            <div className="space-y-2 text-sm text-muted">{activity.slice(0, 8).map((item) => <p key={item.id}><Badge>{item.action_type}</Badge> {item.description}</p>)}</div>
          </SectionCard>
        </div>
      </div>

      {isProjectMember ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <SectionCard title="Milestones">
            <div className="mb-4 space-y-2">
              <Input placeholder="Tytul" value={milestoneForm.title} onChange={(e) => setMilestoneForm((p) => ({ ...p, title: e.target.value }))} />
              <Input type="date" value={milestoneForm.due_date} onChange={(e) => setMilestoneForm((p) => ({ ...p, due_date: e.target.value }))} />
              <Input type="number" min={0} max={100} value={milestoneForm.progress_percent} onChange={(e) => setMilestoneForm((p) => ({ ...p, progress_percent: e.target.value }))} />
              <Button disabled={!canManageProject || !milestoneForm.title} onClick={() => createMilestoneMutation.mutate()}>Dodaj milestone</Button>
            </div>
            <div className="space-y-2">
              {milestones.map((m) => (
                <article key={m.id} className="rounded-xl bg-white/60 p-3 text-sm dark:bg-white/5">
                  <p className="font-semibold">{m.title}</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" disabled={!canManageProject} onClick={() => updateProjectMilestone(project.id, m.id, { status: "completed", progress_percent: 100 }).then(refresh).catch((e) => setError(domainError(e, "Nie udalo sie zaktualizowac milestone.")))}>Oznacz jako completed</Button>
                    <Button variant="ghost" disabled={!canManageProject} onClick={() => deleteProjectMilestone(project.id, m.id).then(refresh).catch((e) => setError(domainError(e, "Nie udalo sie usunac milestone.")))}>Usun</Button>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Ryzyka">
            <div className="mb-4 space-y-2">
              <Input placeholder="Tytul" value={riskForm.title} onChange={(e) => setRiskForm((p) => ({ ...p, title: e.target.value }))} />
              <Input placeholder="Opis" value={riskForm.description} onChange={(e) => setRiskForm((p) => ({ ...p, description: e.target.value }))} />
              <div className="grid gap-2 md:grid-cols-2">
                <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={riskForm.severity} onChange={(e) => setRiskForm((p) => ({ ...p, severity: e.target.value }))}>
                  <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option>
                </select>
                <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={riskForm.status} onChange={(e) => setRiskForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="open">open</option><option value="monitored">monitored</option><option value="mitigated">mitigated</option><option value="closed">closed</option>
                </select>
              </div>
              <Button disabled={!canManageProject || !riskForm.title || !riskForm.description} onClick={() => createRiskMutation.mutate()}>Dodaj ryzyko</Button>
            </div>
            <div className="space-y-2">
              {risks.map((risk) => (
                <article key={risk.id} className="rounded-xl bg-white/60 p-3 text-sm dark:bg-white/5">
                  <p className="font-semibold">{risk.title}</p>
                  <p className="text-muted">{risk.description}</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="secondary" disabled={!canManageProject} onClick={() => updateProjectRisk(project.id, risk.id, { status: "closed" }).then(refresh).catch((e) => setError(domainError(e, "Nie udalo sie zamknac ryzyka.")))}>Zamknij</Button>
                    <Button variant="ghost" disabled={!canManageProject} onClick={() => deleteProjectRisk(project.id, risk.id).then(refresh).catch((e) => setError(domainError(e, "Nie udalo sie usunac ryzyka.")))}>Usun</Button>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Rekrutacja">
            <div className="mb-4 space-y-2">
              <Input placeholder="Tytul roli" value={openingForm.title} onChange={(e) => setOpeningForm((p) => ({ ...p, title: e.target.value }))} />
              <Input placeholder="Opis roli" value={openingForm.description} onChange={(e) => setOpeningForm((p) => ({ ...p, description: e.target.value }))} />
              <Input placeholder="Kompetencje (przecinkami)" value={openingForm.competencies} onChange={(e) => setOpeningForm((p) => ({ ...p, competencies: e.target.value }))} />
              <Button disabled={!canManageProject || !openingForm.title || !openingForm.description} onClick={() => createOpeningMutation.mutate()}>Dodaj otwarcie</Button>
            </div>
            <div className="space-y-2">
              {recruitment.map((opening) => {
                const form = applyByOpening[opening.id] ?? { motivation: "", availability_note: "" };
                return (
                  <article key={opening.id} className="rounded-xl bg-white/60 p-3 text-sm dark:bg-white/5">
                    <div className="flex items-center justify-between"><p className="font-semibold">{opening.title}</p><Badge tone={opening.is_open ? "success" : "default"}>{opening.is_open ? "open" : "closed"}</Badge></div>
                    <p className="text-muted">{opening.description}</p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" disabled={!canManageProject} onClick={() => updateRecruitmentOpening(project.id, opening.id, { is_open: !opening.is_open }).then(refresh).catch((e) => setError(domainError(e, "Nie udalo sie zaktualizowac rekrutacji.")))}>{opening.is_open ? "Zamknij" : "Otworz"}</Button>
                      <Button variant="ghost" disabled={!canManageProject} onClick={() => deleteRecruitmentOpening(project.id, opening.id).then(refresh).catch((e) => setError(domainError(e, "Nie udalo sie usunac rekrutacji.")))}>Usun</Button>
                    </div>
                    <div className="mt-2 rounded-xl bg-white/70 p-2 dark:bg-white/10">
                      <Input placeholder="Motywacja" value={form.motivation} onChange={(e) => setApplyByOpening((prev) => ({ ...prev, [opening.id]: { ...form, motivation: e.target.value } }))} />
                      <Input className="mt-2" placeholder="Dostepnosc" value={form.availability_note} onChange={(e) => setApplyByOpening((prev) => ({ ...prev, [opening.id]: { ...form, availability_note: e.target.value } }))} />
                      <Button className="mt-2" disabled={!opening.is_open} onClick={() => applyToRecruitment(project.id, opening.id, form).then(refresh).catch((e) => setError(domainError(e, "Nie udalo sie wyslac aplikacji.")))}>Aplikuj</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </>
  );
}
