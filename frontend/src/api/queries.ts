import { ApiError, api } from "@/api/client";
import { announcements, currentUser, knowledgeArticles, meetings, notifications, polls, projects, reports, resources } from "@/lib/mock-data";
import type { Announcement, KnowledgeArticle, Meeting, Notification, Project, ReportSnapshot, Resource, User, VotePoll } from "@/types/domain";

export const queryKeys = {
  me: ["me"] as const,
  projects: ["projects"] as const,
  meetings: ["meetings"] as const,
  polls: ["polls"] as const,
  knowledge: ["knowledge"] as const,
  announcements: ["announcements"] as const,
  reports: ["reports"] as const,
  resources: ["resources"] as const,
  notifications: ["notifications"] as const,
};

type Paginated<T> = {
  results: T[];
};

type LoginPayload = {
  email: string;
  password: string;
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

export async function fetchMeetings(): Promise<Meeting[]> {
  return withDemoFallback(async () => unwrapList(await api<Meeting[] | Paginated<Meeting>>("/meetings/")), meetings);
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

export async function fetchNotifications(): Promise<Notification[]> {
  return withDemoFallback(
    async () => unwrapList(await api<Notification[] | Paginated<Notification>>("/notifications/")),
    notifications,
  );
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
