import { useQuery } from "@tanstack/react-query";

import { fetchKnowledge, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";

export function KnowledgePage() {
  const { data: articles = [] } = useQuery({ queryKey: queryKeys.knowledge, queryFn: fetchKnowledge });

  return (
    <>
      <PageHeader
        eyebrow="Wiedza"
        title="Baza wiedzy"
        description="Artykuły onboardingowe, standardy pracy, checklisty i lessons learned."
      />
      <SectionCard title="Artykuły">
        <div className="grid gap-4 xl:grid-cols-2">
          {articles.map((article) => (
            <article key={article.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{article.title}</h3>
                  <p className="mt-2 text-sm text-muted">{article.content}</p>
                </div>
                {article.is_pinned ? <Badge>Pin</Badge> : null}
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

