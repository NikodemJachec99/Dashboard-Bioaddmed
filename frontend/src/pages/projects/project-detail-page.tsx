import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  addTaskChecklistItem,
  addTaskComment,
  applyToRecruitment,
  archiveProject,
  createProjectLink,
  createProjectMilestone,
  createProjectRisk,
  createRecruitmentOpening,
  createTask,
  deleteProjectLink,
  deleteProjectMilestone,
  deleteProjectRisk,
  deleteRecruitmentOpening,
  fetchProjectActivity,
  fetchProjectBoard,
  fetchProjectLinks,
  fetchProjectMilestones,
  fetchProjectOverview,
  fetchProjectRecruitment,
  fetchProjectRisks,
  fetchProjects,
  fetchTasks,
  moveTask,
  queryKeys,
  updateProjectLink,
  updateProjectMilestone,
  updateProjectRisk,
  updateRecruitmentOpening,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { KanbanBoard } from "@/components/common/kanban-board";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FolderKanban, Trophy, Users } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import type { KanbanColumn, Task } from "@/types/domain";

type ProjectTab = "overview" | "kanban" | "delivery" | "ops";

function domainError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 404) return "Element nie istnieje.";
    if (error.status === 409) return "Konflikt danych. Odswiez widok i sprobuj ponownie.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
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

function statusTone(status: string) {
  if (status === "at_risk") return "warning";
  if (status === "blocked") return "danger";
  if (status === "completed") return "success";
  return "default";
}

function statusNarrative(status: string, progressPercent: number) {
  if (status === "blocked") return "Projekt wymaga decyzji lub odblokowania krytycznej zaleznosci.";
  if (status === "at_risk") return "Tempo realizacji spada. Priorytetem jest redukcja ryzyk i pilnowanie ownerow.";
  if (status === "completed") return "Projekt jest zakonczony i gotowy do archiwizacji lub prezentacji wynikow.";
  if (progressPercent >= 70) return "Projekt jest w stabilnej fazie delivery i zmierza do domkniecia.";
  return "Projekt jest w budowie i potrzebuje mocnego rytmu operacyjnego.";
}

function milestoneTone(status: string) {
  if (status === "completed") return "success";
  if (status === "blocked") return "danger";
  if (status === "in_progress") return "warning";
  return "default";
}

function riskTone(status: string, severity: string) {
  if (status === "closed") return "success";
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "default";
}

function linkLabel(type: string) {
  if (type === "google_drive") return "Google Drive";
  if (type === "github") return "GitHub";
  if (type === "documentation") return "Dokumentacja";
  return type;
}

function tabLabel(tab: ProjectTab) {
  if (tab === "overview") return "Overview";
  if (tab === "kanban") return "Kanban";
  if (tab === "delivery") return "Delivery";
  return "Ops";
}

