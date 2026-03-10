import { useQuery } from "@tanstack/react-query";

import { fetchMeetings, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function CalendarPage() {
  const { data: meetings = [] } = useQuery({ queryKey: queryKeys.meetings, queryFn: fetchMeetings });

  return (
    <>
      <PageHeader
        eyebrow="Harmonogram"
        title="Kalendarz spotkań"
        description="Widok operacyjny dla spotkań ogólnych, projektowych i zarządowych."
      />
      <SectionCard title="Najbliższe wydarzenia">
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <article key={meeting.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{meeting.title}</h3>
                  <p className="mt-2 text-sm text-muted">{meeting.description}</p>
                </div>
                <p className="text-sm text-muted">{meeting.meeting_type}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

