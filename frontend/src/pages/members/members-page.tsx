import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchProjects, fetchUsers, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FolderKanban, Users } from "@/components/ui/icons";
import type { Project, User } from "@/types/domain";

type ActivityFilter = "all" | "coordinators" | "with-project" | "without-project";

type UserPortfolioStats = {
  projectCount: number;
  coordinatorCount: number;
  activeProjects: Project[];
};

function getRoleTone(role: User["global_role"]) {
  return role === "admin" ? "warning" : "default";
}

function getAvailabilityLabel(hours?: number) {
  if (!hours) return "Brak danych o dostepnosci";
  if (hours >= 12) return "Wysoka dostepnosc";
  if (hours >= 6) return "Stabilna dostepnosc";
  return "Ograniczona przepustowosc";
}

function initialsOf(user: User) {
  return `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.trim() || "BA";
}

export function MembersPage() {
  const { user } = useAuth();
  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | User["global_role"]>("all");

  const statsByUser = useMemo(() => {
    const map = new Map<number, UserPortfolioStats>();
    users.forEach((entry) => map.set(entry.id, { projectCount: 0, coordinatorCount: 0, activeProjects: [] }));

    projects.forEach((project) => {
      project.memberships?.forEach((membership) => {
        const current = map.get(membership.user) ?? { projectCount: 0, coordinatorCount: 0, activeProjects: [] };
        if (membership.is_active !== false) {
          current.projectCount += 1;
          current.activeProjects.push(project);
          if (membership.project_role === "coordinator") {
            current.coordinatorCount += 1;
          }
        }
        map.set(membership.user, current);
      });
    });

    return map;
  }, [projects, users]);

  const myProjectIds = useMemo(() => {
    if (user?.global_role === "admin") return new Set(projects.map((project) => project.id));
    return new Set(
      projects
        .filter((project) => project.memberships?.some((membership) => membership.user === user?.id && membership.is_active !== false))
        .map((project) => project.id),
    );
  }, [projects, user?.global_role, user?.id]);

  const visibleUsers = useMemo(() => {
    if (user?.global_role === "admin") return users;

    return users.filter((entry) => {
      if (entry.id === user?.id) return true;
      const stats = statsByUser.get(entry.id);
      return stats?.activeProjects.some((project) => myProjectIds.has(project.id));
    });
  }, [myProjectIds, statsByUser, user?.global_role, user?.id, users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return visibleUsers.filter((entry) => {
      const stats = statsByUser.get(entry.id) ?? { projectCount: 0, coordinatorCount: 0, activeProjects: [] };
      const matchesQuery =
        !query ||
        `${entry.first_name} ${entry.last_name}`.toLowerCase().includes(query) ||
        entry.email.toLowerCase().includes(query) ||
        entry.field_of_study?.toLowerCase().includes(query) ||
        entry.specialization?.toLowerCase().includes(query) ||
        entry.technologies?.some((tag) => tag.toLowerCase().includes(query)) ||
        entry.interests?.some((tag) => tag.toLowerCase().includes(query)) ||
        stats.activeProjects.some((project) => project.name.toLowerCase().includes(query));

      const matchesRole = roleFilter === "all" || entry.global_role === roleFilter;
      const matchesActivity =
        activityFilter === "all" ||
        (activityFilter === "coordinators" && stats.coordinatorCount > 0) ||
        (activityFilter === "with-project" && stats.projectCount > 0) ||
        (activityFilter === "without-project" && stats.projectCount === 0);

      return matchesQuery && matchesRole && matchesActivity;
    });
  }, [activityFilter, roleFilter, search, statsByUser, visibleUsers]);

  const activeMembers = filteredUsers.filter((entry) => entry.is_active !== false).length;
  const coordinators = filteredUsers.filter((entry) => (statsByUser.get(entry.id)?.coordinatorCount ?? 0) > 0).length;
  const withoutProject = filteredUsers.filter((entry) => (statsByUser.get(entry.id)?.projectCount ?? 0) === 0).length;
  const avgAvailability =
    filteredUsers.reduce((sum, entry) => sum + (entry.weekly_availability_hours ?? 0), 0) / Math.max(filteredUsers.length, 1);

  const spotlightUsers = filteredUsers
    .map((entry) => ({
      user: entry,
      stats: statsByUser.get(entry.id) ?? { projectCount: 0, coordinatorCount: 0, activeProjects: [] },
    }))
    .filter(({ user: entry, stats }) => entry.is_active !== false && (stats.projectCount === 0 || (entry.weekly_availability_hours ?? 0) < 4))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="People Ops"
        title={user?.global_role === "admin" ? "Organizacja, kompetencje i obciazenie zespolu" : "Siec wspolpracy i kompetencje projektowe"}
        description={
          user?.global_role === "admin"
            ? "Widok zarzadzania ludzmi: role, przypisania, przepustowosc i ryzyka kadrowe w calym portfolio."
            : "Widok wspolpracy ograniczony do ludzi, z ktorymi rzeczywiscie pracujesz. Bez szumu organizacyjnego."
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Badge tone="success">{activeMembers} aktywnych</Badge>
            <Badge tone="warning">{coordinators} coordinatorow</Badge>
            <Badge tone={withoutProject > 0 ? "danger" : "default"}>{withoutProject} bez projektu</Badge>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard
          label="Widoczni czlonkowie"
          value={filteredUsers.length}
          detail="Zakres danych zalezy od roli. Admin widzi calosc, pozostali tylko siec swoich projektow."
          icon={<Users size={18} />}
        />
        <StatCard
          label="Liderzy projektu"
          value={coordinators}
          detail="Liczba osob prowadzacych przynajmniej jeden aktywny strumien pracy."
          tone="success"
          icon={<FolderKanban size={18} />}
        />
        <StatCard
          label="Srednia dostepnosc"
          value={`${avgAvailability.toFixed(1)}h`}
          detail="Uzyteczne do szybkiej oceny pojemnosci zespolu pod nowy sprint lub rekrutacje."
          tone={avgAvailability >= 8 ? "success" : avgAvailability >= 5 ? "warning" : "danger"}
        />
        <StatCard
          label="Ryzyko staffingowe"
          value={withoutProject}
          detail="Osoby bez aktywnego projektu lub wymagajace nowego osadzenia w workflow."
          tone={withoutProject > 0 ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <SectionCard
          title="Matriz kompetencji i obciazenia"
          description="Filtruj ludzi po roli, aktywnosci i kontekcie projektowym. Karty sa juz zaprojektowane pod codzienna prace, a nie tylko katalog kontaktow."
          action={
            <div className="flex flex-wrap gap-2">
              {(["all", "with-project", "coordinators", "without-project"] as ActivityFilter[]).map((filterName) => (
                <button
                  key={filterName}
                  type="button"
                  className={[
                    "rounded-full px-3 py-2 text-xs font-semibold transition",
                    activityFilter === filterName ? "bg-accent text-white" : "bg-white/70 text-muted dark:bg-white/5",
                  ].join(" ")}
                  onClick={() => setActivityFilter(filterName)}
                >
                  {filterName === "all"
                    ? "Wszyscy"
                    : filterName === "with-project"
                      ? "W projektach"
                      : filterName === "coordinators"
                        ? "Coordinatorzy"
                        : "Do osadzenia"}
                </button>
              ))}
            </div>
          }
        >
          <div className="mb-5 grid gap-3 md:grid-cols-[1.5fr_.8fr]">
            <Input placeholder="Szukaj po osobie, projekcie, specjalizacji lub tagu..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "all" | User["global_role"])}
            >
              <option value="all">Wszystkie role globalne</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredUsers.map((entry) => {
              const stats = statsByUser.get(entry.id) ?? { projectCount: 0, coordinatorCount: 0, activeProjects: [] };
              const expertise = [...(entry.technologies ?? []), ...(entry.interests ?? [])].slice(0, 5);

              return (
                <article
                  key={entry.id}
                  className="rounded-[28px] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,250,255,0.74))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex size-14 items-center justify-center rounded-[22px] bg-accent text-base font-bold text-white shadow-lg shadow-accent/20">
                        {initialsOf(entry)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.02em]">
                          {entry.first_name} {entry.last_name}
                        </h3>
                        <p className="mt-1 text-sm text-muted">{entry.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone={getRoleTone(entry.global_role)}>{entry.global_role}</Badge>
                          {entry.is_active_member ? <Badge tone="success">aktywny czlonek</Badge> : null}
                          {stats.coordinatorCount > 0 ? <Badge tone="warning">{stats.coordinatorCount}x coordinator</Badge> : null}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Capacity</p>
                      <p className="mt-2 text-2xl font-bold tracking-[-0.04em]">{entry.weekly_availability_hours ?? 0}h</p>
                      <p className="mt-1 text-xs text-muted">{getAvailabilityLabel(entry.weekly_availability_hours)}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] bg-white/70 px-4 py-3 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Projekty</p>
                      <p className="mt-2 text-xl font-bold">{stats.projectCount}</p>
                      <p className="mt-1 text-xs text-muted">aktywnych przypisan</p>
                    </div>
                    <div className="rounded-[22px] bg-white/70 px-4 py-3 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Rola</p>
                      <p className="mt-2 text-xl font-bold">{stats.coordinatorCount}</p>
                      <p className="mt-1 text-xs text-muted">projektow prowadzonych</p>
                    </div>
                    <div className="rounded-[22px] bg-white/70 px-4 py-3 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Specjalizacja</p>
                      <p className="mt-2 text-sm font-semibold">{entry.specialization || entry.field_of_study || "Brak opisu"}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Aktywne projekty</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {stats.activeProjects.length > 0 ? (
                        stats.activeProjects.slice(0, 4).map((project) => (
                          <Badge key={`${entry.id}-${project.id}`}>{project.name}</Badge>
                        ))
                      ) : (
                        <Badge tone="danger">brak przypisania</Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Tagi kompetencyjne</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {expertise.length > 0 ? expertise.map((tag) => <Badge key={`${entry.id}-${tag}`}>{tag}</Badge>) : <Badge>uzupelnij profil</Badge>}
                    </div>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-muted">{entry.bio || "Profil nie zawiera jeszcze syntetycznego opisu roli, doswiadczenia i kierunku rozwoju."}</p>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title="Punkty uwagi"
            description="Kogo trzeba osadzic w projekcie, odciazyc albo domknac profil kompetencyjny."
          >
            <div className="space-y-3">
              {spotlightUsers.length > 0 ? (
                spotlightUsers.map(({ user: entry, stats }) => (
                  <article key={`spotlight-${entry.id}`} className="rounded-[24px] bg-white/70 px-4 py-4 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {entry.first_name} {entry.last_name}
                        </p>
                        <p className="mt-1 text-xs text-muted">{stats.projectCount === 0 ? "Brak aktywnego projektu" : "Niska deklarowana dostepnosc"}</p>
                      </div>
                      <Badge tone={stats.projectCount === 0 ? "danger" : "warning"}>
                        {stats.projectCount === 0 ? "wymaga osadzenia" : `${entry.weekly_availability_hours ?? 0}h / tydz.`}
                      </Badge>
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted">Brak czlonkow wymagajacych natychmiastowej interwencji staffingowej.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Narracja zarzadcza"
            description="Jak czytac ten ekran w pracy operacyjnej."
          >
            <div className="space-y-4 text-sm leading-6 text-muted">
              <p>
                `Coordinatorzy` to naturalni wlasciciele sprintow, spotkan i decyzji projektowych. Jezeli projekt nie ma nikogo w tej roli, warto
                potraktowac to jako ryzyko governance.
              </p>
              <p>
                `Do osadzenia` wskazuje osoby, ktore maja konto i potencjal, ale nie pracuja jeszcze w aktywnym przeplywie. To najlepsza lista do
                szybkiego onboardingu lub rekrutacji wewnetrznej.
              </p>
              <p>
                Dla zwyklego membera ekran jest celowo zawezony do realnej sieci wspolpracy. Nie ma potrzeby wystawiac calej struktury organizacji
                kazdemu uzytkownikowi.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
