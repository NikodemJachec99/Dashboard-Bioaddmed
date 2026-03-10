import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { createAnnouncement, deleteAnnouncement, fetchAnnouncements, queryKeys, updateAnnouncement } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 404) return "Ogłoszenie nie istnieje.";
    if (error.status === 409) return "Konflikt danych ogloszenia.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function AnnouncementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.global_role === "admin";
  const { data: items = [] } = useQuery({ queryKey: queryKeys.announcements, queryFn: fetchAnnouncements });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "",
    content: "",
    audience_type: "all",
    start_at: "",
    expires_at: "",
    is_pinned: false,
  });

  const filteredItems = useMemo(
    () =>
      items
        .filter((item) => (audienceFilter === "all" ? true : item.audience_type === audienceFilter))
        .filter((item) => {
          const phrase = search.toLowerCase().trim();
          if (!phrase) return true;
          return `${item.title} ${item.content}`.toLowerCase().includes(phrase);
        })
        .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned)),
    [items, audienceFilter, search],
  );

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      setForm({ title: "", content: "", audience_type: "all", start_at: "", expires_at: "", is_pinned: false });
      setFeedback("Ogłoszenie opublikowane.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie opublikowac ogloszenia.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ announcementId, payload }: { announcementId: number; payload: Parameters<typeof updateAnnouncement>[1] }) =>
      updateAnnouncement(announcementId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      setFeedback("Ogłoszenie zaktualizowane.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zaktualizowac ogloszenia.")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      setFeedback("Ogłoszenie usuniete.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie usunac ogloszenia.")),
  });

  return (
    <>
      <PageHeader eyebrow="Komunikacja" title="Ogloszenia" description="Pelny CRUD, pinowanie i audience targetowanie." />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {isAdmin ? (
        <SectionCard title="Nowe ogloszenie">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Tytul" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            <Input placeholder="Tresc" value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={form.audience_type}
              onChange={(event) => setForm((prev) => ({ ...prev, audience_type: event.target.value }))}
            >
              <option value="all">all</option>
              <option value="members">members</option>
              <option value="coordinators">coordinators</option>
              <option value="admins">admins</option>
            </select>
            <Input type="datetime-local" value={form.start_at} onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))} />
            <Input type="datetime-local" value={form.expires_at} onChange={(event) => setForm((prev) => ({ ...prev, expires_at: event.target.value }))} />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(event) => setForm((prev) => ({ ...prev, is_pinned: event.target.checked }))}
              />
              Przypnij ogloszenie
            </label>
            <Button
              onClick={() =>
                createMutation.mutate({
                  title: form.title,
                  content: form.content,
                  audience_type: form.audience_type,
                  start_at: new Date(form.start_at).toISOString(),
                  expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
                  is_pinned: form.is_pinned,
                })
              }
              disabled={!form.title || !form.content || !form.start_at || createMutation.isPending}
            >
              Opublikuj
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Publikacje">
        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <Input placeholder="Szukaj po tytule/tresci" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select
            className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
            value={audienceFilter}
            onChange={(event) => setAudienceFilter(event.target.value)}
          >
            <option value="all">all</option>
            <option value="members">members</option>
            <option value="coordinators">coordinators</option>
            <option value="admins">admins</option>
          </select>
        </div>
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <article key={item.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted">{item.content}</p>
                    <p className="mt-2 text-xs text-muted">
                      Od: {new Date(item.start_at).toLocaleString("pl-PL")}
                      {item.expires_at ? ` | do: ${new Date(item.expires_at).toLocaleString("pl-PL")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.is_pinned ? <Badge tone="warning">Pin</Badge> : null}
                    <Badge>{item.audience_type}</Badge>
                  </div>
                </div>
                {isAdmin ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => setEditingId(isEditing ? null : item.id)}>
                      {isEditing ? "Zamknij edycje" : "Edytuj"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => updateMutation.mutate({ announcementId: item.id, payload: { is_pinned: !item.is_pinned } })}
                    >
                      {item.is_pinned ? "Odepnij" : "Przypnij"}
                    </Button>
                    <Button variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                      Usun
                    </Button>
                  </div>
                ) : null}
                {isAdmin && isEditing ? (
                  <div className="mt-3 grid gap-2">
                    <Input
                      defaultValue={item.title}
                      onBlur={(event) => updateMutation.mutate({ announcementId: item.id, payload: { title: event.target.value } })}
                    />
                    <textarea
                      className="min-h-24 rounded-xl border border-white/30 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5"
                      defaultValue={item.content}
                      onBlur={(event) => updateMutation.mutate({ announcementId: item.id, payload: { content: event.target.value } })}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
