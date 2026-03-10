import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  addProjectMember,
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
  deleteProjectMember,
  deleteProjectMilestone,
  deleteProjectRisk,
  deleteRecruitmentOpening,
  fetchProjectActivity,
  fetchProjectBoard,
  fetchProjectKnowledge,
  fetchProjectLinks,
  fetchProjectMeetings,
  fetchProjectMembers,
  fetchProjectMilestones,
  fetchProjectOverview,
  fetchProjectRecruitment,
  fetchProjectRisks,
  fetchProjects,
  fetchTasks,
  fetchUsers,
  moveTask,
  queryKeys,
  updateProject,
  updateProjectLink,
  updateProjectMember,
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
import { BookOpen, Calendar, FolderKanban, RadioTower, Settings2, Trophy, Users } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import type { KanbanColumn, KnowledgeArticle, Meeting, ProjectMembership, Task, User } from "@/types/domain";

type ProjectTab = "overview" | "kanban" | "delivery" | "people" | "files" | "activity" | "settings";

type TimelineItem = {
  id: string;
  tone: "default" | "warning" | "danger" | "success";
  label: string;
  title: string;
  description: string;
  createdAt: string;
};

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
  if (status === "at_risk") return "Tempo delivery spada. Priorytetem jest mocniejszy ownership i redukcja ryzyk.";
  if (status === "completed") return "Projekt jest zakonczony i gotowy do archiwizacji lub prezentacji wynikow.";
  if (progressPercent >= 70) return "Projekt jest w stabilnej fazie execution i zmierza do domkniecia.";
  return "Projekt jest w budowie i potrzebuje jasnego rytmu operacyjnego.";
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
  return "Inny link";
}

function formatDate(value?: string | null) {
  if (!value) return "brak";
  return new Date(value).toLocaleDateString("pl-PL");
}

function formatDateTime(value?: string | null) {
  if (!value) return "brak";
  return new Date(value).toLocaleString("pl-PL");
}

function tabMeta(tab: ProjectTab) {
  if (tab === "overview") return { title: "Overview", description: "Executive summary, health i rytm projektu", icon: <Trophy size={16} /> };
  if (tab === "kanban") return { title: "Kanban", description: "Board delivery z task side rail", icon: <FolderKanban size={16} /> };
  if (tab === "delivery") return { title: "Delivery", description: "Milestones, ryzyka i plan dowozu", icon: <Calendar size={16} /> };
  if (tab === "people") return { title: "People", description: "Zespol, role i recruitment pipeline", icon: <Users size={16} /> };
  if (tab === "files") return { title: "Files", description: "Hub repo, drive, dokumentow i wiedzy", icon: <BookOpen size={16} /> };
  if (tab === "activity") return { title: "Activity", description: "Pelny timeline sygnalow projektu", icon: <RadioTower size={16} /> };
  return { title: "Settings", description: "Sterowanie projektem, metadata i archive", icon: <Settings2 size={16} /> };
}

function memberInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("");
}

function timelineToneFromLabel(label: string): TimelineItem["tone"] {
  if (label === "Ryzyko" || label === "Blokada") return "danger";
  if (label === "Spotkanie" || label === "Milestone") return "warning";
  if (label === "Dokument" || label === "Komentarz") return "success";
  return "default";
}

