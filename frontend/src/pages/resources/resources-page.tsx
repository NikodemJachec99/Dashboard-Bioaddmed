import { useQuery } from "@tanstack/react-query";

import { fetchResources, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function ResourcesPage() {
  const { data: resources = [] } = useQuery({ queryKey: queryKeys.resources, queryFn: fetchResources });

  return (
    <>
      <PageHeader
        eyebrow="Infrastruktura"
        title="Zasoby i rezerwacje"
        description="Zarządzanie sprzętem laboratoryjnym, salami i wspólną infrastrukturą."
      />
      <SectionCard title="Dostępne zasoby">
        <div className="grid gap-4 xl:grid-cols-2">
          {resources.map((resource) => (
            <article key={resource.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <h3 className="font-semibold">{resource.title}</h3>
              <p className="mt-2 text-sm text-muted">{resource.description}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-accent">{resource.location}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

