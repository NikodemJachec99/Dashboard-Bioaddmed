import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import { createReservation, createResource, fetchReservations, fetchResources, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 409) return "Wybrany zasob jest juz zarezerwowany w tym czasie. Wybierz inny termin.";
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function ResourcesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: resources = [] } = useQuery({ queryKey: queryKeys.resources, queryFn: fetchResources });
  const { data: reservations = [] } = useQuery({ queryKey: queryKeys.reservations, queryFn: fetchReservations });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reservationStatusFilter, setReservationStatusFilter] = useState("all");
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", location: "", rules: "" });
  const [reservationForm, setReservationForm] = useState({ resource: "", start_at: "", end_at: "", purpose: "" });

  const filteredReservations = useMemo(
    () => reservations.filter((reservation) => (reservationStatusFilter === "all" ? true : reservation.status === reservationStatusFilter)),
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
      <PageHeader eyebrow="Infrastruktura" title="Zasoby i rezerwacje" description="Zasoby, konflikty terminow i statusy rezerwacji." />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {user?.global_role === "admin" ? (
        <SectionCard title="Dodaj zasob">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Nazwa" value={resourceForm.title} onChange={(event) => setResourceForm((prev) => ({ ...prev, title: event.target.value }))} />
            <Input
              placeholder="Opis"
              value={resourceForm.description}
              onChange={(event) => setResourceForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <Input
              placeholder="Lokalizacja"
              value={resourceForm.location}
              onChange={(event) => setResourceForm((prev) => ({ ...prev, location: event.target.value }))}
            />
            <Input placeholder="Zasady" value={resourceForm.rules} onChange={(event) => setResourceForm((prev) => ({ ...prev, rules: event.target.value }))} />
            <Button
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
        </SectionCard>
      ) : null}

      <SectionCard title="Nowa rezerwacja">
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
            value={reservationForm.resource}
            onChange={(event) => setReservationForm((prev) => ({ ...prev, resource: event.target.value }))}
          >
            <option value="">Wybierz zasob</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.title}
              </option>
            ))}
          </select>
          <Input type="datetime-local" value={reservationForm.start_at} onChange={(event) => setReservationForm((prev) => ({ ...prev, start_at: event.target.value }))} />
          <Input type="datetime-local" value={reservationForm.end_at} onChange={(event) => setReservationForm((prev) => ({ ...prev, end_at: event.target.value }))} />
          <Input
            placeholder="Cel"
            value={reservationForm.purpose}
            onChange={(event) => setReservationForm((prev) => ({ ...prev, purpose: event.target.value }))}
          />
          <Button
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
      </SectionCard>

      <SectionCard title="Dostepne zasoby">
        <div className="grid gap-4 xl:grid-cols-2">
          {resources.map((resource) => (
            <article key={resource.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <h3 className="font-semibold">{resource.title}</h3>
              <p className="mt-2 text-sm text-muted">{resource.description}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-accent">{resource.location}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Rezerwacje">
        <div className="mb-3">
          <select
            className="h-10 rounded-xl border border-white/30 bg-white/70 px-3 text-xs dark:border-white/10 dark:bg-white/5"
            value={reservationStatusFilter}
            onChange={(event) => setReservationStatusFilter(event.target.value)}
          >
            <option value="all">all</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <div className="space-y-3">
          {filteredReservations.map((reservation) => (
            <article key={reservation.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <p>
                  #{reservation.resource} | {new Date(reservation.start_at).toLocaleString("pl-PL")}
                </p>
                <Badge>{reservation.status}</Badge>
              </div>
              <p className="mt-1 text-muted">{reservation.purpose || "Brak opisu celu."}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
