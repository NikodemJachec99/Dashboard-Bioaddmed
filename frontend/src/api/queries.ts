import { ApiError, api } from "@/api/client";
import { announcements, currentUser, knowledgeArticles, meetings, notifications, polls, projects, reports, resources } from "@/lib/mock-data";
import type {
  Achievement,
  Announcement,
  DashboardAdminSummary,
  DashboardMySummary,
  DashboardOverview,
  KanbanBoard,
  KnowledgeArticle,
  Meeting,
  MeetingActionItem,
  MeetingParticipant,
  Notification,
  Project,
  ProjectHealth,
  ProjectMembership,
  Reservation,
  ReportSnapshot,
  Resource,
  Task,
  TaskChecklistItem,
  TaskComment,
  User,
  VotePoll,
} from "@/types/domain";

export const queryKeys = {
  me: ["me"] as const,
  users: ["users"] as const,
  projects: ["projects"] as const,
  meetings: ["meetings"] as const,
  polls: ["polls"] as const,
  knowledge: ["knowledge"] as const,
  announcements: ["announcements"] as const,
  reports: ["reports"] as const,
  resources: ["resources"] as const,
  reservations: ["reservations"] as const,
  tasks: ["tasks"] as const,
  notifications: ["notifications"] as const,
  dashboardOverview: ["dashboard", "overview"] as const,
  dashboardMySummary: ["dashboard", "my-summary"] as const,
  dashboardAdminSummary: ["dashboard", "admin-summary"] as const,
  dashboardProjectHealth: ["dashboard", "project-health"] as const,
};

type Paginated<T> = {
  results: T[];
};

type LoginPayload = {
  email: string;
  password: string;
};

export type CreateUserPayload = {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  global_role: User["global_role"];
  is_active?: boolean;
  is_active_member?: boolean;
};

export type CreateProjectPayload = {
  name: string;
  slug: string;
  short_description: string;
  full_description?: string;
  category: string;
  project_type?: string;
  stage?: string;
  status?: string;
  progress_percent?: number;
};

export type AddProjectMemberPayload = {
  user: number;
  project_role: ProjectMembership["project_role"];
  is_active?: boolean;
};

export type CreateTaskPayload = {
  project: number;
  column?: number | null;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: number | null;
  due_date?: string | null;
  order?: number;
  is_blocker?: boolean;
};

export type MoveTaskPayload = {
  column: number;
  order: number;
};

export type CreateMeetingPayload = {
  title: string;
  description?: string;
  meeting_type: string;
  related_project?: number | null;
  start_at: string;
  end_at: string;
  location?: string;
  online_url?: string;
  agenda?: string;
  status?: string;
};

export type CreatePollPayload = {
  title: string;
  description?: string;
  poll_type: string;
  audience_type: string;
  visibility_type: string;
  related_project?: number | null;
  eligible_users?: number[];
  starts_at: string;
  ends_at: string;
  quorum_required?: number;
  threshold_type?: string;
  status?: string;
};

export type CreateKnowledgePayload = {
  title: string;
  slug: string;
  content: string;
  category: string;
  visibility?: string;
  related_project?: number | null;
  is_pinned?: boolean;
};

export type CreateAnnouncementPayload = {
  title: string;
  content: string;
  audience_type: string;
  start_at: string;
  expires_at?: string | null;
  is_pinned?: boolean;
};

export type CreateResourcePayload = {
  title: string;
  description?: string;
  location?: string;
  caretaker?: number | null;
  rules?: string;
  is_active?: boolean;
};

export type CreateReservationPayload = {
  resource: number;
  start_at: string;
  end_at: string;
  purpose?: string;
  status?: string;
};

const demoMode = import.meta.env.VITE_ENABLE_DEMO_DATA === "true";

function unwrapList<T>(payload: T[] | Paginated<T>): T[] {
  return Array.isArray(payload) ? payload : payload.results;
}

async function withDemoFallback<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    if (demoMode) {
      return fallback;
    }
    throw error;
  }
}

