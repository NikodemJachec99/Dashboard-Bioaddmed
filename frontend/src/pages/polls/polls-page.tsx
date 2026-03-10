import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  closePoll,
  createPoll,
  createPollOption,
  fetchPollResults,
  fetchPolls,
  fetchProjects,
  fetchUsers,
  queryKeys,
  voteInPoll,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderKanban, RadioTower, Users } from "@/components/ui/icons";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 409) return "Konflikt glosowania. Odswiez dane i sprobuj ponownie.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function pollTone(status: string) {
  if (status === "closed") return "success";
  if (status === "draft") return "default";
  if (status === "active") return "warning";
  return "danger";
}

function quorumLabel(required?: number, met?: boolean) {
  if (!required) return "bez quorum";
  return met ? `quorum ${required} spelnione` : `quorum ${required} niespelnione`;
}

export function PollsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.global_role === "admin";
  const { data: polls = [] } = useQuery({ queryKey: queryKeys.polls, queryFn: fetchPolls });
  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    poll_type: "single",
    audience_type: "global",
    visibility_type: "public",
    related_project: "",
    starts_at: "",
    ends_at: "",
    quorum_required: "1",
    threshold_type: "simple_majority",
  });
  const [optionDraft, setOptionDraft] = useState("");
  const [options, setOptions] = useState<string[]>(["Za", "Przeciw"]);
  const [eligibleUsers, setEligibleUsers] = useState<number[]>([]);

  const filteredPolls = useMemo(
    () =>
      polls.filter((poll) => {
        const matchesStatus = statusFilter === "all" || poll.status === statusFilter;
        const matchesAudience = audienceFilter === "all" || poll.audience_type === audienceFilter;
        const phrase = search.trim().toLowerCase();
        const matchesQuery = !phrase || `${poll.title} ${poll.description} ${poll.poll_type}`.toLowerCase().includes(phrase);
        return matchesStatus && matchesAudience && matchesQuery;
      }),
    [audienceFilter, polls, search, statusFilter],
  );

  const activePolls = filteredPolls.filter((poll) => poll.status === "active");
  const archivedPolls = filteredPolls.filter((poll) => poll.status !== "active");
  const selectedPoll = useMemo(() => polls.find((poll) => poll.id === selectedPollId) ?? activePolls[0] ?? archivedPolls[0] ?? null, [activePolls, archivedPolls, polls, selectedPollId]);
  const { data: results } = useQuery({
    queryKey: ["poll-results", selectedPoll?.id],
    queryFn: () => fetchPollResults(selectedPoll!.id),
    enabled: Boolean(selectedPoll?.id),
  });

  const createPollMutation = useMutation({
    mutationFn: createPoll,
    onSuccess: async (poll) => {
      const labels = options.map((entry) => entry.trim()).filter(Boolean);
      for (let index = 0; index < labels.length; index += 1) {
        await createPollOption(poll.id, { label: labels[index], order: index + 1 });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      setOptions(["Za", "Przeciw"]);
      setEligibleUsers([]);
      setOptionDraft("");
      setNewPoll({
        title: "",
        description: "",
        poll_type: "single",
        audience_type: "global",
        visibility_type: "public",
        related_project: "",
        starts_at: "",
        ends_at: "",
        quorum_required: "1",
        threshold_type: "simple_majority",
      });
      setFeedback("Glosowanie zostalo utworzone.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie utworzyc glosowania.")),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: number; optionId: number }) => voteInPoll(pollId, [optionId]),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      await queryClient.invalidateQueries({ queryKey: ["poll-results", vars.pollId] });
      setFeedback("Glos zostal zapisany.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie oddac glosu.")),
  });

  const closeMutation = useMutation({
    mutationFn: closePoll,
    onSuccess: async (_, pollId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      await queryClient.invalidateQueries({ queryKey: ["poll-results", pollId] });
      setFeedback("Glosowanie zostalo zamkniete.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zamknac glosowania.")),
  });

  return (
    <>
      <PageHeader
        eyebrow="Governance"
        title="Glosowania i decyzje formalne"
        description="Widok ma prowadzic przez caly cykl: konfiguracje odbiorcow, quorum, glosowanie, zamkniecie i czytelne wyniki."
        actions={
          <div className="flex flex-wrap gap-3">
            <Badge tone="warning">{activePolls.length} aktywnych</Badge>
            <Badge>{archivedPolls.length} archiwalnych</Badge>
            <Badge tone="success">{polls.filter((poll) => poll.audience_type === "project").length} projektowych</Badge>
          </div>
        }
      />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Aktywne decyzje" value={activePolls.length} detail="Glosowania, ktore wymagaja glosow albo zamkniecia." icon={<RadioTower size={18} />} tone="warning" />
        <StatCard label="Udzial odbiorcow" value={polls.filter((poll) => poll.audience_type === "selected_users").length} detail="Ile glosowan jest celowanych na wybrane grupy." icon={<Users size={18} />} />
        <StatCard label="Projektowe governance" value={polls.filter((poll) => poll.related_project).length} detail="Decyzje osadzone w konkretnych projektach." tone="success" icon={<FolderKanban size={18} />} />
        <StatCard label="Presja decyzyjna" value={polls.filter((poll) => poll.status === "active" && poll.visibility_type === "anonymous").length} detail="Aktywne glosowania anonimowe zwykle oznaczaja bardziej wrazliwe decyzje." tone="danger" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        {isAdmin ? (
          <SectionCard title="Studio nowego glosowania" description="Konfiguracja jest pelna: audience, visibility, quorum, progi oraz lista opcji i uprawnionych glosujacych.">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Tytul" value={newPoll.title} onChange={(event) => setNewPoll((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Opis" value={newPoll.description} onChange={(event) => setNewPoll((prev) => ({ ...prev, description: event.target.value }))} />
              <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={newPoll.poll_type} onChange={(event) => setNewPoll((prev) => ({ ...prev, poll_type: event.target.value }))}>
                <option value="single">single</option>
                <option value="multiple">multiple</option>
              </select>
              <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={newPoll.audience_type} onChange={(event) => setNewPoll((prev) => ({ ...prev, audience_type: event.target.value }))}>
                <option value="global">global</option>
                <option value="project">project</option>
                <option value="selected_users">selected_users</option>
              </select>
              <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={newPoll.visibility_type} onChange={(event) => setNewPoll((prev) => ({ ...prev, visibility_type: event.target.value }))}>
                <option value="public">public</option>
                <option value="anonymous">anonymous</option>
              </select>
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={newPoll.related_project}
                onChange={(event) => setNewPoll((prev) => ({ ...prev, related_project: event.target.value }))}
                disabled={newPoll.audience_type !== "project"}
              >
                <option value="">Bez projektu</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <Input type="datetime-local" value={newPoll.starts_at} onChange={(event) => setNewPoll((prev) => ({ ...prev, starts_at: event.target.value }))} />
              <Input type="datetime-local" value={newPoll.ends_at} onChange={(event) => setNewPoll((prev) => ({ ...prev, ends_at: event.target.value }))} />
              <Input type="number" min={1} placeholder="Quorum" value={newPoll.quorum_required} onChange={(event) => setNewPoll((prev) => ({ ...prev, quorum_required: event.target.value }))} />
              <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={newPoll.threshold_type} onChange={(event) => setNewPoll((prev) => ({ ...prev, threshold_type: event.target.value }))}>
                <option value="simple_majority">simple_majority</option>
                <option value="absolute_majority">absolute_majority</option>
                <option value="two_thirds">two_thirds</option>
                <option value="unanimous">unanimous</option>
              </select>
            </div>

            {newPoll.audience_type === "selected_users" ? (
              <div className="tile-soft mt-4 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Uprawnieni do glosowania</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {users.map((entry) => {
                    const checked = eligibleUsers.includes(entry.id);
                    return (
                      <label key={entry.id} className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-3 text-sm dark:bg-white/5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setEligibleUsers((prev) => (event.target.checked ? [...prev, entry.id] : prev.filter((id) => id !== entry.id)))}
                        />
                        {entry.first_name} {entry.last_name} ({entry.email})
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="tile-soft mt-4 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Opcje glosowania</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {options.map((option) => (
                  <Badge key={option}>{option}</Badge>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input placeholder="Nowa opcja" value={optionDraft} onChange={(event) => setOptionDraft(event.target.value)} />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!optionDraft.trim()) return;
                    setOptions((prev) => [...prev, optionDraft.trim()]);
                    setOptionDraft("");
                  }}
                >
                  Dodaj opcje
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Button
                className="h-12 w-full"
                onClick={() =>
                  createPollMutation.mutate({
                    title: newPoll.title,
                    description: newPoll.description,
                    poll_type: newPoll.poll_type,
                    audience_type: newPoll.audience_type,
                    visibility_type: newPoll.visibility_type,
                    related_project: newPoll.related_project ? Number(newPoll.related_project) : null,
                    eligible_users: newPoll.audience_type === "selected_users" ? eligibleUsers : [],
                    starts_at: new Date(newPoll.starts_at).toISOString(),
                    ends_at: new Date(newPoll.ends_at).toISOString(),
                    quorum_required: Number(newPoll.quorum_required) || 1,
                    threshold_type: newPoll.threshold_type,
                    status: "active",
                  })
                }
                disabled={!newPoll.title || !newPoll.starts_at || !newPoll.ends_at || options.length < 2 || createPollMutation.isPending}
              >
                {createPollMutation.isPending ? "Tworzenie..." : "Utworz glosowanie"}
              </Button>
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Jak czytac ten ekran" description="Dla membera to panel uczestnictwa, dla admina to panel governance.">
            <div className="space-y-4 text-sm leading-6 text-muted">
              <p>Aktywne glosowania powinny byc czytelne jako lista decyzji wymagajacych reakcji, a nie jako techniczna tabela rekordow.</p>
              <p>Wyniki po prawej pozwalaja ocenic frekwencje, quorum i realny rozklad glosow bez opuszczania widoku.</p>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Filtry i aktywne glosowania" description="Kafle glosowan rozdzielaja status, audience i sam akt glosowania, zeby decyzje nie zlewaly sie w jedna liste.">
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Input placeholder="Szukaj po tytule lub opisie..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Kazdy status</option>
              <option value="active">active</option>
              <option value="closed">closed</option>
              <option value="draft">draft</option>
            </select>
            <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}>
              <option value="all">Kazde audience</option>
              <option value="global">global</option>
              <option value="project">project</option>
              <option value="selected_users">selected_users</option>
            </select>
          </div>

          <div className="grid gap-4">
            {filteredPolls.map((poll) => (
              <article
                key={poll.id}
                className="tile-soft cursor-pointer p-5 transition hover:-translate-y-0.5"
                onClick={() => setSelectedPollId(poll.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={pollTone(poll.status)}>{poll.status}</Badge>
                      <Badge>{poll.poll_type}</Badge>
                      <Badge>{poll.audience_type}</Badge>
                      <Badge>{poll.visibility_type}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{poll.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{poll.description}</p>
                  </div>
                  <div className="min-w-[180px] rounded-[22px] bg-slate-950 p-4 text-white dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Okno decyzyjne</p>
                    <p className="mt-2 text-sm font-semibold">{new Date(poll.ends_at).toLocaleString("pl-PL")}</p>
                    <p className="mt-1 text-xs text-slate-400">{poll.related_project ? "projektowe" : "globalne"}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {poll.options?.map((option) => (
                    <Button
                      key={option.id}
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        voteMutation.mutate({ pollId: poll.id, optionId: option.id });
                      }}
                    >
                      Glos: {option.label}
                    </Button>
                  ))}
                  {isAdmin && poll.status === "active" ? (
                    <Button
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        closeMutation.mutate(poll.id);
                      }}
                    >
                      Zamknij
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      {selectedPoll ? (
        <SectionCard title={`Analityka decyzji: ${selectedPoll.title}`} description="Wyniki maja dawac szybki obraz: frekwencja, quorum i rozklad glosow.">
          <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="grid gap-4">
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Frekwencja</p>
                <p className="mt-2 text-3xl font-bold">{results?.total_voters ?? "-"}</p>
                <p className="mt-1 text-xs text-muted">{quorumLabel(results?.quorum_required, results?.quorum_met)}</p>
              </div>
              <div className="tile-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Start / koniec</p>
                <p className="mt-2 text-sm font-semibold">{new Date(selectedPoll.starts_at).toLocaleString("pl-PL")}</p>
                <p className="mt-1 text-sm text-muted">{new Date(selectedPoll.ends_at).toLocaleString("pl-PL")}</p>
              </div>
            </div>
            <div className="grid gap-3">
              {results ? (
                Object.entries(results.options).map(([label, value]) => {
                  const percentage = results.total_voters > 0 ? Math.round((value / results.total_voters) * 100) : 0;
                  return (
                    <div key={label} className="tile-soft p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{label}</p>
                        <Badge tone={percentage >= 50 ? "success" : "default"}>{value} glosow</Badge>
                      </div>
                      <div className="mt-3 h-3 rounded-full bg-slate-200/80 dark:bg-slate-700/60">
                        <div className="h-3 rounded-full bg-accent" style={{ width: `${percentage}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-muted">{percentage}% wszystkich oddanych glosow</p>
                    </div>
                  );
                })
              ) : (
                <div className="tile-soft p-4 text-sm text-muted">Wybierz glosowanie, aby zobaczyc szczegoly wynikow.</div>
              )}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
