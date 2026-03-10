import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { createReservation, createResource, fetchReservations, fetchResources, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Trophy, Users } from "@/components/ui/icons";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 409) return "Wybrany zasob jest juz zarezerwowany w tym czasie. Wybierz inny termin.";
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function reservationTone(status: string) {
  if (status === "approved") return "success";
  if (status === "pending") return "warning";
  if (["rejected", "cancelled"].includes(status)) return "danger";
  return "default";
}

export function ResourcesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: resources = [] } = useQuery({ queryKey: queryKeys.resources, queryFn: fetchResources });
  const { data: reservations = [] } = useQuery({ queryKey: queryKeys.reservations, queryFn: fetchReservations });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reservationStatusFilter, setReservationStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", location: "", rules: "" });
  const [reservationForm, setReservationForm] = useState({ resource: "", start_at: "", end_at: "", purpose: "" });

  const filteredResources = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    return resources.filter((resource) => !phrase || `${resource.title} ${resource.description} ${resource.location} ${resource.rules}`.toLowerCase().includes(phrase));
  }, [resources, search]);

  const filteredReservations = useMemo(
    () =>
      reservations
        .filter((reservation) => (reservationStatusFilter === "all" ? true : reservation.status === reservationStatusFilter))
        .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime()),
    [reservationStatusFilter, reservations],
  );

  const createResourceMutation = useMutation({
    mutationFn: createResource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.resources });
      setResourceForm({ title: "", description: "", location: "", rules: "" });
      setFeedback("Zasob dodany.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie dodac zasobu.")),
  });

  const createReservationMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      setReservationForm({ resource: "", start_at: "", end_at: "", purpose: "" });
      setFeedback("Rezerwacja zapisana.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zapisac rezerwacji.")),
  });

  return (
    <>
      <PageHeader
        eyebrow="Infrastructure"
        title="Zasoby, dostepnosc i rezerwacje operacyjne"
        description="Widok ma sluzyc do szybkiego planowania dostepu do sprzetu i przestrzeni, z czytelnymi konfliktami i obciazeniem zasobow."
        actions={
          <div className="flex flex-wrap gap-3">
            <Badge tone="success">{resources.length} zasobow</Badge>
            <Badge tone="warning">{reservations.filter((reservation) => reservation.status === "pending").length} pending</Badge>
            <Badge>{reservations.length} rezerwacji</Badge>
          </div>
        }
      />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Aktywne zasoby" value={resources.filter((resource) => resource.is_active).length} detail="Dostepne do wykorzystania operacyjnego." icon={<Trophy size={18} />} />
        <StatCard label="Pending approvals" value={reservations.filter((reservation) => reservation.status === "pending").length} detail="Rezerwacje oczekujace na decyzje." tone="warning" icon={<Calendar size={18} />} />
        <StatCard label="Approved" value={reservations.filter((reservation) => reservation.status === "approved").length} detail="Zatwierdzone rezerwacje w systemie." tone="success" icon={<Users size={18} />} />
        <StatCard label="Konflikty" value={reservations.filter((reservation) => reservation.status === "rejected").length} detail="Rezerwacje odrzucone lub kolizyjne." tone="danger" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {user?.global_role === "admin" ? (
          <SectionCard title="Karta nowego zasobu" description="Rejestr zasobu powinien od razu zawierac kontekst: opis, lokalizacje i zasady uzycia.">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Nazwa" value={resourceForm.title} onChange={(event) => setResourceForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input placeholder="Opis" value={resourceForm.description} onChange={(event) => setResourceForm((prev) => ({ ...prev, description: event.target.value }))} />
              <Input placeholder="Lokalizacja" value={resourceForm.location} onChange={(event) => setResourceForm((prev) => ({ ...prev, location: event.target.value }))} />
              <Input placeholder="Zasady" value={resourceForm.rules} onChange={(event) => setResourceForm((prev) => ({ ...prev, rules: event.target.value }))} />
              <div className="md:col-span-2">
                <Button
                  className="h-12 w-full"
                  onClick={() =>
                    createResourceMutation.mutate({
                      title: resourceForm.title,
                      description: resourceForm.description,
                      location: resourceForm.location,
                      rules: resourceForm.rules,
                      is_active: true,
                    })
                  }
                  disabled={!resourceForm.title || createResourceMutation.isPending}
                >
                  Dodaj zasob
                </Button>
              </div>
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Jak korzystac z tego ekranu" description="Zwykly user rezerwuje, admin dodatkowo zarzadza pulą zasobow.">
            <div className="space-y-4 text-sm leading-6 text-muted">
              <p>Zasoby powinny byc czytelne jak portfolio sprzetu, a nie jak surowa tabela. Widzisz od razu miejsce, zasady i presje rezerwacji.</p>
              <p>Komunikat `409` jest tu celowo mapowany na prosty komunikat o konflikcie terminu, bez technicznego zrzutu z backendu.</p>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Nowa rezerwacja" description="Formularz prowadzi przez wybor zasobu i czasu. Konflikty terminu sa raportowane od razu czytelnym komunikatem.">
          <div className="grid gap-3 md:grid-cols-2">
            <select className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5" value={reservationForm.resource} onChange={(event) => setReservationForm((prev) => ({ ...prev, resource: event.target.value }))}>
              <option value="">Wybierz zasob</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.title}
                </option>
              ))}
            </select>
            <Input type="datetime-local" value={reservationForm.start_at} onChange={(event) => setReservationForm((prev) => ({ ...prev, start_at: event.target.value }))} />
            <Input type="datetime-local" value={reservationForm.end_at} onChange={(event) => setReservationForm((prev) => ({ ...prev, end_at: event.target.value }))} />
            <Input placeholder="Cel rezerwacji" value={reservationForm.purpose} onChange={(event) => setReservationForm((prev) => ({ ...prev, purpose: event.target.value }))} />
            <div className="md:col-span-2">
              <Button
                className="h-12 w-full"
                onClick={() =>
                  createReservationMutation.mutate({
                    resource: Number(reservationForm.resource),
                    start_at: new Date(reservationForm.start_at).toISOString(),
                    end_at: new Date(reservationForm.end_at).toISOString(),
                    purpose: reservationForm.purpose,
                  })
                }
                disabled={!reservationForm.resource || !reservationForm.start_at || !reservationForm.end_at || createReservationMutation.isPending}
              >
                Zarezerwuj
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Portfolio zasobow" description="Kafelki rozbijaja sprzet i przestrzenie na czytelne jednostki: lokalizacja, zasady i aktualne obciazenie.">
        <div className="mb-4">
          <Input placeholder="Szukaj po nazwie, opisie, miejscu lub zasadach..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredResources.map((resource) => {
            const resourceReservations = reservations.filter((reservation) => reservation.resource === resource.id);
            return (
              <article key={resource.id} className="tile-soft p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={resource.is_active ? "success" : "danger"}>{resource.is_active ? "aktywny" : "nieaktywny"}</Badge>
                      <Badge>{resourceReservations.length} rezerwacji</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{resource.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{resource.description}</p>
                  </div>
                  <div className="rounded-[22px] bg-slate-950 p-4 text-white dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Lokalizacja</p>
                    <p className="mt-2 text-sm font-semibold">{resource.location || "brak"}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="tile-soft p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Zasady</p>
                    <p className="mt-2 text-sm text-muted">{resource.rules || "Brak doprecyzowanych zasad uzycia."}</p>
                  </div>
                  <div className="tile-soft p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">Caretaker</p>
                    <p className="mt-2 text-sm text-muted">{resource.caretaker_email || "nieprzypisany"}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Timeline rezerwacji" description="Widok rezerwacji ma byc timeline'em, a nie prostym spisem. Od razu widac status, czas i cel.">
        <div className="mb-4 flex justify-end">
          <select className="h-10 rounded-xl border border-white/30 bg-white/70 px-3 text-xs dark:border-white/10 dark:bg-white/5" value={reservationStatusFilter} onChange={(event) => setReservationStatusFilter(event.target.value)}>
            <option value="all">all</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <div className="space-y-4">
          {filteredReservations.map((reservation) => {
            const resource = resources.find((entry) => entry.id === reservation.resource);
            return (
              <article key={reservation.id} className="tile-soft p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={reservationTone(reservation.status)}>{reservation.status}</Badge>
                      <Badge>{resource?.title ?? `zasob #${reservation.resource}`}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{reservation.purpose || "Rezerwacja bez opisu celu"}</h3>
                    <p className="mt-2 text-sm text-muted">Rezerwujacy: {reservation.reserved_by_email}</p>
                  </div>
                  <div className="rounded-[22px] bg-slate-950 p-4 text-white dark:bg-slate-900">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Okno</p>
                    <p className="mt-2 text-sm font-semibold">{new Date(reservation.start_at).toLocaleString("pl-PL")}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(reservation.end_at).toLocaleString("pl-PL")}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