export async function fetchMe(): Promise<User | null> {
  try {
    return await api<User>("/auth/me/");
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return demoMode ? currentUser : null;
    }
    throw error;
  }
}

export async function fetchProjects(): Promise<Project[]> {
  return withDemoFallback(async () => unwrapList(await api<Project[] | Paginated<Project>>("/projects/")), projects);
}

export async function fetchUsers(): Promise<User[]> {
  return withDemoFallback(async () => unwrapList(await api<User[] | Paginated<User>>("/users/")), [currentUser]);
}

export async function fetchMeetings(): Promise<Meeting[]> {
  return withDemoFallback(async () => unwrapList(await api<Meeting[] | Paginated<Meeting>>("/meetings/")), meetings);
}

export async function fetchTasks(projectId?: number): Promise<Task[]> {
  const path = projectId ? `/tasks/?project=${projectId}` : "/tasks/";
  return withDemoFallback(async () => unwrapList(await api<Task[] | Paginated<Task>>(path)), []);
}

export async function fetchPolls(): Promise<VotePoll[]> {
  return withDemoFallback(async () => unwrapList(await api<VotePoll[] | Paginated<VotePoll>>("/polls/")), polls);
}

export async function fetchKnowledge(): Promise<KnowledgeArticle[]> {
  return withDemoFallback(
    async () => unwrapList(await api<KnowledgeArticle[] | Paginated<KnowledgeArticle>>("/knowledge/")),
    knowledgeArticles,
  );
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  return withDemoFallback(
    async () => unwrapList(await api<Announcement[] | Paginated<Announcement>>("/announcements/")),
    announcements,
  );
}

export async function fetchReports(): Promise<ReportSnapshot[]> {
  return withDemoFallback(async () => unwrapList(await api<ReportSnapshot[] | Paginated<ReportSnapshot>>("/reports/")), reports);
}

export async function fetchResources(): Promise<Resource[]> {
  return withDemoFallback(async () => unwrapList(await api<Resource[] | Paginated<Resource>>("/resources/")), resources);
}

export async function fetchReservations(): Promise<Reservation[]> {
  return withDemoFallback(async () => unwrapList(await api<Reservation[] | Paginated<Reservation>>("/reservations/")), []);
}

export async function fetchNotifications(): Promise<Notification[]> {
  return withDemoFallback(
    async () => unwrapList(await api<Notification[] | Paginated<Notification>>("/notifications/")),
    notifications,
  );
}

export async function fetchUserPortfolio(userId: number): Promise<Achievement[]> {
  return withDemoFallback(async () => api<Achievement[]>(`/users/${userId}/portfolio/`), []);
}

export async function fetchProjectBoard(projectId: number): Promise<KanbanBoard> {
  return api<KanbanBoard>(`/projects/${projectId}/board/`);
}

export async function fetchProjectOverview(projectId: number) {
  return api<{ project: Project; stats: Record<string, number> }>(`/projects/${projectId}/overview/`);
}

export async function fetchProjectActivity(projectId: number) {
  return api<Array<{ id: number; action_type: string; description: string; created_at: string }>>(`/projects/${projectId}/activity/`);
}

export async function fetchProjectMeetings(projectId: number): Promise<Meeting[]> {
  return unwrapList(await api<Meeting[] | Paginated<Meeting>>(`/meetings/?related_project=${projectId}`));
}

export async function fetchProjectKnowledge(projectId: number): Promise<KnowledgeArticle[]> {
  return unwrapList(await api<KnowledgeArticle[] | Paginated<KnowledgeArticle>>(`/knowledge/?related_project=${projectId}`));
}

