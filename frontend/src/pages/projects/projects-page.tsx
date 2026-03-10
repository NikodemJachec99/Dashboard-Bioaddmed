import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchProjects, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FolderKanban, Trophy, Users } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

function getStatusTone(status: string) {
  if (status === "at_risk") return "warning";
  if (status === "blocked") return "danger";
  if (status === "completed") return "success";
  return "default";
}

function healthCopy(status: string, progress: number) {
  if (status === "blocked") return "Projekt stoi. Potrzebna szybka decyzja od ownera.";
  if (status === "at_risk") return "Tempo spada, trzeba domknac blokery i ownership.";
  if (progress >= 85) return "Projekt blisko finalizacji i gotowy do domkniecia.";
  if (progress >= 50) return "Projekt jest w ruchu i utrzymuje zdrowy rytm pracy.";
  return "Projekt jest we wczesnej lub niestabilnej fazie realizacji.";
}

function getStageLabel(stage: string) {
  return stage.replaceAll("_", " ");
}

export function ProjectsPage() {
  const { user } = useAuth();
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredProjects = useMemo(
    () =>
      projects
        .filter((project) => (statusFilter === "all" ? true : project.status === statusFilter))
        .filter((project) => {
          const phrase = search.toLowerCase().trim();
          if (!phrase) return true;
          return `${project.name} ${project.short_description} ${project.category} ${project.stage}`.toLowerCase().includes(phrase);
        }),
    [projects, search, statusFilter],
  );

  const totalMembers = useMemo(
    () => projects.reduce((sum, project) => sum + project.memberships.filter((membership) => membership.is_active !== false).length, 0),
    [projects],
  );
  const blockedCount = useMemo(() => projects.filter((project) => project.status === "blocked").length, [projects]);
  const averageProgress = useMemo(
    () => (projects.length > 0 ? Math.round(projects.reduce((sum, project) => sum + project.progress_percent, 0) / projects.length) : 0),
    [projects],
  );

  return (
    <>
      <PageHeader
        eyebrow="Project Portfolio"
        title="Projekty i health portfela"
        description="To nie jest zwykla lista. To mapa aktywnych inicjatyw z sygnalami ryzyka, impetu i gotowosci do dowiezienia."
        actions={
          user?.global_role === "admin" ? (
            <Link to="/admin">
              <Button>Nowy projekt</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Projekty" value={projects.length} detail="Caly portfel aktywnych i historycznych inicjatyw widocznych w systemie." icon={<FolderKanban size={18} />} />
        <StatCard label="Sredni progress" value={`${averageProgress}%`} detail="Przyblizona srednia realizacji calego portfela." tone="success" icon={<Trophy size={18} />} />
        <StatCard label="Aktywny zespol" value={totalMembers} detail="Suma aktywnych przypisan projektowych w calym portfelu." icon={<Users size={18} />} />
        <StatCard label="Blokowane projekty" value={blockedCount} detail="Tyle projektow wymaga natychmiastowej decyzji lub odblokowania." tone={blockedCount > 0 ? "danger" : "success"} icon={<Calendar size={18} />} />
      </div>

      <SectionCard title="Portfel projektow" description="Bogatszy widok projektu: status, etap, sklad, linki i poziom dojrzalosci realizacji.">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input placeholder="Szukaj po nazwie, opisie, kategorii, etapie" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select
            className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">all</option>
            <option value="active">active</option>
            <option value="at_risk">at_risk</option>
            <option value="blocked">blocked</option>
            <option value="completed">completed</option>
            <option value="archived">archived</option>
          </select>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {filteredProjects.map((project) => {
            const memberCount = project.memberships.filter((membership) => membership.is_active !== false).length;
            const coordinators = project.memberships.filter((membership) => membership.project_role === "coordinator" && membership.is_active !== false);
            const githubLinks = (project.links ?? []).filter((link) => link.type === "github").length;
            const driveLinks = (project.links ?? []).filter((link) => link.type === "google_drive").length;

            return (
              <Link
                key={project.id}
                to={`/projects/${project.slug}`}
                className="group relative overflow-hidden rounded-[30px] border border-white/25 bg-gradient-to-br from-white/80 to-slate-50/60 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-glass dark:border-white/10 dark:from-slate-950/80 dark:to-slate-900/70"
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(14,165,233,0.08),transparent)] opacity-80 transition group-hover:opacity-100 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.08),transparent)]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold tracking-[-0.03em]">{project.name}</h3>
                        <Badge tone={getStatusTone(project.status)}>{project.status}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted">{project.short_description}</p>
                    </div>
                    <div className="rounded-[22px] bg-slate-950 px-4 py-3 text-right text-white dark:bg-slate-900">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Progress</p>
                      <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em]">{project.progress_percent}%</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-muted">{healthCopy(project.status, project.progress_percent)}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Etap</p>
                      <p className="mt-2 font-semibold capitalize">{getStageLabel(project.stage)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Zespol</p>
                      <p className="mt-2 font-semibold">{memberCount} osob</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">GitHub</p>
                      <p className="mt-2 font-semibold">{githubLinks} linki</p>
                    </div>
                    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Drive</p>
                      <p className="mt-2 font-semibold">{driveLinks} linki</p>
                    </div>
                  </div>

                  <div className="mt-5 h-2 rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                    <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${project.progress_percent}%` }} />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {coordinators.slice(0, 2).map((membership) => (
                      <Badge key={membership.id}>{membership.user_name}</Badge>
                    ))}
                    {coordinators.length === 0 ? <Badge>brak koordynatora</Badge> : null}
                    <Badge>{project.category}</Badge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
