import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { fetchProjects, fetchReports, generateReport, getReportDownloadUrl, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderKanban, ScrollText, Trophy, Users } from "@/components/ui/icons";

const REPORT_TEMPLATES = [
  {
    id: "summary",
    title: "Executive summary",
    description: "Syntetyczny obraz portfolio, blokad i aktywnosci operacyjnej dla zarzadu.",
    tone: "default" as const,
  },
  {
    id: "projects",
    title: "Portfolio projektow",
    description: "Statusy, etapy, progres, linki i health sygnaly dla kazdego projektu.",
    tone: "success" as const,
  },
  {
    id: "tasks",
    title: "Wykonanie taskow",
    description: "Blockery, terminy, obciazenie i przeplyw pracy po tablicach kanban.",
    tone: "warning" as const,
  },
  {
    id: "meetings",
    title: "Cadence spotkan",
    description: "Frekwencja, action items i zdolnosc do zamiany decyzji na taski.",
    tone: "danger" as const,
  },
];

function formatDate(date?: string | null) {
  if (!date) return "brak";
  return new Date(date).toLocaleString("pl-PL");
}

function describeApiError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do generowania raportow.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: reports = [] } = useQuery({ queryKey: queryKeys.reports, queryFn: fetchReports });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    reportType: "summary",
    projectId: "",
    dateFrom: "",
    dateTo: "",
    focus: "operational",
    includeArchived: "false",
  });

  const orderedReports = useMemo(
    () => [...reports].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()),
    [reports],
  );

  const reportsLast7Days = orderedReports.filter((report) => Date.now() - new Date(report.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  const projectScopedReports = orderedReports.filter((report) => Boolean(report.parameters_json?.project_id)).length;
  const myReports = orderedReports.filter((report) => report.generated_by === user?.id).length;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const parameters: Record<string, unknown> = {
        focus: form.focus,
        include_archived: form.includeArchived === "true",
      };

      if (form.projectId) parameters.project_id = Number(form.projectId);
      if (form.dateFrom) parameters.date_from = form.dateFrom;
      if (form.dateTo) parameters.date_to = form.dateTo;

      return generateReport(form.reportType, parameters);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      setFeedback("Raport zostal wygenerowany i trafil do historii snapshotow.");
      setError(null);
    },
    onError: (mutationError) => setError(describeApiError(mutationError, "Nie udalo sie wygenerowac raportu.")),
  });

  return (
    <>
      <PageHeader
        eyebrow="Reporting"
        title="Raporty, snapshoty i gotowe eksporty dla operacji"
        description="To nie jest tylko lista plikow CSV. To panel do regularnej kontroli portfolio, postepu wykonania i rytmu spotkan."
        actions={
          <div className="flex flex-wrap gap-3">
            <Badge tone="success">{reportsLast7Days} w 7 dni</Badge>
            <Badge>{projectScopedReports} scoped</Badge>
            <Badge tone="warning">{orderedReports.length} snapshotow</Badge>
          </div>
        }
      />

      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Wszystkie snapshoty" value={orderedReports.length} detail="Pelna historia raportow gotowych do pobrania lub audytu." icon={<ScrollText size={18} />} />
        <StatCard label="Raporty projektowe" value={projectScopedReports} detail="Eksporty zawierajace konkretny kontekst projektu." tone="success" icon={<FolderKanban size={18} />} />
        <StatCard label="Moje wygenerowane" value={myReports} detail="Ile raportow wygenerowales z obecnego konta." tone="warning" icon={<Users size={18} />} />
        <StatCard label="Rytm tygodniowy" value={reportsLast7Days} detail="Czy zespol raportuje regularnie, czy tylko reaktywnie." tone="danger" icon={<Trophy size={18} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <SectionCard title="Szablony raportowania" description="Wybierz punkt startowy. Kazdy preset ustawia nieco inna narracje raportu." action={user?.global_role === "admin" ? <Badge tone="warning">admin mode</Badge> : null}>
          <div className="grid gap-4 md:grid-cols-2">
            {REPORT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className={[
                  "rounded-[28px] border p-5 text-left transition",
                  form.reportType === template.id
                    ? "border-accent bg-accent/10 shadow-[0_18px_45px_rgba(14,165,233,0.12)]"
                    : "border-white/40 bg-white/70 dark:border-white/10 dark:bg-white/5",
                ].join(" ")}
                onClick={() => setForm((prev) => ({ ...prev, reportType: template.id }))}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{template.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted">{template.description}</p>
                  </div>
                  <Badge tone={template.tone}>{template.id}</Badge>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={user?.global_role === "admin" ? "Generator CSV" : "Dostep do historii"}
          description={
            user?.global_role === "admin"
              ? "Zawaz kontekst raportu, zakres czasu i fokus operacyjny. Parametry trafiaja do snapshotu i pozwalaja odtworzyc logike generacji."
              : "Nie masz generatora globalnego. Nadal widzisz gotowe raporty i mozesz pobrac eksport udostepniony przez system."
          }
        >
          {user?.global_role === "admin" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={form.reportType}
                onChange={(event) => setForm((prev) => ({ ...prev, reportType: event.target.value }))}
              >
                {REPORT_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.id}
                  </option>
                ))}
              </select>
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={form.projectId}
                onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
              >
                <option value="">Wszystkie projekty</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <Input type="date" value={form.dateFrom} onChange={(event) => setForm((prev) => ({ ...prev, dateFrom: event.target.value }))} />
              <Input type="date" value={form.dateTo} onChange={(event) => setForm((prev) => ({ ...prev, dateTo: event.target.value }))} />
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={form.focus}
                onChange={(event) => setForm((prev) => ({ ...prev, focus: event.target.value }))}
              >
                <option value="operational">Operational focus</option>
                <option value="governance">Governance focus</option>
                <option value="delivery">Delivery focus</option>
              </select>
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={form.includeArchived}
                onChange={(event) => setForm((prev) => ({ ...prev, includeArchived: event.target.value }))}
              >
                <option value="false">Bez archiwum</option>
                <option value="true">Z archiwum</option>
              </select>
              <div className="md:col-span-2">
                <Button className="h-12 w-full" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? "Generowanie..." : "Wygeneruj snapshot CSV"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm leading-6 text-muted">
              <p>Raporty sluza tu jako warstwa operacyjna i audytowa. Dostep do generatora ma tylko admin, ale historia pobran pozostaje czytelna.</p>
              <p>Jesli potrzebujesz nowego eksportu dla projektu, skontaktuj sie z administratorem albo wlascicielem strumienia raportowego.</p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Historia raportow" description="Kazdy rekord to powtarzalny snapshot z zestawem parametrow. To wazne dla audytu, porownan i powrotu do konkretnego stanu danych.">
        <div className="grid gap-4 lg:grid-cols-2">
          {orderedReports.length > 0 ? (
            orderedReports.map((report) => (
              <article
                key={report.id}
                className="rounded-[28px] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(247,250,255,0.74))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="success">{report.report_type}</Badge>
                      {report.parameters_json?.project_id ? <Badge>project scoped</Badge> : <Badge>globalny</Badge>}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em]">{report.file_path.split("/").pop()}</h3>
                    <p className="mt-2 text-sm text-muted">Wygenerowano: {formatDate(report.created_at)}</p>
                    <p className="mt-1 text-sm text-muted">Autor: {report.generated_by_email || "system"}</p>
                  </div>
                  <a className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent/20" href={getReportDownloadUrl(report.id)} target="_blank" rel="noreferrer">
                    Pobierz CSV
                  </a>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-white/70 px-4 py-3 text-sm dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Zakres</p>
                    <p className="mt-2 font-semibold">
                      {(report.parameters_json?.date_from as string | undefined) || "od poczatku"} - {(report.parameters_json?.date_to as string | undefined) || "teraz"}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/70 px-4 py-3 text-sm dark:bg-white/5">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Focus</p>
                    <p className="mt-2 font-semibold">{(report.parameters_json?.focus as string | undefined) || "operational"}</p>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-muted">Brak wygenerowanych raportow. Zacznij od executive summary albo raportu projektowego.</p>
          )}
        </div>
      </SectionCard>
    </>
  );
}
