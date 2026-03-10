import { useQuery } from "@tanstack/react-query";

import { fetchAnnouncements, fetchMeetings, fetchPolls, fetchProjects, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";

function statusTone(status: string) {
  if (status === "at_risk") return "warning";
  if (status === "blocked") return "danger";
  if (status === "completed") return "success";
  return "default";
}

export function DashboardPage() {
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const { data: meetings = [] } = useQuery({ queryKey: queryKeys.meetings, queryFn: fetchMeetings });
  const { data: polls = [] } = useQuery({ queryKey: queryKeys.polls, queryFn: fetchPolls });
  const { data: announcements = [] } = useQuery({ queryKey: queryKeys.announcements, queryFn: fetchAnnouncements });
  const riskyProjects = projects.filter((project) => project.status === "at_risk" || project.status === "blocked");

  return (
    <>
      <PageHeader
        eyebrow="Operacje"
        title="Dashboard BioAddMed"
        description="Pełny status projektów, aktywności i sygnałów ryzyka dostępny dla całego zespołu."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aktywne projekty" value={projects.length} delta="+2" />
        <StatCard label="Ryzyko / blokery" value={riskyProjects.length} />
        <StatCard label="Najbliższe spotkania" value={meetings.length} />
        <StatCard label="Aktywne głosowania" value={polls.length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <SectionCard title="Status wszystkich projektów" description="Każdy użytkownik widzi etap, status i postęp wszystkich projektów.">
          <div className="space-y-4">
            {projects.map((project) => (
              <article key={project.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{project.name}</h3>
                    <p className="mt-2 text-sm text-muted">{project.short_description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                      <Badge>{project.stage}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{project.progress_percent}%</p>
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
          <SectionCard title="Nadchodzące spotkania">
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <article key={meeting.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <p className="font-semibold">{meeting.title}</p>
                  <p className="mt-1 text-muted">{meeting.location ?? meeting.online_url ?? "Spotkanie bez lokalizacji"}</p>
                </article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Aktywne głosowania i ogłoszenia">
            <div className="space-y-3">
              {polls.map((poll) => (
                <article key={poll.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <p className="font-semibold">{poll.title}</p>
                  <p className="mt-1 text-muted">{poll.description}</p>
                </article>
              ))}
              {announcements.map((announcement) => (
                <article key={announcement.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="mt-1 text-muted">{announcement.content}</p>
                </article>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
