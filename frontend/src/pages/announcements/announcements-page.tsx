import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { createAnnouncement, deleteAnnouncement, fetchAnnouncements, queryKeys, updateAnnouncement } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Calendar, Users } from "@/components/ui/icons";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 404) return "Ogloszenie nie istnieje.";
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
      setFeedback("Ogloszenie opublikowane.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie opublikowac ogloszenia.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ announcementId, payload }: { announcementId: number; payload: Parameters<typeof updateAnnouncement>[1] }) =>
      updateAnnouncement(announcementId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      setFeedback("Ogloszenie zaktualizowane.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zaktualizowac ogloszenia.")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      setFeedback("Ogloszenie usuniete.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie usunac ogloszenia.")),
  });

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Ogloszenia, komunikaty i dystrybucja informacji"
        description="Komunikacja ma byc czytelna, warstwowa i sterowalna: audience, aktywnosc czasowa, pinning i szybka edycja."
        actions={
          <div className="flex flex-wrap gap-3">
            <Badge tone="warning">{items.filter((item) => item.is_pinned).length} pinned</Badge>
            <Badge>{items.length} publikacji</Badge>
            <Badge tone="success">{items.filter((item) => item.audience_type === "members").length} do members</Badge>
          </div>
        }
      />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Pinned" value={items.filter((item) => item.is_pinned).length} detail="Najwazniejsze komunikaty, ktore maja pierwszenstwo w odbiorze." icon={<Bell size={18} />} tone="warning" />
        <StatCard label="Aktywne okna" value={items.filter((item) => !item.expires_at || new Date(item.expires_at).getTime() > Date.now()).length} detail="Komunikaty nadal zywe w czasie." icon={<Calendar size={18} />} tone="success" />
        <StatCard label="Audience split" value={new Set(items.map((item) => item.audience_type)).size} detail="Ile grup odbiorcow realnie obslugujesz." icon={<Users size={18} />} />
        <StatCard label="Do koordynatorow" value={items.filter((item) => item.audience_type === "coordinators").length} detail="Komunikaty stricte operacyjne." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {isAdmin ? (
          <SectionCard title="Studio publikacji" description="Ogloszenie jest tu traktowane jako kontrolowany komunikat z audience, czasem aktywacji i pinningiem.">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Tytul" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Tresc" value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
              <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={form.audience_type} onChange={(event) => setForm((prev) => ({ ...prev, audience_type: event.target.value }))}>
                <option value="all">all</option>
                <option value="members">members</option>
                <option value="coordinators">coordinators</option>
                <option value="admins">admins</option>
              </select>
              <Input type="datetime-local" value={form.start_at} onChange={(event) => setForm((prev) => ({ ...prev, start_at: event.target.value }))} />
              <Input type="datetime-local" value={form.expires_at} onChange={(event) => setForm((prev) => ({ ...prev, expires_at: event.target.value }))} />
              <label className="tile-soft flex items-center gap-2 px-4 py-3 text-sm text-muted">
                <input type="checkbox" checked={form.is_pinned} onChange={(event) => setForm((prev) => ({ ...prev, is_pinned: event.target.checked }))} />
                Przypnij ogloszenie
              </label>
              <div className="md:col-span-2">
                <Button
                  className="h-12 w-full"
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
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Tryb odbiorcy" description="Zwykly user konsumuje komunikaty. Publikacja i moderacja zostaja po stronie admina.">
            <div className="space-y-4 text-sm leading-6 text-muted">
              <p>Układ stawia na rozroznienie komunikatow pinned, audience i okna aktywnosci. To ma byc board komunikacyjny, nie zwykly feed.</p>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Filtry komunikacji" description="Najpierw audience, potem tresc. Kafelki maja byc czytelne nawet przy duzej liczbie publikacji.">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Input placeholder="Szukaj po tytule i tresci..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}>
              <option value="all">all</option>
              <option value="members">members</option>
              <option value="coordinators">coordinators</option>
              <option value="admins">admins</option>
            </select>
          </div>
          <div className="grid gap-4">
            {filteredItems.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <article key={item.id} className="tile-soft p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {item.is_pinned ? <Badge tone="warning">pin</Badge> : null}
                        <Badge>{item.audience_type}</Badge>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted">{item.content}</p>
                    </div>
                    <div className="rounded-[22px] bg-slate-950 p-4 text-white dark:bg-slate-900">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Okno aktywnosci</p>
                      <p className="mt-2 text-sm font-semibold">{new Date(item.start_at).toLocaleString("pl-PL")}</p>
                      <p className="mt-1 text-xs text-slate-400">{item.expires_at ? new Date(item.expires_at).toLocaleString("pl-PL") : "bez wygaszenia"}</p>
                    </div>
                  </div>
                  {isAdmin ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setEditingId(isEditing ? null : item.id)}>
                        {isEditing ? "Zamknij edycje" : "Edytuj"}
                      </Button>
                      <Button variant="secondary" onClick={() => updateMutation.mutate({ announcementId: item.id, payload: { is_pinned: !item.is_pinned } })}>
                        {item.is_pinned ? "Odepnij" : "Przypnij"}
                      </Button>
                      <Button variant="ghost" onClick={() => deleteMutation.mutate(item.id)}>
                        Usun
                      </Button>
                    </div>
                  ) : null}
                  {isAdmin && isEditing ? (
                    <div className="mt-4 grid gap-2">
                      <Input defaultValue={item.title} onBlur={(event) => updateMutation.mutate({ announcementId: item.id, payload: { title: event.target.value } })} />
                      <textarea className="min-h-28 rounded-xl border border-white/30 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5" defaultValue={item.content} onBlur={(event) => updateMutation.mutate({ announcementId: item.id, payload: { content: event.target.value } })} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
