import { useQuery } from "@tanstack/react-query";

import { fetchPolls, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";

export function PollsPage() {
  const { data: polls = [] } = useQuery({ queryKey: queryKeys.polls, queryFn: fetchPolls });

  return (
    <>
      <PageHeader
        eyebrow="Decyzje"
        title="Głosowania"
        description="Formalne decyzje organizacyjne i projektowe z kontrolą quorum oraz wyników."
        actions={<Button>Nowe głosowanie</Button>}
      />
      <SectionCard title="Aktywne ankiety">
        <div className="space-y-4">
          {polls.map((poll) => (
            <article key={poll.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{poll.title}</h3>
                  <p className="mt-1 text-sm text-muted">{poll.description}</p>
                </div>
                <Button variant="secondary">Oddaj głos</Button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

