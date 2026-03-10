import { currentUser, projects } from "@/lib/mock-data";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function AdminPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Panel administracyjny"
        description="Zarządzanie użytkownikami, przypisaniami projektowymi, publikacjami i zdrowiem systemu."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="System">
          <div className="space-y-3 text-sm text-muted">
            <p>Host: bioaddmed.bieda.it</p>
            <p>Deploy: Docker Compose + Nginx + Gunicorn + Redis + Celery</p>
            <p>Operator: {currentUser.first_name} {currentUser.last_name}</p>
          </div>
        </SectionCard>
        <SectionCard title="Priorytety administracyjne">
          <div className="space-y-3">
            {projects.map((project) => (
              <article key={project.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
                <p className="font-semibold">{project.name}</p>
                <p className="text-muted">{project.status}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
