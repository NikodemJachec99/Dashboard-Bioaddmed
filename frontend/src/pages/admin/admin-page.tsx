import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  addProjectMember,
  createProject,
  createUser,
  deleteUser,
  fetchProjects,
  fetchUsers,
  queryKeys,
  updateUser,
  type AddProjectMemberPayload,
  type CreateProjectPayload,
  type CreateUserPayload,
} from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/providers/auth-provider";

const projectCategories = [
  "research",
  "biomedical",
  "engineering",
  "organizational",
  "conference",
  "grant",
  "promotional",
  "educational",
];

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProjectTone(status: string) {
  if (status === "at_risk") return "warning";
  if (status === "blocked") return "danger";
  if (status === "completed") return "success";
  return "default";
}

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchMembers, setSearchMembers] = useState("");

  const [userForm, setUserForm] = useState<CreateUserPayload>({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    global_role: "member",
    is_active: true,
    is_active_member: true,
  });

  const [projectForm, setProjectForm] = useState<CreateProjectPayload>({
    name: "",
    slug: "",
    short_description: "",
    category: "research",
    stage: "idea",
    status: "active",
    progress_percent: 0,
  });

  const [assignmentForm, setAssignmentForm] = useState<{
    projectId: number | "";
    userId: number | "";
    project_role: AddProjectMemberPayload["project_role"];
  }>({
    projectId: "",
    userId: "",
    project_role: "member",
  });

  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)),
    [users],
  );

  const filteredUsers = useMemo(
    () =>
      sortedUsers.filter((entry) => {
        const phrase = searchMembers.toLowerCase().trim();
        if (!phrase) return true;
        return `${entry.first_name} ${entry.last_name} ${entry.email}`.toLowerCase().includes(phrase);
      }),
    [searchMembers, sortedUsers],
  );

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setFeedback("Uzytkownik dodany.");
      setError(null);
      setUserForm({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        global_role: "member",
        is_active: true,
        is_active_member: true,
      });
    },
    onError: (mutationError) => {
      setError(toErrorMessage(mutationError, "Nie udalo sie dodac uzytkownika."));
      setFeedback(null);
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      setFeedback("Projekt utworzony.");
      setError(null);
      setProjectForm({
        name: "",
        slug: "",
        short_description: "",
        category: "research",
        stage: "idea",
        status: "active",
        progress_percent: 0,
      });
    },
    onError: (mutationError) => {
      setError(toErrorMessage(mutationError, "Nie udalo sie utworzyc projektu."));
      setFeedback(null);
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: number; payload: AddProjectMemberPayload }) => addProjectMember(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      setFeedback("Uzytkownik przypisany do projektu.");
      setError(null);
      setAssignmentForm({ projectId: "", userId: "", project_role: "member" });
    },
    onError: (mutationError) => {
      setError(toErrorMessage(mutationError, "Nie udalo sie przypisac uzytkownika."));
      setFeedback(null);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: Record<string, unknown> }) => updateUser(userId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setFeedback("Dane czlonka zaktualizowane.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zaktualizowac uzytkownika.")),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      setFeedback("Uzytkownik usuniety.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie usunac uzytkownika.")),
  });

  return (
    <>
      <PageHeader eyebrow="Admin" title="Panel administracyjny" description="Pelne zarzadzanie czlonkami, projektami i przypisaniami." />

      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Dodaj uzytkownika">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createUserMutation.mutate(userForm);
            }}
          >
            <Input placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} required />
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Imie" value={userForm.first_name} onChange={(event) => setUserForm((prev) => ({ ...prev, first_name: event.target.value }))} required />
              <Input placeholder="Nazwisko" value={userForm.last_name} onChange={(event) => setUserForm((prev) => ({ ...prev, last_name: event.target.value }))} required />
            </div>
            <Input
              type="password"
              placeholder="Haslo (min. 8 znakow)"
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
              minLength={8}
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={userForm.global_role}
                onChange={(event) => setUserForm((prev) => ({ ...prev, global_role: event.target.value as CreateUserPayload["global_role"] }))}
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
              <Button type="submit" className="h-12" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Dodawanie..." : "Dodaj uzytkownika"}
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Utworz projekt">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createProjectMutation.mutate(projectForm);
            }}
          >
            <Input
              placeholder="Nazwa projektu"
              value={projectForm.name}
              onChange={(event) =>
                setProjectForm((prev) => {
                  const name = event.target.value;
                  return { ...prev, name, slug: prev.slug ? prev.slug : toSlug(name) };
                })
              }
              required
            />
            <Input placeholder="Slug" value={projectForm.slug} onChange={(event) => setProjectForm((prev) => ({ ...prev, slug: toSlug(event.target.value) }))} required />
            <Input
              placeholder="Krotki opis"
              value={projectForm.short_description}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, short_description: event.target.value }))}
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={projectForm.category}
                onChange={(event) => setProjectForm((prev) => ({ ...prev, category: event.target.value }))}
              >
                {projectCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Button type="submit" className="h-12" disabled={createProjectMutation.isPending}>
                {createProjectMutation.isPending ? "Tworzenie..." : "Utworz projekt"}
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <SectionCard title="Przypisz uzytkownika do projektu">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!assignmentForm.projectId || !assignmentForm.userId) {
                setError("Wybierz projekt i uzytkownika.");
                setFeedback(null);
                return;
              }
              assignUserMutation.mutate({
                projectId: assignmentForm.projectId,
                payload: {
                  user: assignmentForm.userId,
                  project_role: assignmentForm.project_role,
                  is_active: true,
                },
              });
            }}
          >
            <select
              className="h-12 w-full rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={assignmentForm.projectId}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, projectId: Number(event.target.value) || "" }))}
              required
            >
              <option value="">Wybierz projekt</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              className="h-12 w-full rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={assignmentForm.userId}
              onChange={(event) => setAssignmentForm((prev) => ({ ...prev, userId: Number(event.target.value) || "" }))}
              required
            >
              <option value="">Wybierz uzytkownika</option>
              {sortedUsers.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.first_name} {entry.last_name} ({entry.email})
                </option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={assignmentForm.project_role}
                onChange={(event) => setAssignmentForm((prev) => ({ ...prev, project_role: event.target.value as AddProjectMemberPayload["project_role"] }))}
              >
                <option value="member">member</option>
                <option value="coordinator">coordinator</option>
              </select>
              <Button type="submit" className="h-12" disabled={assignUserMutation.isPending}>
                {assignUserMutation.isPending ? "Zapisywanie..." : "Dodaj do projektu"}
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Status projektow" description={`Operator: ${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()}>
          <div className="space-y-3">
            {projects.map((project) => (
              <article key={project.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{project.name}</p>
                    <p className="text-muted">{project.short_description}</p>
                    <p className="mt-1 text-xs text-muted">
                      Etap: {project.stage} | Progress: {project.progress_percent}%
                    </p>
                  </div>
                  <Badge tone={getProjectTone(project.status)}>{project.status}</Badge>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Zarzadzanie czlonkami">
        <div className="mb-3">
          <Input placeholder="Szukaj po imieniu, nazwisku lub emailu" value={searchMembers} onChange={(event) => setSearchMembers(event.target.value)} />
        </div>
        <div className="space-y-3">
          {filteredUsers.map((entry) => (
            <article key={entry.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {entry.first_name} {entry.last_name}
                  </p>
                  <p className="text-muted">{entry.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-xl border border-white/30 bg-white/70 px-3 text-xs dark:border-white/10 dark:bg-white/5"
                    value={entry.global_role}
                    onChange={(event) =>
                      updateUserMutation.mutate({ userId: entry.id, payload: { global_role: event.target.value } })
                    }
                    disabled={updateUserMutation.isPending}
                  >
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={Boolean(entry.is_active)}
                      onChange={(event) =>
                        updateUserMutation.mutate({ userId: entry.id, payload: { is_active: event.target.checked } })
                      }
                    />
                    aktywny
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={Boolean(entry.is_active_member)}
                      onChange={(event) =>
                        updateUserMutation.mutate({ userId: entry.id, payload: { is_active_member: event.target.checked } })
                      }
                    />
                    czlonek
                  </label>
                  <Button
                    variant="ghost"
                    disabled={entry.id === user?.id || deleteUserMutation.isPending}
                    onClick={() => deleteUserMutation.mutate(entry.id)}
                  >
                    Usun
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
