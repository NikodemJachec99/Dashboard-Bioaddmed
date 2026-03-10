import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchProjects, fetchUsers, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";

type UserStats = {
  projectCount: number;
  coordinatorCount: number;
};

export function MembersPage() {
  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });

  const statsByUser = useMemo(() => {
    const map = new Map<number, UserStats>();
    users.forEach((user) => map.set(user.id, { projectCount: 0, coordinatorCount: 0 }));

    projects.forEach((project) => {
      project.memberships?.forEach((membership) => {
        const entry = map.get(membership.user) ?? { projectCount: 0, coordinatorCount: 0 };
        if (membership.is_active !== false) {
          entry.projectCount += 1;
          if (membership.project_role === "coordinator") {
            entry.coordinatorCount += 1;
          }
        }
        map.set(membership.user, entry);
      });
    });

    return map;
  }, [projects, users]);

  return (
    <>
      <PageHeader
        eyebrow="Ludzie"
        title="Członkowie i kompetencje"
        description="Pełna lista użytkowników aplikacji i ich aktywności projektowej."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.48fr]">
        <SectionCard title="Użytkownicy aplikacji">
          <div className="space-y-4">
            {users.map((entry) => {
              const stats = statsByUser.get(entry.id) ?? { projectCount: 0, coordinatorCount: 0 };
              return (
                <article key={entry.id} className="rounded-[24px] bg-white/60 p-5 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">
                        {entry.first_name} {entry.last_name}
                      </h3>
                      <p className="mt-1 text-sm text-muted">{entry.email}</p>
                    </div>
                    <Badge tone={entry.global_role === "admin" ? "warning" : "default"}>{entry.global_role}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <span>Projekty: {stats.projectCount}</span>
                    <span>Koordynator: {stats.coordinatorCount}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="Podsumowanie">
          <div className="space-y-2 text-sm text-muted">
            <p className="font-semibold text-foreground">Łącznie użytkowników: {users.length}</p>
            <p>Adminów: {users.filter((entry) => entry.global_role === "admin").length}</p>
            <p>Aktywnych projektów: {projects.length}</p>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
