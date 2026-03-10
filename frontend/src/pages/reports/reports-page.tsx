import { useQuery } from "@tanstack/react-query";

import { fetchReports, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function ReportsPage() {
  const { data: reports = [] } = useQuery({ queryKey: queryKeys.reports, queryFn: fetchReports });

  return (
    <>
      <PageHeader
        eyebrow="Analityka"
        title="Raporty i snapshoty"
        description="Widoki eksportów, raportów operacyjnych i historii generacji."
      />
      <SectionCard title="Historia raportów">
        <div className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="rounded-[24px] bg-white/60 p-5 text-sm dark:bg-white/5">
              <p className="font-semibold">{report.report_type}</p>
              <p className="mt-1 text-muted">{report.file_path}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

