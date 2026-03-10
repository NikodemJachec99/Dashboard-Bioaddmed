import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchReports, generateReport, getReportDownloadUrl, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";

export function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reportType, setReportType] = useState("summary");
  const { data: reports = [] } = useQuery({ queryKey: queryKeys.reports, queryFn: fetchReports });
  const generateMutation = useMutation({
    mutationFn: (type: string) => generateReport(type),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reports });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Analityka"
        title="Raporty i snapshoty"
        description="Widoki eksportów, raportów operacyjnych i historii generacji."
      />
      {user?.global_role === "admin" ? (
        <SectionCard title="Generator CSV">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="h-11 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
            >
              <option value="summary">summary</option>
              <option value="projects">projects</option>
              <option value="tasks">tasks</option>
              <option value="meetings">meetings</option>
            </select>
            <Button onClick={() => generateMutation.mutate(reportType)} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? "Generowanie..." : "Generuj raport"}
            </Button>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard title="Historia raportów">
        <div className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="rounded-[24px] bg-white/60 p-5 text-sm dark:bg-white/5">
              <p className="font-semibold">{report.report_type}</p>
              <p className="mt-1 text-muted">{report.file_path}</p>
              <div className="mt-3">
                <a className="text-accent underline" href={getReportDownloadUrl(report.id)} target="_blank" rel="noreferrer">
                  Pobierz CSV
                </a>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