function buildTimeline(activity: Array<{ id: number; action_type: string; description: string; created_at: string }>, meetings: Meeting[], articles: KnowledgeArticle[], tasks: Task[]) {
  const activityItems: TimelineItem[] = activity.map((item) => ({
    id: `activity-${item.id}`,
    label: "Operacja",
    title: item.action_type,
    description: item.description,
    createdAt: item.created_at,
    tone: timelineToneFromLabel("Operacja"),
  }));

  const meetingItems: TimelineItem[] = meetings.map((meeting) => ({
    id: `meeting-${meeting.id}`,
    label: "Spotkanie",
    title: meeting.title,
    description: meeting.description || "Spotkanie projektowe.",
    createdAt: meeting.start_at,
    tone: timelineToneFromLabel("Spotkanie"),
  }));

  const articleItems: TimelineItem[] = articles.map((article) => ({
    id: `article-${article.id}`,
    label: "Dokument",
    title: article.title,
    description: article.category,
    createdAt: article.updated_at,
    tone: timelineToneFromLabel("Dokument"),
  }));

  const commentItems: TimelineItem[] = tasks.flatMap((task) =>
    (task.comments ?? []).map((comment) => ({
      id: `comment-${comment.id}`,
      label: "Komentarz",
      title: task.title,
      description: comment.content,
      createdAt: comment.created_at,
      tone: timelineToneFromLabel("Komentarz"),
    })),
  );

  return [...activityItems, ...meetingItems, ...articleItems, ...commentItems].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function memberStats(members: ProjectMembership[]) {
  const activeMembers = members.filter((member) => member.is_active !== false);
  return {
    total: activeMembers.length,
    coordinators: activeMembers.filter((member) => member.project_role === "coordinator").length,
    contributors: activeMembers.filter((member) => member.project_role !== "coordinator").length,
  };
}

export function ProjectDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { slug } = useParams();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const [taskForm, setTaskForm] = useState({ title: "", description: "", priority: "medium", assignee: "" });
  const [commentTextByTask, setCommentTextByTask] = useState<Record<number, string>>({});
  const [checklistTextByTask, setChecklistTextByTask] = useState<Record<number, string>>({});
  const [milestoneForm, setMilestoneForm] = useState({ title: "", due_date: "", progress_percent: "0" });
  const [riskForm, setRiskForm] = useState({ title: "", description: "", severity: "medium", status: "open" });
  const [openingForm, setOpeningForm] = useState({ title: "", description: "", competencies: "" });
  const [applyByOpening, setApplyByOpening] = useState<Record<number, { motivation: string; availability_note: string }>>({});
  const [linkForm, setLinkForm] = useState({ label: "", url: "", type: "github" });
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    short_description: "",
    full_description: "",
    status: "active",
    stage: "idea",
    progress_percent: "0",
  });
  const [memberForm, setMemberForm] = useState({ user: "", project_role: "member" as ProjectMembership["project_role"] });

  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const project = useMemo(() => projects.find((item) => item.slug === slug) ?? projects[0], [projects, slug]);

  const activeMembership = project?.memberships.find((item) => item.user === user?.id && item.is_active !== false);
  const isAdmin = user?.global_role === "admin";
  const isProjectMember = Boolean(isAdmin || activeMembership);
  const canManageProject = Boolean(isAdmin || activeMembership?.project_role === "coordinator");

  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers, enabled: Boolean(canManageProject) });
  const { data: overview } = useQuery({
    queryKey: ["project-overview", project?.id],
    queryFn: () => fetchProjectOverview(project!.id),
    enabled: Boolean(project?.id),
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
  const { data: projectMembers = [] } = useQuery({
    queryKey: ["project-members", project?.id],
    queryFn: () => fetchProjectMembers(project!.id),
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
  const { data: meetings = [] } = useQuery({
    queryKey: ["project-meetings", project?.id],
    queryFn: () => fetchProjectMeetings(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });
  const { data: knowledge = [] } = useQuery({
    queryKey: ["project-knowledge", project?.id],
    queryFn: () => fetchProjectKnowledge(project!.id),
    enabled: Boolean(project?.id && isProjectMember),
  });

  const [columnsState, setColumnsState] = useState<KanbanColumn[]>([]);
  useEffect(() => {
    setColumnsState(board?.columns ?? []);
  }, [board]);

  useEffect(() => {
    if (project) {
      setSettingsForm({
        short_description: project.short_description ?? "",
        full_description: project.full_description ?? "",
        status: project.status ?? "active",
        stage: project.stage ?? "idea",
        progress_percent: String(project.progress_percent ?? 0),
      });
    }
  }, [project]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: ["project-overview", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-activity", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-board", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["tasks", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-milestones", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-members", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-risks", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-recruitment", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-links", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-meetings", project?.id] }),
      queryClient.invalidateQueries({ queryKey: ["project-knowledge", project?.id] }),
    ]);
  };

  const taskLookup = useMemo(() => Object.fromEntries(tasks.map((task) => [task.id, task])), [tasks]);
  const selectedTask = selectedTaskId ? taskLookup[selectedTaskId] ?? null : null;
  const timeline = useMemo(() => buildTimeline(activity, meetings, knowledge, tasks), [activity, knowledge, meetings, tasks]);
  const memberSummary = useMemo(() => memberStats(projectMembers), [projectMembers]);

  const activeMemberCount = projectMembers.filter((membership) => membership.is_active !== false).length;
  const blockerCount = tasks.filter((task) => task.is_blocker || task.status === "blocked").length;
  const openRiskCount = risks.filter((risk) => risk.status !== "closed").length;
  const driveLinks = links.filter((link) => link.type === "google_drive");
  const repoLinks = links.filter((link) => link.type === "github");
  const availableUsers = users.filter((candidate) => !projectMembers.some((member) => member.user === candidate.id));
  const coordinators = projectMembers.filter((member) => member.project_role === "coordinator" && member.is_active !== false);

  useEffect(() => {
    if (!selectedTaskId && tasks.length > 0) setSelectedTaskId(tasks[0].id);
  }, [selectedTaskId, tasks]);

  const canMoveTask = (taskId: number) => {
    if (canManageProject) return true;
    const task = tasks.find((item) => item.id === taskId);
    return Boolean(task && task.assignee === user?.id);
  };

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async () => {
      setTaskForm({ title: "", description: "", priority: "medium", assignee: "" });
      setFeedback("Task zostal dodany do backlogu.");
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
    onError: (mutationError, _vars, context) => {
      setError(domainError(mutationError, "Nie udalo sie przeniesc taska."));
      if (context?.previous) setColumnsState(context.previous);
    },
    onSettled: refresh,
  });

  const commentMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskComment(taskId, content),
    onSuccess: async (_payload, variables) => {
      setCommentTextByTask((previous) => ({ ...previous, [variables.taskId]: "" }));
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac komentarza.")),
  });

  const checklistMutation = useMutation({
    mutationFn: ({ taskId, content }: { taskId: number; content: string }) => addTaskChecklistItem(taskId, { content, is_done: false }),
    onSuccess: async (_payload, variables) => {
      setChecklistTextByTask((previous) => ({ ...previous, [variables.taskId]: "" }));
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
        required_competencies: openingForm.competencies
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
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
      setEditingLinkId(null);
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac linku.")),
  });

  const updateLinkMutation = useMutation({
    mutationFn: ({ linkId, payload }: { linkId: number; payload: { label?: string; url?: string; type?: string } }) =>
      updateProjectLink(project!.id, linkId, payload),
    onSuccess: refresh,
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie zaktualizowac linku.")),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: number) => deleteProjectLink(project!.id, linkId),
    onSuccess: refresh,
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac linku.")),
  });

  const addMemberMutation = useMutation({
    mutationFn: () => addProjectMember(project!.id, { user: Number(memberForm.user), project_role: memberForm.project_role }),
    onSuccess: async () => {
      setMemberForm({ user: "", project_role: "member" });
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie dodac czlonka projektu.")),
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ membershipId, payload }: { membershipId: number; payload: Partial<{ project_role: ProjectMembership["project_role"]; is_active: boolean }> }) =>
      updateProjectMember(project!.id, membershipId, payload),
    onSuccess: refresh,
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie zaktualizowac czlonka projektu.")),
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (membershipId: number) => deleteProjectMember(project!.id, membershipId),
    onSuccess: refresh,
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac czlonka projektu.")),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      updateProject(project!.id, {
        short_description: settingsForm.short_description,
        full_description: settingsForm.full_description,
        status: settingsForm.status,
        stage: settingsForm.stage,
        progress_percent: Number(settingsForm.progress_percent) || 0,
      }),
    onSuccess: async () => {
      setFeedback("Ustawienia projektu zostaly zapisane.");
      setError(null);
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie zapisac ustawien projektu.")),
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveProject(project!.id),
    onSuccess: async () => {
      setFeedback("Projekt zostal zarchiwizowany.");
      setError(null);
      await refresh();
    },
    onError: (mutationError) => setError(domainError(mutationError, "Nie udalo sie zarchiwizowac projektu.")),
  });

  if (!project) return null;

  const tabCounts: Record<ProjectTab, number> = {
    overview: timeline.length,
    kanban: tasks.length,
    delivery: milestones.length + risks.length,
    people: projectMembers.length + recruitment.length,
    files: links.length + knowledge.length,
    activity: timeline.length,
    settings: 2,
  };

  return (
    <>
      <PageHeader
        eyebrow="Project Detail"
        title={project.name}
        description={project.full_description ?? project.short_description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={statusTone(project.status)}>{project.status}</Badge>
            <Badge>{project.stage}</Badge>
            <Badge>{project.category}</Badge>
          </div>
        }
      />

      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <SectionCard title="Project cockpit" description="Jedno spojrzenie na health projektu, ownership, blockers i najwazniejsze punkty kontroli.">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-[30px] border border-white/30 bg-gradient-to-br from-white/85 via-cyan-50/70 to-sky-100/60 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] dark:border-white/10 dark:from-slate-950/90 dark:via-slate-900/80 dark:to-sky-950/50">
              <div className="flex flex-wrap gap-2">
                <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                <Badge>{project.stage}</Badge>
                <Badge>{project.project_type ?? "research"}</Badge>
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
                {coordinators.length === 0 ? <Badge tone="danger">brak wskazanego ownera delivery</Badge> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Open risks</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{openRiskCount}</p>
                <p className="mt-1 text-xs text-muted">ryzyk wymaga stalej kontroli</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Blockers</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{blockerCount}</p>
                <p className="mt-1 text-xs text-muted">taskow moze spowalniac delivery</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Team</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{activeMemberCount}</p>
                <p className="mt-1 text-xs text-muted">aktywnych osob w projekcie</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Signal flow</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{timeline.length}</p>
                <p className="mt-1 text-xs text-muted">ostatnich sygnalow i zmian</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
          <StatCard label="Taski" value={overview?.stats?.total_tasks ?? tasks.length} detail="Laczna liczba zadan operacyjnych powiazanych z projektem." icon={<FolderKanban size={18} />} />
          <StatCard label="Zespol" value={overview?.stats?.members ?? activeMemberCount} detail="Aktywne przypisania projektowe oraz aktualny sklad delivery." icon={<Users size={18} />} />
          <StatCard label="Spotkania" value={overview?.stats?.meetings ?? meetings.length} detail="Spotkania wspierajace rytm decyzji, follow-up i execution." icon={<Calendar size={18} />} />
          <StatCard label="Knowledge" value={knowledge.length} detail="Dokumenty i artefakty projektu dostepne dla zespolu." icon={<BookOpen size={18} />} tone={knowledge.length > 0 ? "success" : "default"} />
        </div>
      </div>

      <div className="tile-panel hairline overflow-hidden p-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {(["overview", "kanban", "delivery", "people", "files", "activity", "settings"] as ProjectTab[]).map((tab) => {
            const meta = tabMeta(tab);
            return (
              <button
                key={tab}
                type="button"
                className={[
                  "rounded-[24px] border px-4 py-4 text-left transition",
                  activeTab === tab
                    ? "border-accent bg-accent/10 shadow-[0_18px_50px_rgba(14,165,233,0.18)]"
                    : "border-white/25 bg-white/65 hover:border-accent/30 hover:bg-white/85 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                ].join(" ")}
                onClick={() => setActiveTab(tab)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-accent shadow-sm dark:bg-white/10">{meta.icon}</span>
                  <Badge>{tabCounts[tab]}</Badge>
                </div>
                <h3 className="mt-4 text-sm font-semibold tracking-[-0.02em]">{meta.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
          <SectionCard title="Executive summary" description="Najwazniejsze fakty o projekcie dla osoby, ktora wchodzi do niego po raz pierwszy lub wraca po kilku dniach.">
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Delivery posture</p>
                <h3 className="mt-3 text-xl font-semibold">Jak wyglada dowoz teraz</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{statusNarrative(project.status, project.progress_percent)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                  <Badge>{project.stage}</Badge>
                  <Badge>{project.progress_percent}% progress</Badge>
                </div>
              </article>

              <article className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Upcoming control points</p>
                <div className="mt-3 space-y-3">
                  {milestones.slice(0, 3).map((milestone) => (
                    <div key={milestone.id} className="rounded-[18px] bg-white/80 px-4 py-3 dark:bg-white/5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{milestone.title}</p>
                        <Badge tone={milestoneTone(milestone.status)}>{milestone.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">Due: {formatDate(milestone.due_date)}</p>
                    </div>
                  ))}
                  {milestones.length === 0 ? <p className="text-sm text-muted">Brak milestone zapisanych w planie projektu.</p> : null}
                </div>
              </article>

              <article className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Source of truth</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] bg-white/80 px-4 py-3 dark:bg-white/5">
                    <p className="text-xs text-muted">Repo</p>
                    <p className="mt-2 text-lg font-semibold">{repoLinks.length}</p>
                  </div>
                  <div className="rounded-[18px] bg-white/80 px-4 py-3 dark:bg-white/5">
                    <p className="text-xs text-muted">Drive</p>
                    <p className="mt-2 text-lg font-semibold">{driveLinks.length}</p>
                  </div>
                  <div className="rounded-[18px] bg-white/80 px-4 py-3 dark:bg-white/5">
                    <p className="text-xs text-muted">Knowledge docs</p>
                    <p className="mt-2 text-lg font-semibold">{knowledge.length}</p>
                  </div>
                  <div className="rounded-[18px] bg-white/80 px-4 py-3 dark:bg-white/5">
                    <p className="text-xs text-muted">Meetings</p>
                    <p className="mt-2 text-lg font-semibold">{meetings.length}</p>
                  </div>
                </div>
              </article>

              <article className="tile-soft p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Leadership</p>
                <div className="mt-3 space-y-3">
                  {coordinators.map((membership) => (
                    <div key={membership.id} className="flex items-center gap-3 rounded-[18px] bg-white/80 px-4 py-3 dark:bg-white/5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-sm font-semibold text-accent">{memberInitials(membership.user_name)}</div>
                      <div>
                        <p className="font-medium">{membership.user_name}</p>
                        <p className="text-xs text-muted">{membership.user_email}</p>
                      </div>
                    </div>
                  ))}
                  {coordinators.length === 0 ? <p className="text-sm text-muted">Brak przypisanego koordynatora projektu.</p> : null}
                </div>
              </article>
            </div>
          </SectionCard>

          <SectionCard title="Recent timeline" description="Szybki wycinek ostatnich zmian w projekcie bez przechodzenia do osobnej zakladki aktywnosci.">
            <div className="space-y-3">
              {timeline.slice(0, 8).map((item) => (
                <article key={item.id} className="tile-soft p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={item.tone}>{item.label}</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                    </div>
                    <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                  </div>
                </article>
              ))}
              {timeline.length === 0 ? <p className="text-sm text-muted">Brak historii aktywnosci dla tego projektu.</p> : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "kanban" ? (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <SectionCard title="Execution board" description="Prawdziwa tablica delivery z wyraznymi kolumnami, ruchem kart i szybkim dodawaniem pracy do backlogu.">
            {isProjectMember ? (
              <>
                <div className="mb-5 grid gap-3 md:grid-cols-[1.1fr_1.1fr_.8fr_.8fr_auto]">
                  <Input placeholder="Tytul taska" value={taskForm.title} onChange={(event) => setTaskForm((previous) => ({ ...previous, title: event.target.value }))} />
                  <Input placeholder="Opis taska" value={taskForm.description} onChange={(event) => setTaskForm((previous) => ({ ...previous, description: event.target.value }))} />
                  <select
                    className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                    value={taskForm.priority}
                    onChange={(event) => setTaskForm((previous) => ({ ...previous, priority: event.target.value }))}
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="urgent">urgent</option>
                  </select>
                  <select
                    className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                    value={taskForm.assignee}
                    onChange={(event) => setTaskForm((previous) => ({ ...previous, assignee: event.target.value }))}
                  >
                    <option value="">bez assignee</option>
                    {projectMembers.map((member) => (
                      <option key={member.id} value={member.user}>
                        {member.user_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="h-12"
                    disabled={!canManageProject || !taskForm.title || !columnsState[0]?.id}
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
                    Dodaj task
                  </Button>
                </div>

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

          <SectionCard title="Task side rail" description="Szczegoly, komentarze i checklista wybranego taska bez gubienia kontekstu boardu.">
            {selectedTask ? (
              <div className="space-y-4">
                <div className="tile-soft p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={selectedTask.is_blocker ? "danger" : "default"}>{selectedTask.status}</Badge>
                    <Badge tone={selectedTask.priority === "urgent" ? "warning" : "default"}>{selectedTask.priority}</Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{selectedTask.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{selectedTask.description || "Brak dodatkowego opisu."}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-white/80 px-4 py-3 text-sm dark:bg-white/5">
                      <p className="text-xs text-muted">Assignee</p>
                      <p className="mt-1 font-medium">{selectedTask.assignee_email ?? "bez assignee"}</p>
                    </div>
                    <div className="rounded-[18px] bg-white/80 px-4 py-3 text-sm dark:bg-white/5">
                      <p className="text-xs text-muted">Due date</p>
                      <p className="mt-1 font-medium">{formatDate(selectedTask.due_date)}</p>
                    </div>
                  </div>
                </div>

                <div className="tile-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Komentarze</p>
                  <div className="mt-3 space-y-2">
                    {(selectedTask.comments ?? []).length > 0 ? (
                      (selectedTask.comments ?? []).map((comment) => (
                        <div key={comment.id} className="rounded-[18px] bg-white/80 px-3 py-3 text-sm dark:bg-white/5">
                          <p>{comment.content}</p>
                          <p className="mt-1 text-xs text-muted">
                            {comment.author_email ?? "system"} | {formatDateTime(comment.created_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Brak komentarzy.</p>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Input
                      placeholder="Dodaj komentarz"
                      value={commentTextByTask[selectedTask.id] ?? ""}
                      onChange={(event) => setCommentTextByTask((previous) => ({ ...previous, [selectedTask.id]: event.target.value }))}
                    />
                    <Button
                      variant="secondary"
                      disabled={!commentTextByTask[selectedTask.id]}
                      onClick={() => commentMutation.mutate({ taskId: selectedTask.id, content: commentTextByTask[selectedTask.id] ?? "" })}
                    >
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
                    <Input
                      placeholder="Dodaj element checklisty"
                      value={checklistTextByTask[selectedTask.id] ?? ""}
                      onChange={(event) => setChecklistTextByTask((previous) => ({ ...previous, [selectedTask.id]: event.target.value }))}
                    />
                    <Button
                      variant="secondary"
                      disabled={!checklistTextByTask[selectedTask.id]}
                      onClick={() => checklistMutation.mutate({ taskId: selectedTask.id, content: checklistTextByTask[selectedTask.id] ?? "" })}
                    >
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
          <SectionCard title="Milestones" description="Kamienie milowe powinny byc czytelna linia dojscia do wyniku, a nie tylko lista dat.">
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <Input placeholder="Tytul milestone" value={milestoneForm.title} onChange={(event) => setMilestoneForm((previous) => ({ ...previous, title: event.target.value }))} />
              <Input type="date" value={milestoneForm.due_date} onChange={(event) => setMilestoneForm((previous) => ({ ...previous, due_date: event.target.value }))} />
              <Input type="number" min={0} max={100} value={milestoneForm.progress_percent} onChange={(event) => setMilestoneForm((previous) => ({ ...previous, progress_percent: event.target.value }))} />
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
                      <p className="mt-2 text-xs text-muted">Due: {formatDate(milestone.due_date)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        disabled={!canManageProject}
                        onClick={() =>
                          updateProjectMilestone(project.id, milestone.id, { status: "completed", progress_percent: 100 })
                            .then(refresh)
                            .catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie zaktualizowac milestone.")))
                        }
                      >
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!canManageProject}
                        onClick={() =>
                          deleteProjectMilestone(project.id, milestone.id)
                            .then(refresh)
                            .catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac milestone.")))
                        }
                      >
                        Usun
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
              {milestones.length === 0 ? <p className="text-sm text-muted">Brak milestone dla tego projektu.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Ryzyka" description="Ryzyka powinny byc prowadzone jako ownership, severity i stan reakcji.">
            <div className="mb-4 space-y-3">
              <Input placeholder="Tytul ryzyka" value={riskForm.title} onChange={(event) => setRiskForm((previous) => ({ ...previous, title: event.target.value }))} />
              <Input placeholder="Opis ryzyka" value={riskForm.description} onChange={(event) => setRiskForm((previous) => ({ ...previous, description: event.target.value }))} />
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={riskForm.severity}
                  onChange={(event) => setRiskForm((previous) => ({ ...previous, severity: event.target.value }))}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={riskForm.status}
                  onChange={(event) => setRiskForm((previous) => ({ ...previous, status: event.target.value }))}
                >
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
                      <Button
                        variant="secondary"
                        disabled={!canManageProject}
                        onClick={() =>
                          updateProjectRisk(project.id, risk.id, { status: "closed" })
                            .then(refresh)
                            .catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie zamknac ryzyka.")))
                        }
                      >
                        Zamknij
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!canManageProject}
                        onClick={() =>
                          deleteProjectRisk(project.id, risk.id)
                            .then(refresh)
                            .catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac ryzyka.")))
                        }
                      >
                        Usun
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
              {risks.length === 0 ? <p className="text-sm text-muted">Brak ryzyk otwartych w tym projekcie.</p> : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "people" ? (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <SectionCard title="Team map" description="Widok ludzi projektu z rolami, aktywnoscia i mozliwoscia zarzadzania skladem zespolu.">
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">People</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{memberSummary.total}</p>
                <p className="mt-1 text-xs text-muted">aktywnych osob</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Coordinators</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{memberSummary.coordinators}</p>
                <p className="mt-1 text-xs text-muted">ownerow delivery</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Contributors</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{memberSummary.contributors}</p>
                <p className="mt-1 text-xs text-muted">aktywnych wykonawcow</p>
              </div>
            </div>

            {canManageProject ? (
              <div className="mb-5 grid gap-3 md:grid-cols-[1.2fr_.8fr_auto]">
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={memberForm.user}
                  onChange={(event) => setMemberForm((previous) => ({ ...previous, user: event.target.value }))}
                >
                  <option value="">Wybierz osobe</option>
                  {availableUsers.map((candidate: User) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.first_name} {candidate.last_name} ({candidate.email})
                    </option>
                  ))}
                </select>
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={memberForm.project_role}
                  onChange={(event) => setMemberForm((previous) => ({ ...previous, project_role: event.target.value as ProjectMembership["project_role"] }))}
                >
                  <option value="member">member</option>
                  <option value="coordinator">coordinator</option>
                </select>
                <Button className="h-12" disabled={!memberForm.user} onClick={() => addMemberMutation.mutate()}>
                  Dodaj osobe
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {projectMembers.map((member) => (
                <article key={member.id} className="tile-soft p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-accent/10 text-sm font-semibold text-accent">{memberInitials(member.user_name)}</div>
                      <div>
                        <h3 className="font-semibold">{member.user_name}</h3>
                        <p className="text-sm text-muted">{member.user_email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={member.project_role === "coordinator" ? "warning" : "default"}>{member.project_role}</Badge>
                          <Badge tone={member.is_active !== false ? "success" : "default"}>{member.is_active !== false ? "active" : "inactive"}</Badge>
                        </div>
                      </div>
                    </div>
                    {canManageProject ? (
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            updateMemberMutation.mutate({
                              membershipId: member.id,
                              payload: { project_role: member.project_role === "coordinator" ? "member" : "coordinator" },
                            })
                          }
                        >
                          Zmien role
                        </Button>
                        <Button variant="ghost" onClick={() => deleteMemberMutation.mutate(member.id)}>
                          Usun
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
              {projectMembers.length === 0 ? <p className="text-sm text-muted">Brak czlonkow przypisanych do projektu.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Recruitment pipeline" description="Otwarte role i aplikacje w ramach projektu, bez mieszania z codziennym delivery.">
            <div className="mb-4 space-y-3">
              <Input placeholder="Tytul roli" value={openingForm.title} onChange={(event) => setOpeningForm((previous) => ({ ...previous, title: event.target.value }))} />
              <Input placeholder="Opis roli" value={openingForm.description} onChange={(event) => setOpeningForm((previous) => ({ ...previous, description: event.target.value }))} />
              <Input
                placeholder="Kompetencje (przecinkami)"
                value={openingForm.competencies}
                onChange={(event) => setOpeningForm((previous) => ({ ...previous, competencies: event.target.value }))}
              />
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
                          <Badge>{opening.applications.length} aplikacji</Badge>
                        </div>
                        <h3 className="mt-3 font-semibold">{opening.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">{opening.description}</p>
                      </div>
                      {canManageProject ? (
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={() =>
                              updateRecruitmentOpening(project.id, opening.id, { is_open: !opening.is_open })
                                .then(refresh)
                                .catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie zaktualizowac rekrutacji.")))
                            }
                          >
                            {opening.is_open ? "Zamknij" : "Otworz"}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              deleteRecruitmentOpening(project.id, opening.id)
                                .then(refresh)
                                .catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie usunac rekrutacji.")))
                            }
                          >
                            Usun
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-[20px] bg-white/80 p-4 dark:bg-white/5">
                      <div className="flex flex-wrap gap-2">
                        {opening.required_competencies.map((competency) => (
                          <Badge key={competency}>{competency}</Badge>
                        ))}
                      </div>
                      <Input
                        className="mt-3"
                        placeholder="Motywacja"
                        value={form.motivation}
                        onChange={(event) => setApplyByOpening((previous) => ({ ...previous, [opening.id]: { ...form, motivation: event.target.value } }))}
                      />
                      <Input
                        className="mt-2"
                        placeholder="Dostepnosc"
                        value={form.availability_note}
                        onChange={(event) => setApplyByOpening((previous) => ({ ...previous, [opening.id]: { ...form, availability_note: event.target.value } }))}
                      />
                      <Button
                        className="mt-3"
                        disabled={!opening.is_open}
                        onClick={() =>
                          applyToRecruitment(project.id, opening.id, form)
                            .then(refresh)
                            .catch((mutationError) => setError(domainError(mutationError, "Nie udalo sie wyslac aplikacji.")))
                        }
                      >
                        Aplikuj
                      </Button>
                    </div>
                  </article>
                );
              })}
              {recruitment.length === 0 ? <p className="text-sm text-muted">Brak otwartych procesow recruitment dla tego projektu.</p> : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "files" ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <SectionCard title="File hub" description="Jedno miejsce dla repo, drive, dokumentacji, artefaktow wiedzy i punktow dostepu do projektu.">
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Repos</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{repoLinks.length}</p>
                <p className="mt-1 text-xs text-muted">powiazanych repozytoriow</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Drive</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{driveLinks.length}</p>
                <p className="mt-1 text-xs text-muted">przestrzeni dokumentow</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Articles</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{knowledge.length}</p>
                <p className="mt-1 text-xs text-muted">artefaktow wiedzy projektu</p>
              </div>
            </div>

            {canManageProject ? (
              <div className="mb-5 grid gap-3 md:grid-cols-[.9fr_1.2fr_.8fr_auto]">
                <Input placeholder="Etykieta" value={linkForm.label} onChange={(event) => setLinkForm((previous) => ({ ...previous, label: event.target.value }))} />
                <Input placeholder="URL" value={linkForm.url} onChange={(event) => setLinkForm((previous) => ({ ...previous, url: event.target.value }))} />
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={linkForm.type}
                  onChange={(event) => setLinkForm((previous) => ({ ...previous, type: event.target.value }))}
                >
                  <option value="github">github</option>
                  <option value="google_drive">google_drive</option>
                  <option value="documentation">documentation</option>
                  <option value="other">other</option>
                </select>
                <Button className="h-12" disabled={!linkForm.label || !linkForm.url} onClick={() => createLinkMutation.mutate()}>
                  Dodaj
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {links.map((link) => (
                <article key={link.id} className="tile-soft p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{linkLabel(link.type)}</Badge>
                      </div>
                      <h3 className="mt-3 font-semibold">{link.label}</h3>
                      <a className="mt-2 inline-flex text-sm text-accent underline" href={link.url} target="_blank" rel="noreferrer">
                        Otworz zasob
                      </a>
                      <p className="mt-2 text-xs text-muted">{link.url}</p>
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

                  {editingLinkId === link.id && canManageProject ? (
                    <div className="mt-4 grid gap-2">
                      <Input defaultValue={link.label} onBlur={(event) => updateLinkMutation.mutate({ linkId: link.id, payload: { label: event.target.value } })} />
                      <Input defaultValue={link.url} onBlur={(event) => updateLinkMutation.mutate({ linkId: link.id, payload: { url: event.target.value } })} />
                    </div>
                  ) : null}
                </article>
              ))}
              {links.length === 0 ? <p className="text-sm text-muted">Brak linkow lub dokumentacyjnych punktow wejscia do projektu.</p> : null}
            </div>
          </SectionCard>

          <div className="grid gap-6">
            <SectionCard title="Knowledge pack" description="Artykuly wiedzy projektowej, decyzje i notatki uporzadkowane w jednym miejscu.">
              <div className="space-y-4">
                {knowledge.map((article) => (
                  <article key={article.id} className="tile-soft p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={article.is_pinned ? "warning" : "default"}>{article.is_pinned ? "pinned" : article.category}</Badge>
                          {article.visibility ? <Badge>{article.visibility}</Badge> : null}
                        </div>
                        <h3 className="mt-3 font-semibold">{article.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {article.content.slice(0, 180)}
                          {article.content.length > 180 ? "..." : ""}
                        </p>
                        <p className="mt-2 text-xs text-muted">Updated: {formatDateTime(article.updated_at)}</p>
                      </div>
                      <Link className="text-sm font-medium text-accent underline" to="/knowledge">
                        Otworz modul
                      </Link>
                    </div>
                  </article>
                ))}
                {knowledge.length === 0 ? <p className="text-sm text-muted">Brak artykulow wiedzy powiazanych z projektem.</p> : null}
              </div>
            </SectionCard>

            <SectionCard title="Meeting artifacts" description="Spotkania i punkty dostepu, ktore najczesciej sa potrzebne podczas pracy nad projektem.">
              <div className="space-y-4">
                {meetings.slice(0, 4).map((meeting) => (
                  <article key={meeting.id} className="tile-soft p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge>{meeting.meeting_type}</Badge>
                        <h3 className="mt-3 font-semibold">{meeting.title}</h3>
                        <p className="mt-2 text-sm text-muted">{meeting.description || "Spotkanie projektowe bez dodatkowego opisu."}</p>
                        <p className="mt-2 text-xs text-muted">
                          {formatDateTime(meeting.start_at)} - {formatDateTime(meeting.end_at)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted">
                        <p>{meeting.location || "online"}</p>
                        {meeting.online_url ? (
                          <a className="mt-2 inline-flex text-accent underline" href={meeting.online_url} target="_blank" rel="noreferrer">
                            Join
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
                {meetings.length === 0 ? <p className="text-sm text-muted">Brak spotkan powiazanych z projektem.</p> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {activeTab === "activity" ? (
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <SectionCard title="Activity pulse" description="Pelna historia sygnalow projektu: operacje, spotkania, dokumenty i komentarze z execution.">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Timeline events</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{timeline.length}</p>
                <p className="mt-1 text-xs text-muted">skonsolidowanych wpisow</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Last signal</p>
                <p className="mt-2 text-lg font-semibold">{timeline[0] ? formatDateTime(timeline[0].createdAt) : "brak"}</p>
                <p className="mt-1 text-xs text-muted">ostatnia zmiana w projekcie</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Comments</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{tasks.reduce((sum, task) => sum + (task.comments?.length ?? 0), 0)}</p>
                <p className="mt-1 text-xs text-muted">sygnalow z taskow</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Knowledge updates</p>
                <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{knowledge.length}</p>
                <p className="mt-1 text-xs text-muted">powiazanych artefaktow wiedzy</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Timeline" description="Chronologiczny strumien zmian, zeby bylo widac co sie dzieje z projektem i kiedy.">
            <div className="space-y-4">
              {timeline.map((item) => (
                <article key={item.id} className="relative pl-8">
                  <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-accent" />
                  <span className="absolute left-[5px] top-6 h-[calc(100%-1rem)] w-px bg-white/30 dark:bg-white/10" />
                  <div className="tile-soft p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={item.tone}>{item.label}</Badge>
                        </div>
                        <h3 className="mt-3 font-semibold">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                      </div>
                      <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                </article>
              ))}
              {timeline.length === 0 ? <p className="text-sm text-muted">Brak wpisow w timeline projektu.</p> : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
          <SectionCard title="Project settings" description="Zarzadzanie opisem, statusem, etapem i postepem projektu bez wychodzenia do panelu admina.">
            <div className="space-y-4">
              <Input
                placeholder="Krotki opis"
                value={settingsForm.short_description}
                onChange={(event) => setSettingsForm((previous) => ({ ...previous, short_description: event.target.value }))}
              />
              <textarea
                className="min-h-[180px] rounded-[24px] border border-white/30 bg-white/70 px-4 py-4 text-sm outline-none transition focus:border-accent dark:border-white/10 dark:bg-white/5"
                placeholder="Pelny opis projektu"
                value={settingsForm.full_description}
                onChange={(event) => setSettingsForm((previous) => ({ ...previous, full_description: event.target.value }))}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={settingsForm.status}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, status: event.target.value }))}
                >
                  <option value="active">active</option>
                  <option value="at_risk">at_risk</option>
                  <option value="blocked">blocked</option>
                  <option value="completed">completed</option>
                  <option value="archived">archived</option>
                </select>
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={settingsForm.stage}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, stage: event.target.value }))}
                >
                  <option value="idea">idea</option>
                  <option value="analysis">analysis</option>
                  <option value="planning">planning</option>
                  <option value="in_progress">in_progress</option>
                  <option value="testing">testing</option>
                  <option value="validation">validation</option>
                  <option value="publication">publication</option>
                  <option value="completed">completed</option>
                  <option value="paused">paused</option>
                  <option value="archived">archived</option>
                </select>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settingsForm.progress_percent}
                  onChange={(event) => setSettingsForm((previous) => ({ ...previous, progress_percent: event.target.value }))}
                />
              </div>
              <Button className="h-12" disabled={!canManageProject} onClick={() => updateSettingsMutation.mutate()}>
                Zapisz ustawienia projektu
              </Button>
            </div>
          </SectionCard>

          <div className="grid gap-6">
            <SectionCard title="Governance snapshot" description="Meta informacje projektu i kontrola operacyjna w jednym miejscu.">
              <div className="grid gap-3">
                <div className="tile-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Slug</p>
                  <p className="mt-2 text-sm font-medium">{project.slug}</p>
                </div>
                <div className="tile-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Category</p>
                  <p className="mt-2 text-sm font-medium">{project.category}</p>
                </div>
                <div className="tile-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Plan dates</p>
                  <p className="mt-2 text-sm font-medium">
                    {formatDate(project.start_date)} - {formatDate(project.planned_end_date)}
                  </p>
                </div>
                <div className="tile-soft p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Actual end</p>
                  <p className="mt-2 text-sm font-medium">{formatDate(project.actual_end_date)}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Archive operation" description="Archiwizacja jest odseparowana od codziennej pracy delivery i widoczna tylko jako kontrolowana akcja.">
              <div className="tile-soft p-5">
                <p className="text-sm leading-6 text-muted">
                  Uzyj tej operacji dopiero wtedy, gdy projekt jest zakonczony lub przenoszony do historii. Widok pozostaje dostepny dla audytu i raportowania.
                </p>
                <Button className="mt-4" disabled={!canManageProject || project.status === "archived"} onClick={() => archiveMutation.mutate()}>
                  Zarchiwizuj projekt
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
    </>
  );
}
