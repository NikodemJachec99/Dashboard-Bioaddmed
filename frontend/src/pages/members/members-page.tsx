import { currentUser, projects } from "@/lib/mock-data";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function MembersPage() {
  const members = projects.flatMap((project) => project.memberships);

  return (
    <>
      <PageHeader
        eyebrow="Ludzie"
        title="Członkowie i kompetencje"
        description="Przegląd zaangażowania, ról projektowych i kompetencji zespołu."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.48fr]">
        <SectionCard title="Aktywni członkowie">
          <div className="space-y-4">
            {members.map((member) => (
              <article key={`${member.id}-${member.user_email}`} className="rounded-[24px] bg-white/60 p-5 dark:bg-white/5">
                <h3 className="font-semibold">{member.user_name}</h3>
                <p className="mt-1 text-sm text-muted">{member.user_email}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-accent">{member.project_role}</p>
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Profil wzorcowy">
          <div className="space-y-2 text-sm text-muted">
            <p className="font-semibold text-foreground">{currentUser.first_name} {currentUser.last_name}</p>
            <p>{currentUser.email}</p>
            <p>Specjalizacja: biomateriały + product ops</p>
            <p>Dostępność: 12h / tydzień</p>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

