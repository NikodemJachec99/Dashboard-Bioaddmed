import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  fetchAnnouncements,
  fetchKnowledge,
  fetchMeetings,
  fetchProjects,
  fetchTasks,
  fetchUsers,
  queryKeys,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "@/components/ui/icons";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "project" | "task" | "knowledge" | "announcement" | "meeting" | "user";
};

function resultTone(type: SearchResult["type"]) {
  if (type === "announcement") return "warning";
  if (type === "knowledge") return "success";
  if (type === "task") return "danger";
  return "default";
}

function resultLabel(type: SearchResult["type"]) {
  if (type === "project") return "projekt";
  if (type === "task") return "task";
  if (type === "knowledge") return "wiedza";
  if (type === "announcement") return "ogloszenie";
  if (type === "meeting") return "spotkanie";
  return "czlonek";
}

export function GlobalSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const enabled = open && deferredQuery.length >= 2;

  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects, enabled });
  const { data: tasks = [] } = useQuery({ queryKey: queryKeys.tasks, queryFn: () => fetchTasks(), enabled });
  const { data: knowledge = [] } = useQuery({ queryKey: queryKeys.knowledge, queryFn: fetchKnowledge, enabled });
  const { data: announcements = [] } = useQuery({ queryKey: queryKeys.announcements, queryFn: fetchAnnouncements, enabled });
  const { data: meetings = [] } = useQuery({ queryKey: queryKeys.meetings, queryFn: fetchMeetings, enabled });
  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers, enabled });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => {
    if (deferredQuery.length < 2) return [];

    const projectsById = new Map(projects.map((project) => [project.id, project]));

    const projectResults: SearchResult[] = projects
      .filter((project) =>
        `${project.name} ${project.short_description} ${project.category} ${project.stage} ${project.status}`.toLowerCase().includes(deferredQuery),
      )
      .slice(0, 4)
      .map((project) => ({
        id: `project-${project.id}`,
        title: project.name,
        subtitle: `${project.status} • ${project.stage} • ${project.progress_percent}%`,
        href: `/projects/${project.slug}`,
        type: "project",
      }));

    const taskResults: SearchResult[] = tasks
      .filter((task) => `${task.title} ${task.description} ${task.priority} ${task.status} ${task.assignee_email ?? ""}`.toLowerCase().includes(deferredQuery))
      .slice(0, 5)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: `${task.status} • ${task.priority} • ${projectsById.get(task.project ?? 0)?.name ?? "bez projektu"}`,
        href: task.project ? `/projects/${projectsById.get(task.project)?.slug ?? ""}` : "/projects",
        type: "task",
      }));

    const knowledgeResults: SearchResult[] = knowledge
      .filter((article) => `${article.title} ${article.content} ${article.category}`.toLowerCase().includes(deferredQuery))
      .slice(0, 4)
      .map((article) => ({
        id: `knowledge-${article.id}`,
        title: article.title,
        subtitle: `${article.category} • ${article.visibility ?? "internal"}`,
        href: "/knowledge",
        type: "knowledge",
      }));

    const announcementResults: SearchResult[] = announcements
      .filter((entry) => `${entry.title} ${entry.content} ${entry.audience_type}`.toLowerCase().includes(deferredQuery))
      .slice(0, 4)
      .map((entry) => ({
        id: `announcement-${entry.id}`,
        title: entry.title,
        subtitle: `${entry.audience_type} • ${entry.is_pinned ? "pin" : "komunikat"}`,
        href: "/announcements",
        type: "announcement",
      }));

    const meetingResults: SearchResult[] = meetings
      .filter((meeting) => `${meeting.title} ${meeting.description ?? ""} ${meeting.location ?? ""} ${meeting.meeting_type}`.toLowerCase().includes(deferredQuery))
      .slice(0, 4)
      .map((meeting) => ({
        id: `meeting-${meeting.id}`,
        title: meeting.title,
        subtitle: `${meeting.meeting_type} • ${new Date(meeting.start_at).toLocaleString("pl-PL")}`,
        href: "/calendar",
        type: "meeting",
      }));

    const userResults: SearchResult[] = users
      .filter((entry) =>
        `${entry.first_name} ${entry.last_name} ${entry.email} ${entry.specialization ?? ""} ${entry.field_of_study ?? ""}`.toLowerCase().includes(deferredQuery),
      )
      .slice(0, 4)
      .map((entry) => ({
        id: `user-${entry.id}`,
        title: `${entry.first_name} ${entry.last_name}`.trim(),
        subtitle: `${entry.global_role} • ${entry.email}`,
        href: entry.id === user?.id ? "/profile" : "/members",
        type: "user",
      }));

    return [...projectResults, ...taskResults, ...knowledgeResults, ...announcementResults, ...meetingResults, ...userResults].slice(0, 18);
  }, [announcements, deferredQuery, knowledge, meetings, projects, tasks, user?.id, users]);

  return (
    <div className="relative flex-1">
      <div className="tile-soft flex items-center gap-3 px-4 py-3">
        <Search size={16} />
        <Input
          className="h-auto border-0 bg-transparent px-0 py-0 shadow-none"
          placeholder="Szukaj projektow, taskow, wiedzy, spotkan i ludzi..."
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
      </div>

      {open ? (
        <div className="tile-panel absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Global search</p>
            <button type="button" className="text-xs font-semibold text-muted hover:text-foreground" onClick={() => setOpen(false)}>
              Zamknij
            </button>
          </div>

          {deferredQuery.length < 2 ? (
            <div className="tile-soft px-4 py-5 text-sm text-muted">Wpisz co najmniej 2 znaki. Wyniki pochodza z realnych danych API, nie z mockow.</div>
          ) : (
            <div className="grid gap-3">
              {results.length > 0 ? (
                results.map((result) => (
                  <Link
                    key={result.id}
                    to={result.href}
                    className="tile-soft flex items-start justify-between gap-3 px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
                    onClick={() => setOpen(false)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{result.title}</p>
                      <p className="mt-1 truncate text-sm text-muted">{result.subtitle}</p>
                    </div>
                    <Badge tone={resultTone(result.type)}>{resultLabel(result.type)}</Badge>
                  </Link>
                ))
              ) : (
                <div className="tile-soft px-4 py-5 text-sm text-muted">Brak wynikow dla `{query}`.</div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