export function ProjectDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { slug } = useParams();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

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
  const { data: links = [] } = useQuery({
    queryKey: ["project-links", project?.id],
    queryFn: () => fetchProjectLinks(project!.id),
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
  const [linkForm, setLinkForm] = useState({ label: "", url: "", type: "github" });
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);

  const activeMemberCount = project?.memberships.filter((membership) => membership.is_active !== false).length ?? 0;
  const blockerCount = tasks.filter((task) => task.is_blocker || task.status === "blocked").length;
  const completedTaskCount = tasks.filter((task) => task.status === "done").length;
  const openRiskCount = risks.filter((risk) => risk.status !== "closed").length;
  const taskLookup = useMemo(() => Object.fromEntries(tasks.map((task) => [task.id, task])), [tasks]);
  const selectedTask = selectedTaskId ? taskLookup[selectedTaskId] ?? null : null;
  const coordinators = project?.memberships.filter((membership) => membership.project_role === "coordinator" && membership.is_active !== false) ?? [];

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) setSelectedTaskId(tasks[0].id);
  }, [selectedTaskId, tasks]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["project-board", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["tasks", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-overview", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-milestones", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-risks", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-recruitment", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-links", project?.id] }),
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
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie utworzyc taska.")),
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, columnId, order }: { taskId: number; columnId: number; order: number }) => moveTask(taskId, { column: columnId, order }),
    onMutate: ({ taskId, columnId, order }) => {
      const previous = columnsState;
      setColumnsState((current) => moveOptimistic(current, taskId, columnId, order));
      return { previous };
    },
    onError: (mutationError, _vars, ctx) => {
      setError(domainError(mutationError, "Nie udalo sie przeniesc taska."));
      if (ctx?.previous) setColumnsState(ctx.previous);
    },
    onSettled: async () => {
      await refresh();
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskComment(taskId, content),
    onSuccess: async (_data, vars) => {
      setCommentTextByTask((prev) => ({ ...prev, [vars.taskId]: "" }));
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac komentarza.")),
  });

  const checklistMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskChecklistItem(taskId, { content, is_done: false }),
    onSuccess: async (_data, vars) => {
      setChecklistTextByTask((prev) => ({ ...prev, [vars.taskId]: "" }));
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac checklisty.")),
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
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac milestone.")),
  });

  const createRiskMutation = useMutation({
    mutationFn: () => createProjectRisk(project!.id, riskForm),
    onSuccess: async () => {
      setRiskForm({ title: "", description: "", severity: "medium", status: "open" });
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac ryzyka.")),
  });

  const createOpeningMutation = useMutation({
    mutationFn: () =>
      createRecruitmentOpening(project!.id, {
        title: openingForm.title,
        description: openingForm.description,
        required_competencies: openingForm.competencies.split(",").map((value) => value.trim()).filter(Boolean),
      }),
    onSuccess: async () => {
      setOpeningForm({ title: "", description: "", competencies: "" });
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac rekrutacji.")),
  });

  const createLinkMutation = useMutation({
    mutationFn: () => createProjectLink(project!.id, { label: linkForm.label, url: linkForm.url, type: linkForm.type }),
    onSuccess: async () => {
      setLinkForm({ label: "", url: "", type: "github" });
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac linku.")),
  });

  const updateLinkMutation = useMutation({
    mutationFn: ({ linkId, payload }: { linkId: number; payload: { label?: string; url?: string; type?: string } }) =>
      updateProjectLink(project!.id, linkId, payload),
    onSuccess: async () => {
      setEditingLinkId(null);
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie zaktualizowac linku.")),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: number) => deleteProjectLink(project!.id, linkId),
    onSuccess: async () => {
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac linku.")),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveProject(project!.id),
    onSuccess: refresh,
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie zarchiwizowac projektu.")),
  });

  if (!project) return null;

  const tabCounts: Record<ProjectTab, number> = {
    overview: activity.length,
    kanban: tasks.length,
    delivery: milestones.length + risks.length,
    ops: recruitment.length + links.length,
  };

  return (
    <>
      <PageHeader eyebrow="Project Command" title={project.name} description={project.full_description ?? project.short_description} />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <SectionCard title="Project cockpit" description="To jest glowna narracja projektu: kondycja delivery, ownership, ryzyka i zrodla prawdy.">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-[30px] border border-white/30 bg-gradient-to-br from-white/85 via-cyan-50/70 to-sky-100/60 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:from-slate-950/90 dark:via-slate-900/80 dark:to-sky-950/50">
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                <Badge>{project.stage}</Badge>
                <Badge>{project.category}</Badge>
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.05em]">{project.progress_percent}% delivery progress</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{statusNarrative(project.status, project.progress_percent)}</p>
              <div className="mt-5 h-3 rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                <div className="h-3 rounded-full bg-accent transition-all" style={{ width: `${project.progress_percent}%` }} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {coordinators.map((membership) => (
                  <Badge key={membership.id} tone="warning">
                    lead: {membership.user_name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="tile-soft p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted">Open risks</p><p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{openRiskCount}</p><p className="mt-1 text-xs text-muted">ryzyk nadal wymaga uwagi</p></div>
              <div className="tile-soft p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted">Blockers</p><p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{blockerCount}</p><p className="mt-1 text-xs text-muted">taskow moze blokowac delivery</p></div>
              <div className="tile-soft p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted">Done</p><p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{completedTaskCount}</p><p className="mt-1 text-xs text-muted">taskow jest juz domknietych</p></div>
              <div className="tile-soft p-4"><p className="text-xs uppercase tracking-[0.18em] text-muted">Team</p><p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{activeMemberCount}</p><p className="mt-1 text-xs text-muted">aktywnych osob w projekcie</p></div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <StatCard label="Taski" value={overview?.stats?.total_tasks ?? tasks.length} detail="Laczna liczba zadan operacyjnych powiazanych z projektem." icon={<FolderKanban size={18} />} />
          <StatCard label="Zespol" value={overview?.stats?.members ?? activeMemberCount} detail="Aktywne przypisania projektowe oraz aktualny sklad delivery." icon={<Users size={18} />} />
          <StatCard label="Spotkania" value={overview?.stats?.meetings ?? 0} detail="Liczba spotkan wspierajacych rytm decyzji i delivery." icon={<Calendar size={18} />} />
          <StatCard label="Milestones" value={milestones.length} detail="Kamienie milowe, ktore buduja droge projektu do wyniku." icon={<Trophy size={18} />} tone={milestones.length > 0 ? "success" : "default"} />
        </div>
      </div>

      <div className="tile-panel hairline overflow-hidden p-3">
        <div className="grid gap-3 md:grid-cols-4">
          {(["overview", "kanban", "delivery", "ops"] as ProjectTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={[
                "rounded-[22px] border px-4 py-4 text-left transition",
                activeTab === tab ? "border-accent bg-accent/10 shadow-[0_18px_50px_rgba(14,165,233,0.12)]" : "border-transparent bg-white/70 hover:border-white/50 dark:bg-white/5 dark:hover:border-white/10",
              ].join(" ")}
              onClick={() => setActiveTab(tab)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{tabLabel(tab)}</p>
                  <p className="mt-1 text-xs text-muted">{tab === "overview" ? "Context, team i timeline" : tab === "kanban" ? "Board, taski i execution" : tab === "delivery" ? "Milestones i ryzyka" : "Recruitment, linki i archive"}</p>
                </div>
                <Badge>{tabCounts[tab]}</Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
          <SectionCard title="Project pulse" description="Najwazniejsze sygnaly projektu zebrane w jednym miejscu.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Opis roboczy</p>
                <p className="mt-3 text-sm leading-6 text-muted">{project.full_description ?? project.short_description}</p>
              </div>
              <div className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Health narrative</p>
                <p className="mt-3 text-sm leading-6 text-muted">{statusNarrative(project.status, project.progress_percent)}</p>
              </div>
              <div className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Lead ownership</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {coordinators.length > 0 ? coordinators.map((membership) => <Badge key={membership.id} tone="warning">{membership.user_name}</Badge>) : <Badge>brak koordynatora</Badge>}
                </div>
              </div>
              <div className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Kluczowe linki</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.length > 0 ? links.slice(0, 4).map((link) => <Badge key={link.id}>{linkLabel(link.type)}</Badge>) : <Badge>brak linkow</Badge>}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Core team" description="Widok ludzi osadzonych w projekcie i ich ról w delivery.">
            <div className="grid gap-3">
              {project.memberships.map((membership) => (
                <article key={membership.id} className="tile-soft flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{membership.user_name}</p>
                    <p className="mt-1 text-sm text-muted">{membership.user_email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={membership.project_role === "coordinator" ? "warning" : "default"}>{membership.project_role}</Badge>
                    {membership.is_active !== false ? <Badge tone="success">active</Badge> : <Badge tone="danger">inactive</Badge>}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Timeline projektu" description="Ostatni ruch projektu: logika, zmiany i sygnaly operacyjne.">
            <div className="space-y-4">
              {activity.slice(0, 10).map((item) => (
                <article key={item.id} className="tile-soft flex items-start gap-4 p-4">
                  <div className="mt-1 h-3 w-3 rounded-full bg-accent shadow-[0_0_0_6px_rgba(14,165,233,0.12)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <p className="font-semibold">{item.description}</p>
                      <Badge>{item.action_type}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">{new Date(item.created_at).toLocaleString("pl-PL")}</p>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "kanban" ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <SectionCard title="Delivery board" description="To jest realny kanban: poziome kolumny, bogate karty i jeden side rail do szybkiego operowania wybranym taskiem.">
            {isProjectMember ? (
              <>
                <div className="mb-4 grid gap-3 md:grid-cols-[1.2fr_1fr_.8fr_.8fr]">
                  <Input placeholder="Tytul taska" value={taskForm.title} onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))} />
                  <Input placeholder="Opis" value={taskForm.description} onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))} />
                  <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={taskForm.priority} onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="urgent">urgent</option>
                  </select>
                  <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={taskForm.assignee} onChange={(event) => setTaskForm((prev) => ({ ...prev, assignee: event.target.value }))}>
                    <option value="">Bez assignee</option>
                    {project.memberships.map((membership) => (
                      <option key={membership.id} value={membership.user}>
                        {membership.user_name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="mb-5 h-12"
                  disabled={!canManageProject || !taskForm.title}
                  onClick={() =>
                    createTaskMutation.mutate({
                      project: project.id,
                      column: columnsState[0]?.id,
                      title: taskForm.title,
                      description: taskForm.description,
                      priority: taskForm.priority,
                      assignee: taskForm.assignee ? Number(taskForm.assignee) : null,
                      status: "todo",
                    })
                  }
                >
                  Dodaj task do backlogu
                </Button>
                <KanbanBoard
                  columns={columnsState}
                  taskLookup={taskLookup}
                  selectedTaskId={selectedTaskId}
                  canDragTask={(taskId) => canMoveTask(taskId)}
                  onTaskSelect={setSelectedTaskId}
                  onTaskMove={({ taskId, columnId, order }) => {
                    if (!canMoveTask(taskId)) {
                      setError("Nie masz uprawnien do przesuwania tego taska.");
                      return;
                    }
                    moveTaskMutation.mutate({ taskId, columnId, order });
                  }}
                />
              </>
            ) : (
              <p className="text-sm text-muted">Dane operacyjne projektu sa dostepne tylko dla czlonkow zespolu.</p>
            )}
          </SectionCard>

          <SectionCard title="Task side rail" description="Jedno miejsce do szybkich komentarzy, checklist i czytania szczegolow wybranego taska.">
            {selectedTask ? (
              <div className="space-y-4">
                <div className="tile-soft p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={selectedTask.is_blocker ? "danger" : "default"}>{selectedTask.status}</Badge>
                    <Badge tone={selectedTask.priority === "urgent" ? "warning" : "default"}>{selectedTask.priority}</Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{selectedTask.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{selectedTask.description || "Brak dodatkowego opisu."}</p>
                  <p className="mt-3 text-xs text-muted">Assignee: {selectedTask.assignee_email ?? "bez assignee"}</p>
                </div>

                <div className="tile-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Komentarze</p>
                  <div className="mt-3 space-y-2">
                    {(selectedTask.comments ?? []).length > 0 ? (
                      (selectedTask.comments ?? []).map((comment) => (
                        <div key={comment.id} className="rounded-[18px] bg-white/80 px-3 py-3 text-sm dark:bg-white/5">
                          <p>{comment.content}</p>
                          <p className="mt-1 text-xs text-muted">{comment.author_email ?? "system"} • {new Date(comment.created_at).toLocaleString("pl-PL")}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Brak komentarzy.</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input placeholder="Dodaj komentarz" value={commentTextByTask[selectedTask.id] ?? ""} onChange={(event) => setCommentTextByTask((prev) => ({ ...prev, [selectedTask.id]: event.target.value }))} />
                    <Button variant="secondary" onClick={() => commentMutation.mutate({ taskId: selectedTask.id, content: commentTextByTask[selectedTask.id] ?? "" })} disabled={!commentTextByTask[selectedTask.id]}>
                      Dodaj
                    </Button>
                  </div>
                </div>

                <div className="tile-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Checklist</p>
                  <div className="mt-3 space-y-2">
                    {(selectedTask.checklist_items ?? []).length > 0 ? (
                      (selectedTask.checklist_items ?? []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-[18px] bg-white/80 px-3 py-3 text-sm dark:bg-white/5">
                          <span>{item.content}</span>
                          <Badge tone={item.is_done ? "success" : "default"}>{item.is_done ? "done" : "todo"}</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Brak checklisty.</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input placeholder="Dodaj element checklisty" value={checklistTextByTask[selectedTask.id] ?? ""} onChange={(event) => setChecklistTextByTask((prev) => ({ ...prev, [selectedTask.id]: event.target.value }))} />
                    <Button variant="secondary" onClick={() => checklistMutation.mutate({ taskId: selectedTask.id, content: checklistTextByTask[selectedTask.id] ?? "" })} disabled={!checklistTextByTask[selectedTask.id]}>
                      Dodaj
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Wybierz task z tablicy, zeby zobaczyc jego szczegoly.</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "delivery" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard title="Milestones" description="Kamienie milowe powinny byc czytelne jako linia dojscia do wyniku, a nie tylko lista dat.">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <Input placeholder="Tytul milestone" value={milestoneForm.title} onChange={(event) => setMilestoneForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input type="date" value={milestoneForm.due_date} onChange={(event) => setMilestoneForm((prev) => ({ ...prev, due_date: event.target.value }))} />
              <Input type="number" min={0} max={100} value={milestoneForm.progress_percent} onChange={(event) => setMilestoneForm((prev) => ({ ...prev, progress_percent: event.target.value }))} />
            </div>
            <Button className="mb-5 h-12" disabled={!canManageProject || !milestoneForm.title} onClick={() => createMilestoneMutation.mutate()}>
              Dodaj milestone
            </Button>
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <article key={milestone.id} className="tile-soft p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={milestoneTone(milestone.status)}>{milestone.status}</Badge>
                        <Badge>{milestone.progress_percent}%</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold">{milestone.title}</h3>
                      <p className="mt-2 text-sm text-muted">{milestone.description || "Brak dodatkowego opisu milestone."}</p>
                      <p className="mt-2 text-xs text-muted">Due: {milestone.due_date ? new Date(milestone.due_date).toLocaleDateString("pl-PL") : "brak"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" disabled={!canManageProject} onClick={() => updateProjectMilestone(project.id, milestone.id, { status: "completed", progress_percent: 100 }).then(refresh).catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie zaktualizowac milestone.")))}>
                        Complete
                      </Button>
                      <Button variant="ghost" disabled={!canManageProject} onClick={() => deleteProjectMilestone(project.id, milestone.id).then(refresh).catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac milestone.")))}>
                        Usun
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Ryzyka" description="Ryzyka powinny byc prowadzone jako aktywne ownership, severity i stan reakcji.">
            <div className="mb-4 space-y-3">
              <Input placeholder="Tytul ryzyka" value={riskForm.title} onChange={(event) => setRiskForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Opis ryzyka" value={riskForm.description} onChange={(event) => setRiskForm((prev) => ({ ...prev, description: event.target.value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={riskForm.severity} onChange={(event) => setRiskForm((prev) => ({ ...prev, severity: event.target.value }))}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
                <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={riskForm.status} onChange={(event) => setRiskForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="open">open</option>
                  <option value="monitored">monitored</option>
                  <option value="mitigated">mitigated</option>
                  <option value="closed">closed</option>
                </select>
              </div>
            </div>
            <Button className="mb-5 h-12" disabled={!canManageProject || !riskForm.title || !riskForm.description} onClick={() => createRiskMutation.mutate()}>
              Dodaj ryzyko
            </Button>
            <div className="space-y-4">
              {risks.map((risk) => (
                <article key={risk.id} className="tile-soft p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={riskTone(risk.status, risk.severity)}>{risk.severity}</Badge>
                        <Badge tone={risk.status === "closed" ? "success" : "default"}>{risk.status}</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold">{risk.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{risk.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" disabled={!canManageProject} onClick={() => updateProjectRisk(project.id, risk.id, { status: "closed" }).then(refresh).catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie zamknac ryzyka.")))}>
                        Zamknij
                      </Button>
                      <Button variant="ghost" disabled={!canManageProject} onClick={() => deleteProjectRisk(project.id, risk.id).then(refresh).catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac ryzyka.")))}>
                        Usun
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "ops" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard title="Link hub" description="Zrodla prawdy projektu: repo, drive, dokumentacja i inne wejscia operacyjne.">
            {canManageProject ? (
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Input placeholder="Etykieta" value={linkForm.label} onChange={(event) => setLinkForm((prev) => ({ ...prev, label: event.target.value }))} />
                <Input placeholder="URL" value={linkForm.url} onChange={(event) => setLinkForm((prev) => ({ ...prev, url: event.target.value }))} />
                <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={linkForm.type} onChange={(event) => setLinkForm((prev) => ({ ...prev, type: event.target.value }))}>
                  <option value="github">github</option>
                  <option value="google_drive">google_drive</option>
                  <option value="documentation">documentation</option>
                  <option value="other">other</option>
                </select>
                <div className="md:col-span-3">
                  <Button className="h-12 w-full" disabled={!linkForm.label || !linkForm.url} onClick={() => createLinkMutation.mutate()}>
                    Dodaj link
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {links.map((link) => (
                <article key={link.id} className="tile-soft p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{linkLabel(link.type)}</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold">{link.label}</h3>
                      <a className="mt-2 inline-flex text-sm text-accent underline" href={link.url} target="_blank" rel="noreferrer">
                        {link.url}
                      </a>
                    </div>
                    {canManageProject ? (
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setEditingLinkId(editingLinkId === link.id ? null : link.id)}>
                          {editingLinkId === link.id ? "Zamknij" : "Edytuj"}
                        </Button>
                        <Button variant="ghost" onClick={() => deleteLinkMutation.mutate(link.id)}>
                          Usun
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {canManageProject && editingLinkId === link.id ? (
                    <div className="mt-4 grid gap-2">
                      <Input defaultValue={link.label} onBlur={(event) => updateLinkMutation.mutate({ linkId: link.id, payload: { label: event.target.value } })} />
                      <Input defaultValue={link.url} onBlur={(event) => updateLinkMutation.mutate({ linkId: link.id, payload: { url: event.target.value } })} />
                    </div>
                  ) : null}
                </article>
              ))}
              {links.length === 0 ? <p className="text-sm text-muted">Brak linkow projektu.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Recruitment i archive" description="Role do obsadzenia, aplikacje oraz operacja archiwizacji projektu.">
            <div className="mb-4 space-y-3">
              <Input placeholder="Tytul roli" value={openingForm.title} onChange={(event) => setOpeningForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Opis roli" value={openingForm.description} onChange={(event) => setOpeningForm((prev) => ({ ...prev, description: event.target.value }))} />
              <Input placeholder="Kompetencje (przecinkami)" value={openingForm.competencies} onChange={(event) => setOpeningForm((prev) => ({ ...prev, competencies: event.target.value }))} />
              <Button className="h-12" disabled={!canManageProject || !openingForm.title || !openingForm.description} onClick={() => createOpeningMutation.mutate()}>
                Dodaj otwarcie
              </Button>
            </div>

            <div className="space-y-4">
              {recruitment.map((opening) => {
                const form = applyByOpening[opening.id] ?? { motivation: "", availability_note: "" };
                return (
                  <article key={opening.id} className="tile-soft p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={opening.is_open ? "success" : "default"}>{opening.is_open ? "open" : "closed"}</Badge>
                          <Badge>{opening.required_competencies.length} kompetencji</Badge>
                        </div>
                        <h3 className="mt-3 font-semibold">{opening.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">{opening.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" disabled={!canManageProject} onClick={() => updateRecruitmentOpening(project.id, opening.id, { is_open: !opening.is_open }).then(refresh).catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie zaktualizowac rekrutacji.")))}>
                          {opening.is_open ? "Zamknij" : "Otworz"}
                        </Button>
                        <Button variant="ghost" disabled={!canManageProject} onClick={() => deleteRecruitmentOpening(project.id, opening.id).then(refresh).catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac rekrutacji.")))}>
                          Usun
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[20px] bg-white/80 p-4 dark:bg-white/5">
                      <Input placeholder="Motywacja" value={form.motivation} onChange={(event) => setApplyByOpening((prev) => ({ ...prev, [opening.id]: { ...form, motivation: event.target.value } }))} />
                      <Input className="mt-2" placeholder="Dostepnosc" value={form.availability_note} onChange={(event) => setApplyByOpening((prev) => ({ ...prev, [opening.id]: { ...form, availability_note: event.target.value } }))} />
                      <Button className="mt-3" disabled={!opening.is_open} onClick={() => applyToRecruitment(project.id, opening.id, form).then(refresh).catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie wyslac aplikacji.")))}>
                        Aplikuj
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 tile-soft p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Archive operation</p>
              <p className="mt-3 text-sm leading-6 text-muted">Archiwizacja jest operacja administracyjna. Powinna byc widoczna, ale odseparowana od codziennej pracy delivery.</p>
              <Button className="mt-4" disabled={!canManageProject || project.status === "archived"} onClick={() => archiveMutation.mutate()}>
                Zarchiwizuj projekt
              </Button>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </>
  );
}
