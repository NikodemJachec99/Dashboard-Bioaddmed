import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createReservation, createResource, fetchReservations, fetchResources, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResourcesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: resources = [] } = useQuery({ queryKey: queryKeys.resources, queryFn: fetchResources });
  const { data: reservations = [] } = useQuery({ queryKey: queryKeys.reservations, queryFn: fetchReservations });
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", location: "", rules: "" });
  const [reservationForm, setReservationForm] = useState({ resource: "", start_at: "", end_at: "", purpose: "" });

  const createResourceMutation = useMutation({
    mutationFn: createResource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.resources });
      setResourceForm({ title: "", description: "", location: "", rules: "" });
    },
  });

  const createReservationMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      setReservationForm({ resource: "", start_at: "", end_at: "", purpose: "" });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Infrastruktura"
        title="Zasoby i rezerwacje"
        description="Zarządzanie sprzętem laboratoryjnym, salami i wspólną infrastrukturą."
      />
      {user?.global_role === "admin" ? (
        <SectionCard title="Dodaj zasób">
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
              disabled={!resourceForm.title}
            >
              Dodaj zasób
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
            <option value="">Wybierz zasób</option>
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
            disabled={!reservationForm.resource || !reservationForm.start_at || !reservationForm.end_at}
          >
            Zarezerwuj
          </Button>
        </div>
      </SectionCard>
      <SectionCard title="Dostępne zasoby">
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
      <SectionCard title="Moje rezerwacje">
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <article key={reservation.id} className="rounded-[22px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <div className="flex items-center justify-between gap-3">
                <p>#{reservation.resource} • {new Date(reservation.start_at).toLocaleString("pl-PL")}</p>
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
