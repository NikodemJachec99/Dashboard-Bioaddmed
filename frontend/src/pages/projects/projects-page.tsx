import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchProjects, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProjectsPage() {
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Projekty"
        description="Centralny rejestr aktywnych inicjatyw badawczych, organizacyjnych i inżynierskich."
        actions={<Button>Nowy projekt</Button>}
      />
      <SectionCard title="Lista projektów" description="Karty z kluczowymi sygnałami statusu, etapu i obciążenia.">
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.slug}`} className="rounded-[28px] border border-white/20 bg-white/60 p-6 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{project.name}</h3>
                  <p className="mt-2 text-sm text-muted">{project.short_description}</p>
                </div>
                <Badge tone={project.status === "at_risk" ? "warning" : "default"}>{project.status}</Badge>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm text-muted">
                <span>{project.category}</span>
                <span>{project.progress_percent}%</span>
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

