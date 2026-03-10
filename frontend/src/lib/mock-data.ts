import type {
  Achievement,
  Announcement,
  KnowledgeArticle,
  Meeting,
  Notification,
  Project,
  ReportSnapshot,
  Resource,
  VotePoll,
} from "@/types/domain";

export const currentUser = {
  id: 1,
  email: "admin@bioaddmed.pl",
  first_name: "Magda",
  last_name: "Nowak",
  global_role: "admin" as const,
};

export const projects: Project[] = [
  {
    id: 1,
    name: "Bioreaktor tkankowy",
    slug: "bioreaktor-tkankowy",
    short_description: "Projekt łączący elektronikę, automatykę i inżynierię biomedyczną.",
    full_description:
      "Flagowy projekt BioAddMed z naciskiem na prototypowanie, dokumentację i iteracyjny development sprzętowo-programowy.",
    category: "biomedical",
    stage: "in_progress",
    status: "active",
    progress_percent: 68,
    memberships: [
      { id: 1, user: 1, user_email: "admin@bioaddmed.pl", user_name: "Magda Nowak", project_role: "coordinator" },
      { id: 2, user: 2, user_email: "ola@bioaddmed.pl", user_name: "Ola Wiśniewska", project_role: "member" },
    ],
    tasks: [
      { id: 1, title: "Walidacja czujnika", description: "", status: "review", priority: "high", assignee_email: "ola@bioaddmed.pl" },
      { id: 2, title: "Makieta obudowy", description: "", status: "in_progress", priority: "urgent", assignee_email: "admin@bioaddmed.pl" },
    ],
  },
  {
    id: 2,
    name: "Platforma danych laboratoryjnych",
    slug: "platforma-danych-laboratoryjnych",
    short_description: "System zarządzania eksperymentami i raportami.",
    category: "engineering",
    stage: "planning",
    status: "at_risk",
    progress_percent: 34,
    memberships: [{ id: 3, user: 1, user_email: "admin@bioaddmed.pl", user_name: "Magda Nowak", project_role: "coordinator" }],
  },
];

export const meetings: Meeting[] = [
  {
    id: 1,
    title: "Sprint projektowy BioReactor",
    description: "Przegląd milestone'ów i ryzyk.",
    meeting_type: "project",
    start_at: "2026-03-12T17:00:00+01:00",
    end_at: "2026-03-12T18:30:00+01:00",
    location: "C-13, sala 2.14",
    status: "planned",
  },
  {
    id: 2,
    title: "Spotkanie zarządu",
    description: "Budżet semestralny i priorytety organizacyjne.",
    meeting_type: "board",
    start_at: "2026-03-14T12:00:00+01:00",
    end_at: "2026-03-14T13:00:00+01:00",
    online_url: "https://meet.google.com/demo",
    status: "planned",
  },
];

export const polls: VotePoll[] = [
  {
    id: 1,
    title: "Akceptacja zakupu komponentów",
    description: "Czy zatwierdzić zakup nowej partii sensorów?",
    poll_type: "yes_no",
    audience_type: "board",
    visibility_type: "public",
    status: "active",
    starts_at: "2026-03-10T08:00:00+01:00",
    ends_at: "2026-03-13T21:00:00+01:00",
    options: [
      { id: 1, label: "Tak", order: 0, votes: 5 },
      { id: 2, label: "Nie", order: 1, votes: 1 },
    ],
  },
];

export const knowledgeArticles: KnowledgeArticle[] = [
  {
    id: 1,
    title: "Onboarding do projektów biomedycznych",
    slug: "onboarding-biomed",
    category: "onboarding",
    content: "Checklisty, standard pracy z dokumentacją i zasady wersjonowania wyników.",
    is_pinned: true,
    updated_at: "2026-03-08T12:00:00+01:00",
  },
  {
    id: 2,
    title: "Standard spotkań sprintowych",
    slug: "standard-spotkan-sprintowych",
    category: "standard",
    content: "Agenda, action items i szybkie follow-upy po spotkaniu.",
    is_pinned: false,
    updated_at: "2026-03-07T10:00:00+01:00",
  },
];

export const announcements: Announcement[] = [
  {
    id: 1,
    title: "Otwarto nabór do projektu drukarki bioink",
    content: "Szukamy 2 osób od elektroniki i 1 osoby od analizy danych.",
    audience_type: "members",
    start_at: "2026-03-10T09:00:00+01:00",
    is_pinned: true,
  },
];

export const notifications: Notification[] = [
  {
    id: 1,
    title: "Zbliża się spotkanie",
    message: "Sprint projektowy BioReactor startuje jutro o 17:00.",
    is_read: false,
    created_at: "2026-03-10T11:00:00+01:00",
    url: "/calendar",
  },
];

export const resources: Resource[] = [
  {
    id: 1,
    title: "Drukarka 3D Prusa MK4",
    description: "Sprzęt do szybkiego prototypowania.",
    location: "Laboratorium B-4",
    rules: "Rezerwacje z 24h wyprzedzeniem.",
    is_active: true,
  },
];

export const reports: ReportSnapshot[] = [
  { id: 1, report_type: "monthly_projects", file_path: "reports/monthly-projects.json", created_at: "2026-03-01T08:00:00+01:00" },
];

export const achievements: Achievement[] = [
  { id: 1, title: "Prezentacja na konferencji biomateriałów", category: "conference", description: "Wystąpienie posterowe zespołu BioAddMed.", issued_at: "2025-11-18" },
];

