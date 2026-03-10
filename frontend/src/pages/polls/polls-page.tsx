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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 409) return "Konflikt glosowania. Odswiez dane i sprobuj ponownie.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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

  const activePolls = useMemo(() => polls.filter((poll) => poll.status === "active"), [polls]);
  const archivedPolls = useMemo(() => polls.filter((poll) => poll.status !== "active"), [polls]);
  const selectedPoll = useMemo(() => polls.find((poll) => poll.id === selectedPollId) ?? null, [polls, selectedPollId]);
  const { data: results } = useQuery({
    queryKey: ["poll-results", selectedPollId],
    queryFn: () => fetchPollResults(selectedPollId as number),
    enabled: Boolean(selectedPollId),
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
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie utworzyc glosowania.")),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: number; optionId: number }) => voteInPoll(pollId, [optionId]),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      await queryClient.invalidateQueries({ queryKey: ["poll-results", vars.pollId] });
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie oddac glosu.")),
  });

  const closeMutation = useMutation({
    mutationFn: closePoll,
    onSuccess: async (_, pollId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      await queryClient.invalidateQueries({ queryKey: ["poll-results", pollId] });
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zamknac glosowania.")),
  });

  return (
    <>
      <PageHeader eyebrow="Decyzje" title="Glosowania" description="Pelny cykl: konfiguracja, glosowanie, quorum i zamkniecie." />
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {isAdmin ? (
        <SectionCard title="Nowe glosowanie">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Tytul" value={newPoll.title} onChange={(event) => setNewPoll((prev) => ({ ...prev, title: event.target.value }))} />
            <Input placeholder="Opis" value={newPoll.description} onChange={(event) => setNewPoll((prev) => ({ ...prev, description: event.target.value }))} />
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={newPoll.poll_type}
              onChange={(event) => setNewPoll((prev) => ({ ...prev, poll_type: event.target.value }))}
            >
              <option value="single">single</option>
              <option value="multiple">multiple</option>
            </select>
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={newPoll.audience_type}
              onChange={(event) => setNewPoll((prev) => ({ ...prev, audience_type: event.target.value }))}
            >
              <option value="global">global</option>
              <option value="project">project</option>
              <option value="selected_users">selected_users</option>
            </select>
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={newPoll.visibility_type}
              onChange={(event) => setNewPoll((prev) => ({ ...prev, visibility_type: event.target.value }))}
            >
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
            <Input
              type="number"
              min={1}
              placeholder="Quorum"
              value={newPoll.quorum_required}
              onChange={(event) => setNewPoll((prev) => ({ ...prev, quorum_required: event.target.value }))}
            />
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={newPoll.threshold_type}
              onChange={(event) => setNewPoll((prev) => ({ ...prev, threshold_type: event.target.value }))}
            >
              <option value="simple_majority">simple_majority</option>
              <option value="absolute_majority">absolute_majority</option>
              <option value="two_thirds">two_thirds</option>
              <option value="unanimous">unanimous</option>
            </select>
          </div>

          {newPoll.audience_type === "selected_users" ? (
            <div className="mt-3 rounded-2xl bg-white/60 p-3 dark:bg-white/5">
              <p className="mb-2 text-xs text-muted">Uzytkownicy uprawnieni do glosowania:</p>
              <div className="grid gap-2 md:grid-cols-2">
                {users.map((entry) => {
                  const checked = eligibleUsers.includes(entry.id);
                  return (
                    <label key={entry.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setEligibleUsers((prev) =>
                            event.target.checked ? [...prev, entry.id] : prev.filter((id) => id !== entry.id),
                          )
                        }
                      />
                      {entry.first_name} {entry.last_name} ({entry.email})
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-3 rounded-2xl bg-white/60 p-3 dark:bg-white/5">
            <p className="mb-2 text-xs text-muted">Opcje glosowania:</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {options.map((option) => (
                <Badge key={option}>{option}</Badge>
              ))}
            </div>
            <div className="flex gap-2">
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

          <div className="mt-3">
            <Button
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
      ) : null}

      <SectionCard title="Aktywne glosowania">
        <div className="space-y-4">
          {activePolls.map((poll) => (
            <article
              key={poll.id}
              className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5"
              onClick={() => setSelectedPollId(poll.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{poll.title}</h3>
                  <p className="mt-1 text-sm text-muted">{poll.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge>{poll.poll_type}</Badge>
                    <Badge>{poll.audience_type}</Badge>
                    <Badge>{poll.visibility_type}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
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
                  {isAdmin ? (
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
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Archiwalne glosowania">
        <div className="space-y-3">
          {archivedPolls.map((poll) => (
            <article key={poll.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{poll.title}</p>
                <Badge>{poll.status}</Badge>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      {selectedPoll ? (
        <SectionCard title={`Wyniki: ${selectedPoll.title}`}>
          <div className="space-y-2 text-sm">
            <p>Frekwencja: {results?.total_voters ?? "-"}</p>
            <p>Quorum wymagane: {results?.quorum_required ?? "-"}</p>
            <p>Quorum: {results?.quorum_met ? "spelnione" : "niespelnione"}</p>
            <div className="space-y-1 text-muted">
              {results ? Object.entries(results.options).map(([label, value]) => <p key={label}>{label}: {value}</p>) : <p>Wybierz glosowanie.</p>}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
