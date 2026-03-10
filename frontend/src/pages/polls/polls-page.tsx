import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/app/providers/auth-provider";
import { closePoll, createPoll, createPollOption, fetchPollResults, fetchPolls, queryKeys, voteInPoll } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PollsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: polls = [] } = useQuery({ queryKey: queryKeys.polls, queryFn: fetchPolls });
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
  });
  const selectedPoll = useMemo(() => polls.find((poll) => poll.id === selectedPollId) ?? null, [polls, selectedPollId]);
  const { data: results } = useQuery({
    queryKey: ["poll-results", selectedPollId],
    queryFn: () => fetchPollResults(selectedPollId as number),
    enabled: Boolean(selectedPollId),
  });

  const createPollMutation = useMutation({
    mutationFn: createPoll,
    onSuccess: async (poll) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      if (poll.id) {
        await createPollOption(poll.id, { label: "Za", order: 1 });
        await createPollOption(poll.id, { label: "Przeciw", order: 2 });
        await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      }
      setNewPoll({ title: "", description: "", starts_at: "", ends_at: "" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: number; optionId: number }) => voteInPoll(pollId, [optionId]),
    onSuccess: async (_, variables) => {
      setVoteError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      await queryClient.invalidateQueries({ queryKey: ["poll-results", variables.pollId] });
    },
    onError: (error: unknown) => {
      setVoteError(error instanceof Error ? error.message : "Nie udało się oddać głosu.");
    },
  });

  const closeMutation = useMutation({
    mutationFn: closePoll,
    onSuccess: async (_, pollId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.polls });
      await queryClient.invalidateQueries({ queryKey: ["poll-results", pollId] });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Decyzje"
        title="Głosowania"
        description="Formalne decyzje organizacyjne i projektowe z kontrolą quorum oraz wyników."
        actions={
          user?.global_role === "admin" ? (
            <Button
              onClick={() => {
                if (!newPoll.title || !newPoll.starts_at || !newPoll.ends_at) return;
                createPollMutation.mutate({
                  title: newPoll.title,
                  description: newPoll.description,
                  poll_type: "single",
                  audience_type: "global",
                  visibility_type: "public",
                  starts_at: new Date(newPoll.starts_at).toISOString(),
                  ends_at: new Date(newPoll.ends_at).toISOString(),
                  quorum_required: 1,
                  threshold_type: "simple_majority",
                  status: "active",
                });
              }}
            >
              {createPollMutation.isPending ? "Tworzenie..." : "Utwórz głosowanie"}
            </Button>
          ) : null
        }
      />
      {user?.global_role === "admin" ? (
        <SectionCard title="Nowe głosowanie">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Tytuł" value={newPoll.title} onChange={(event) => setNewPoll((prev) => ({ ...prev, title: event.target.value }))} />
            <Input
              placeholder="Opis"
              value={newPoll.description}
              onChange={(event) => setNewPoll((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Input type="datetime-local" value={newPoll.starts_at} onChange={(event) => setNewPoll((prev) => ({ ...prev, starts_at: event.target.value }))} />
            <Input type="datetime-local" value={newPoll.ends_at} onChange={(event) => setNewPoll((prev) => ({ ...prev, ends_at: event.target.value }))} />
          </div>
        </SectionCard>
      ) : null}
      <SectionCard title="Aktywne i archiwalne ankiety">
        <div className="space-y-4">
          {polls.map((poll) => (
            <article
              key={poll.id}
              className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5"
              onClick={() => setSelectedPollId(poll.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{poll.title}</h3>
                  <p className="mt-1 text-sm text-muted">{poll.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge>{poll.status}</Badge>
                    <Badge>{poll.poll_type}</Badge>
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
                      Głos: {option.label}
                    </Button>
                  ))}
                  {user?.global_role === "admin" && poll.status === "active" ? (
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
          {voteError ? <p className="text-sm text-rose-500">{voteError}</p> : null}
        </div>
      </SectionCard>
      {selectedPoll ? (
        <SectionCard title={`Wynik: ${selectedPoll.title}`}>
          <div className="space-y-2 text-sm">
            <p>Frekwencja: {results?.total_voters ?? "-"}</p>
            <p>Quorum: {results?.quorum_required ?? "-"}</p>
            <p>Status quorum: {results?.quorum_met ? "spełnione" : "niespełnione"}</p>
            <div className="space-y-1 text-muted">
              {results ? Object.entries(results.options).map(([label, value]) => <p key={label}>{label}: {value}</p>) : <p>Wybierz głosowanie.</p>}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
