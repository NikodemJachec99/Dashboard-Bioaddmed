import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchProjects, queryKeys } from "@/api/queries";
import { KanbanBoard } from "@/components/common/kanban-board";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function ProjectDetailPage() {
  const { slug } = useParams();
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const project = useMemo(() => projects.find((item) => item.slug === slug) ?? projects[0], [projects, slug]);

  const columns = [
    { id: 1, name: "To Do", order: 0, color: "#3b82f6", tasks: project?.tasks?.filter((task) => task.status === "todo") ?? [] },
    { id: 2, name: "In Progress", order: 1, color: "#06b6d4", tasks: project?.tasks?.filter((task) => task.status === "in_progress") ?? [] },
    { id: 3, name: "Review", order: 2, color: "#f59e0b", tasks: project?.tasks?.filter((task) => task.status === "review") ?? [] },
  ];

  if (!project) {
    return null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Projekt"
        title={project.name}
        description={project.full_description ?? project.short_description}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.42fr]">
        <SectionCard title="Kanban" description="Bieżąca praca, blokery i review w układzie projektowym.">
          <KanbanBoard columns={columns} />
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="Zespół">
            <div className="space-y-3">
              {project.memberships.map((membership) => (
                <article key={membership.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
                  <p className="font-semibold">{membership.user_name}</p>
                  <p className="text-muted">{membership.project_role}</p>
                </article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Status projektu">
            <div className="space-y-2 text-sm text-muted">
              <p>Etap: {project.stage}</p>
              <p>Status: {project.status}</p>
              <p>Progress: {project.progress_percent}%</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}

