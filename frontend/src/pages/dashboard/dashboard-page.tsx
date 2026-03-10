import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchAnnouncements,
  fetchDashboardAdminSummary,
  fetchDashboardMySummary,
  fetchDashboardOverview,
  fetchMeetings,
  fetchPolls,
  fetchProjectHealth,
  queryKeys,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, FolderKanban, RadioTower, Users } from "@/components/ui/icons";

function statusTone(status: string) {
  if (status === "at_risk") return "warning";
  if (status === "blocked") return "danger";
  if (status === "completed") return "success";
  return "default";
}

function healthLabel(status: string, progressPercent: number) {
  if (status === "blocked") return "Wymaga natychmiastowej reakcji";
  if (status === "at_risk") return "Wysokie ryzyko harmonogramu";
  if (progressPercent >= 80) return "Blisko domkniecia";
  if (progressPercent >= 50) return "Stabilny postep";
  return "Wymaga doprecyzowania kolejnych krokow";
}

function healthScore(status: string, progressPercent: number) {
  if (status === "blocked") return 18;
  if (status === "at_risk") return Math.max(32, progressPercent - 8);
  if (status === "completed") return 100;
  return Math.min(95, Math.max(48, progressPercent + 18));
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: overview } = useQuery({ queryKey: queryKeys.dashboardOverview, queryFn: fetchDashboardOverview });
  const { data: mySummary } = useQuery({ queryKey: queryKeys.dashboardMySummary, queryFn: fetchDashboardMySummary });
  const { data: adminSummary } = useQuery({
    queryKey: queryKeys.dashboardAdminSummary,
    queryFn: fetchDashboardAdminSummary,
    enabled: user?.global_role === "admin",
  });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.dashboardProjectHealth, queryFn: fetchProjectHealth });
  const { data: meetings = [] } = useQuery({ queryKey: queryKeys.meetings, queryFn: fetchMeetings });
  const { data: polls = [] } = useQuery({ queryKey: queryKeys.polls, queryFn: fetchPolls });
  const { data: announcements = [] } = useQuery({ queryKey: queryKeys.announcements, queryFn: fetchAnnouncements });

  const riskyProjects = useMemo(
    () => projects.filter((project) => project.status === "at_risk" || project.status === "blocked"),
    [projects],
  );
  const highestPriorityProjects = useMemo(
    () =>
      [...projects]
        .sort((left, right) => healthScore(left.status, left.progress_percent) - healthScore(right.status, right.progress_percent))
        .slice(0, 4),
    [projects],
  );
  const activePolls = useMemo(() => polls.filter((poll) => poll.status === "active").slice(0, 3), [polls]);
  const nextMeetings = useMemo(
    () =>
      [...meetings]
        .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())
        .slice(0, 4),
    [meetings],
  );
  const spotlightAnnouncements = useMemo(
    () => [...announcements].sort((left, right) => Number(right.is_pinned) - Number(left.is_pinned)).slice(0, 3),
    [announcements],
  );

  return (
    <>
      <PageHeader
        eyebrow="Mission Control"
        title="Dashboard operacyjny BioAddMed"
        description="Cockpit dla decyzji, ryzyk, tempa realizacji i najblizszych ruchow zespolu. To ma byc ekran pierwszego spojrzenia, nie tylko lista liczb."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aktywne projekty"
          value={overview?.active_projects ?? projects.length}
          delta={user?.global_role === "admin" ? "Zakres globalny" : "Moj zakres"}
          detail="Liczba inicjatyw, ktore sa aktualnie w ruchu i wymagaja regularnego monitorowania."
          icon={<FolderKanban size={18} />}
        />
        <StatCard
          label="Ryzyka i blokery"
          value={riskyProjects.length}
          detail="Projekty oznaczone jako zagrozone lub zablokowane. To powinno schodzic na zero."
          tone={riskyProjects.length > 0 ? "danger" : "success"}
          icon={<Bell size={18} />}
        />
        <StatCard
          label="Najblizsze spotkania"
          value={overview?.upcoming_meetings ?? nextMeetings.length}
          detail="Nadchodzace decyzje, synci i review, ktore ustawiaja rytm pracy na kolejne dni."
          tone="default"
          icon={<Calendar size={18} />}
        />
        <StatCard
          label="Aktywne glosowania"
          value={overview?.active_polls ?? activePolls.length}
          detail="Formalne decyzje, ktore wymagaja glosow lub zamkniecia przez osobe odpowiedzialna."
          tone="warning"
          icon={<RadioTower size={18} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.85fr]">
        <SectionCard
          title="Priorytety dnia"
          description="Najwazniejsze sygnaly do reakcji. To powinno odpowiadac na pytanie: gdzie zarzad i zespoly musza spojrzec natychmiast."
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-[28px] border border-white/30 bg-gradient-to-br from-cyan-50/80 to-white/60 p-6 dark:border-white/10 dark:from-slate-900 dark:to-slate-950">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Executive Summary</p>
              <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.03em]">
                {riskyProjects.length > 0 ? `${riskyProjects.length} projektow wymaga interwencji` : "Portfel projektow jest stabilny"}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                {riskyProjects.length > 0
                  ? "Skup zespol na blockerach, opoznieniach i lukach decyzyjnych. To jest miejsce, gdzie tempo realizacji realnie sie wygrywa albo przegrywa."
                  : "Brak krytycznych alarmow. Mozna skupic sie na przyspieszeniu milestone'ow i lepszej jakosci realizacji."}
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Moj focus</p>
                  <p className="mt-2 text-2xl font-bold">{mySummary?.today_tasks ?? 0}</p>
                  <p className="mt-1 text-xs text-muted">zadania na dzis</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Alerty</p>
                  <p className="mt-2 text-2xl font-bold">{riskyProjects.length}</p>
                  <p className="mt-1 text-xs text-muted">projekty w stanie risk/blocked</p>
                </div>
                <div className="rounded-2xl bg-white/70 p-4 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">Ruch zespolu</p>
                  <p className="mt-2 text-2xl font-bold">{mySummary?.notifications ?? 0}</p>
                  <p className="mt-1 text-xs text-muted">nowe powiadomienia i sygnaly</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {highestPriorityProjects.map((project) => {
                const score = healthScore(project.status, project.progress_percent);
                return (
                  <article key={project.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Health score</p>
                        <h3 className="mt-1 text-lg font-semibold">{project.name}</h3>
                        <p className="mt-2 text-sm text-muted">{healthLabel(project.status, project.progress_percent)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-extrabold tracking-[-0.03em]">{score}</p>
                        <p className="text-xs text-muted">/100</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                      <Badge>{project.stage}</Badge>
                      <Badge>{project.member_count} osob</Badge>
                      <Badge>{project.task_count} taskow</Badge>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                      <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${project.progress_percent}%` }} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Rola i rytm pracy" description="Ten blok powinien zaleznie od roli pokazywac najwazniejsze napięcia operacyjne.">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Moj skrot</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-bold">{mySummary?.today_tasks ?? 0}</p>
                  <p className="text-xs text-muted">dzisiejsze zadania</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{mySummary?.week_tasks ?? 0}</p>
                  <p className="text-xs text-muted">aktywne zadania</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{mySummary?.notifications ?? 0}</p>
                  <p className="text-xs text-muted">powiadomienia</p>
                </div>
              </div>
            </div>
            {user?.global_role === "admin" ? (
              <div className="rounded-[24px] border border-warning/20 bg-warning/5 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-warning">Admin pressure points</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xl font-bold">{adminSummary?.projects_at_risk ?? 0}</p>
                    <p className="text-xs text-muted">projekty zagrozone</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{adminSummary?.overdue_tasks ?? 0}</p>
                    <p className="text-xs text-muted">taski po terminie</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{adminSummary?.blocked_tasks ?? 0}</p>
                    <p className="text-xs text-muted">taski zablokowane</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{adminSummary?.members_without_project ?? 0}</p>
                    <p className="text-xs text-muted">czlonkowie bez projektu</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <SectionCard title="Mapa portfela projektow" description="Kazdy projekt powinien byc czytelny nie tylko jako nazwa, ale jako sygnal zdrowia, obciazenia i impetu.">
          <div className="space-y-4">
            {projects.map((project) => (
              <article key={project.id} className="rounded-[26px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                      <Badge>{project.stage}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">{healthLabel(project.status, project.progress_percent)}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Postep</p>
                        <p className="mt-2 text-xl font-bold">{project.progress_percent}%</p>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Zespol</p>
                        <p className="mt-2 text-xl font-bold">{project.member_count}</p>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Taski</p>
                        <p className="mt-2 text-xl font-bold">{project.task_count}</p>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-[140px] rounded-[24px] bg-slate-950 p-4 text-white dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Health</p>
                    <p className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">
                      {healthScore(project.status, project.progress_percent)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">score operacyjny</p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                  <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${project.progress_percent}%` }} />
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Nadchodzace spotkania" description="Najblizsze wydarzenia, ktore pchaja decyzje i execution.">
            <div className="space-y-3">
              {nextMeetings.map((meeting) => (
                <article key={meeting.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{meeting.title}</p>
                      <p className="mt-1 text-muted">{meeting.location ?? meeting.online_url ?? "Spotkanie bez lokalizacji"}</p>
                    </div>
                    <Badge>{meeting.meeting_type}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted">{new Date(meeting.start_at).toLocaleString("pl-PL")}</p>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Decyzje i komunikaty" description="To co organizacja musi przeczytac i zamknac.">
            <div className="space-y-3">
              {activePolls.map((poll) => (
                <article key={poll.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{poll.title}</p>
                      <p className="mt-1 text-muted">{poll.description}</p>
                    </div>
                    <Badge tone="warning">glosowanie</Badge>
                  </div>
                </article>
              ))}
              {spotlightAnnouncements.map((announcement) => (
                <article key={announcement.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{announcement.title}</p>
                      <p className="mt-1 text-muted">{announcement.content}</p>
                    </div>
                    {announcement.is_pinned ? <Badge tone="success">pin</Badge> : <Badge>info</Badge>}
                  </div>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Sygnal zespolowy" description="Szybkie spojrzenie na skale organizacji i obciazenia.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-white/60 p-4 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-accentSoft p-3 text-accent">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Ludzie</p>
                    <p className="text-xl font-bold">{overview?.members ?? projects.reduce((sum, project) => sum + project.member_count, 0)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[22px] bg-white/60 p-4 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-accentSoft p-3 text-accent">
                    <FolderKanban size={18} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Portfel</p>
                    <p className="text-xl font-bold">{projects.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
