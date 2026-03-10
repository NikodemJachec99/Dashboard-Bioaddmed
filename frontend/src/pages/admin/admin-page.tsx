import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addProjectMember,
  createProject,
  createUser,
  fetchProjects,
  fetchUsers,
  queryKeys,
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

export function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const [assignmentForm, setAssignmentForm] = useState<{ projectId: number | ""; userId: number | ""; project_role: AddProjectMemberPayload["project_role"] }>({
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

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users });
      setFeedback("Użytkownik został dodany.");
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
    onError: (mutationError: unknown) => {
      setError(mutationError instanceof Error ? mutationError.message : "Nie udało się dodać użytkownika.");
      setFeedback(null);
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      setFeedback("Projekt został utworzony.");
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
    onError: (mutationError: unknown) => {
      setError(mutationError instanceof Error ? mutationError.message : "Nie udało się utworzyć projektu.");
      setFeedback(null);
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ projectId, payload }: { projectId: number; payload: AddProjectMemberPayload }) => addProjectMember(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      setFeedback("Użytkownik został przypisany do projektu.");
      setError(null);
      setAssignmentForm({ projectId: "", userId: "", project_role: "member" });
    },
    onError: (mutationError: unknown) => {
      setError(mutationError instanceof Error ? mutationError.message : "Nie udało się przypisać użytkownika.");
      setFeedback(null);
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Panel administracyjny"
        description="Tworzenie użytkowników, projektów i przypisań projektowych bezpośrednio z aplikacji."
      />

      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Dodaj użytkownika">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createUserMutation.mutate(userForm);
            }}
          >
            <Input
              placeholder="Email"
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Imię"
                value={userForm.first_name}
                onChange={(event) => setUserForm((prev) => ({ ...prev, first_name: event.target.value }))}
                required
              />
              <Input
                placeholder="Nazwisko"
                value={userForm.last_name}
                onChange={(event) => setUserForm((prev) => ({ ...prev, last_name: event.target.value }))}
                required
              />
            </div>
            <Input
              type="password"
              placeholder="Hasło (min. 8 znaków)"
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
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" className="h-12" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Dodawanie..." : "Dodaj użytkownika"}
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Utwórz projekt">
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
                  return {
                    ...prev,
                    name,
                    slug: prev.slug ? prev.slug : toSlug(name),
                  };
                })
              }
              required
            />
            <Input
              placeholder="Slug"
              value={projectForm.slug}
              onChange={(event) => setProjectForm((prev) => ({ ...prev, slug: toSlug(event.target.value) }))}
              required
            />
            <Input
              placeholder="Krótki opis"
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
                {createProjectMutation.isPending ? "Tworzenie..." : "Utwórz projekt"}
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <SectionCard title="Przypisz użytkownika do projektu">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!assignmentForm.projectId || !assignmentForm.userId) {
                setError("Wybierz projekt i użytkownika.");
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
              <option value="">Wybierz użytkownika</option>
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
                onChange={(event) =>
                  setAssignmentForm((prev) => ({ ...prev, project_role: event.target.value as AddProjectMemberPayload["project_role"] }))
                }
              >
                <option value="member">Member</option>
                <option value="coordinator">Coordinator</option>
              </select>
              <Button type="submit" className="h-12" disabled={assignUserMutation.isPending}>
                {assignUserMutation.isPending ? "Zapisywanie..." : "Dodaj do projektu"}
              </Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Status projektów" description={`Operator: ${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()}>
          <div className="space-y-3">
            {projects.map((project) => (
              <article key={project.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{project.name}</p>
                    <p className="text-muted">{project.short_description}</p>
                  </div>
                  <Badge tone={getProjectTone(project.status)}>{project.status}</Badge>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
