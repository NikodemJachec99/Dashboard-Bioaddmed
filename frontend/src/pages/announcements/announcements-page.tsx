import { useQuery } from "@tanstack/react-query";

import { fetchAnnouncements, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function AnnouncementsPage() {
  const { data: items = [] } = useQuery({ queryKey: queryKeys.announcements, queryFn: fetchAnnouncements });

  return (
    <>
      <PageHeader
        eyebrow="Komunikacja"
        title="Ogłoszenia"
        description="Istotne komunikaty operacyjne bez gubienia ich w komunikatorach."
      />
      <SectionCard title="Aktualne publikacje">
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.content}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