export async function createUser(payload: CreateUserPayload) {
  return api<User>("/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createProject(payload: CreateProjectPayload) {
  return api<Project>("/projects/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addProjectMember(projectId: number, payload: AddProjectMemberPayload) {
  return api<ProjectMembership>(`/projects/${projectId}/members/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createTask(payload: CreateTaskPayload) {
  return api<Task>("/tasks/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateTask(taskId: number, payload: Partial<CreateTaskPayload>) {
  return api<Task>(`/tasks/${taskId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(taskId: number) {
  return api<void>(`/tasks/${taskId}/`, { method: "DELETE" });
}

export async function moveTask(taskId: number, payload: MoveTaskPayload) {
  return api<Task>(`/tasks/${taskId}/move/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addTaskComment(taskId: number, content: string) {
  return api<TaskComment>(`/tasks/${taskId}/comments/`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function addTaskChecklistItem(taskId: number, payload: { content: string; is_done?: boolean; order?: number }) {
  return api<TaskChecklistItem>(`/tasks/${taskId}/checklist/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createMeeting(payload: CreateMeetingPayload) {
  return api<Meeting>("/meetings/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addMeetingParticipant(meetingId: number, userId: number) {
  return api<MeetingParticipant>(`/meetings/${meetingId}/participants/`, {
    method: "POST",
    body: JSON.stringify({ user: userId }),
  });
}

export async function setMeetingAttendance(meetingId: number, attendance_status: string) {
  return api<MeetingParticipant>(`/meetings/${meetingId}/attendance/`, {
    method: "POST",
    body: JSON.stringify({ attendance_status }),
  });
}

export async function addMeetingActionItem(meetingId: number, payload: { description: string; assignee?: number; due_date?: string }) {
  return api<MeetingActionItem>(`/meetings/${meetingId}/action-items/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateMeetingTasks(meetingId: number) {
  return api<{ created_tasks: number[] }>(`/meetings/${meetingId}/generate-tasks/`, { method: "POST" });
}

export async function createPoll(payload: CreatePollPayload) {
  return api<VotePoll>("/polls/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPollOption(pollId: number, payload: { label: string; order?: number }) {
  return api<{ id: number; label: string; order: number; votes: number }>(`/polls/${pollId}/options/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function voteInPoll(pollId: number, option_ids: number[]) {
  return api<{ ballots: number[] }>(`/polls/${pollId}/vote/`, {
    method: "POST",
    body: JSON.stringify({ option_ids }),
  });
}

export async function fetchPollResults(pollId: number) {
  return api<{ poll_id: number; total_voters: number; quorum_required: number; quorum_met: boolean; options: Record<string, number> }>(
    `/polls/${pollId}/results/`,
  );
}

export async function closePoll(pollId: number) {
  return api<VotePoll>(`/polls/${pollId}/close/`, { method: "POST" });
}

export async function createKnowledgeArticle(payload: CreateKnowledgePayload) {
  return api<KnowledgeArticle>("/knowledge/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateKnowledgeArticle(articleId: number, payload: Partial<CreateKnowledgePayload>) {
  return api<KnowledgeArticle>(`/knowledge/${articleId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeArticle(articleId: number) {
  return api<void>(`/knowledge/${articleId}/`, { method: "DELETE" });
}

export async function createAnnouncement(payload: CreateAnnouncementPayload) {
  return api<Announcement>("/announcements/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createResource(payload: CreateResourcePayload) {
  return api<Resource>("/resources/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createReservation(payload: CreateReservationPayload) {
  return api<Reservation>("/reservations/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function generateReport(report_type: string, parameters: Record<string, unknown> = {}) {
  return api<ReportSnapshot>("/reports/generate/", {
    method: "POST",
    body: JSON.stringify({ report_type, parameters }),
  });
}

export function getReportDownloadUrl(reportId: number) {
  return `${import.meta.env.VITE_API_URL ?? "/api"}/reports/${reportId}/download/`;
}

export async function fetchDashboardOverview() {
  return api<DashboardOverview>("/dashboard/overview/");
}

export async function fetchDashboardMySummary() {
  return api<DashboardMySummary>("/dashboard/my-summary/");
}

export async function fetchDashboardAdminSummary() {
  return api<DashboardAdminSummary>("/dashboard/admin-summary/");
}

export async function fetchProjectHealth() {
  return api<ProjectHealth[]>("/dashboard/project-health/");
}

export async function loginUser(payload: LoginPayload): Promise<User> {
  return api<User>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logoutUser() {
  return api<void>("/auth/logout/", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function refreshCurrentUser() {
  return api<User>("/auth/me/");
}
