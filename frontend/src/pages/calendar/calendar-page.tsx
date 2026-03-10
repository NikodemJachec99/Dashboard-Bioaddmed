import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  addMeetingActionItem,
  addMeetingParticipant,
  createMeeting,
  fetchMeetings,
  fetchProjects,
  fetchUsers,
  generateMeetingTasks,
  queryKeys,
  setMeetingAttendance,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, FolderKanban, Users } from "@/components/ui/icons";
import type { Meeting, MeetingParticipant } from "@/types/domain";

type MeetingFilter = "all" | "mine" | "actionable";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 404) return "Spotkanie nie istnieje.";
    if (error.status === 409) return "Konflikt danych. Odswiez i sprobuj ponownie.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function statusTone(status: string) {
  if (["cancelled", "absent", "declined"].includes(status)) return "danger";
  if (["planned", "invited", "accepted", "scheduled"].includes(status)) return "warning";
  if (["attended", "completed", "done"].includes(status)) return "success";
  return "default";
}

function findMyParticipant(meeting: Meeting, userId?: number | null) {
  return meeting.participants?.find((participant) => participant.user === userId);
}

function attendanceBreakdown(participants: MeetingParticipant[] = []) {
  return {
    accepted: participants.filter((entry) => entry.attendance_status === "accepted").length,
    invited: participants.filter((entry) => entry.attendance_status === "invited").length,
    attended: participants.filter((entry) => entry.attendance_status === "attended").length,
  };
}

export function CalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: meetings = [] } = useQuery({ queryKey: queryKeys.meetings, queryFn: fetchMeetings });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<MeetingFilter>("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const canCreateMeetings =
    user?.global_role === "admin" ||
    projects.some((project) => project.memberships?.some((membership) => membership.user === user?.id && membership.project_role === "coordinator"));

  const coordinatorProjectIds = useMemo(
    () =>
      projects
        .filter((project) =>
          project.memberships?.some(
            (membership) => membership.user === user?.id && membership.project_role === "coordinator" && membership.is_active !== false,
          ),
        )
        .map((project) => project.id),
    [projects, user?.id],
  );

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    related_project: "",
    start_at: "",
    end_at: "",
    location: "",
    meeting_type: "project",
  });
  const [participantByMeeting, setParticipantByMeeting] = useState<Record<number, string>>({});
  const [attendanceByMeeting, setAttendanceByMeeting] = useState<Record<number, string>>({});
  const [actionItemByMeeting, setActionItemByMeeting] = useState<Record<number, { description: string; assignee: string; due_date: string }>>({});

  const createMeetingMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
      setMeetingForm({ title: "", description: "", related_project: "", start_at: "", end_at: "", location: "", meeting_type: "project" });
      setFeedback("Spotkanie utworzone.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie utworzyc spotkania.")),
  });

  const addParticipantMutation = useMutation({
    mutationFn: ({ meetingId, userId }: { meetingId: number; userId: number }) => addMeetingParticipant(meetingId, userId),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
      setParticipantByMeeting((prev) => ({ ...prev, [vars.meetingId]: "" }));
      setFeedback("Uczestnik dodany.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie dodac uczestnika.")),
  });

  const attendanceMutation = useMutation({
    mutationFn: ({ meetingId, attendanceStatus }: { meetingId: number; attendanceStatus: string }) =>
      setMeetingAttendance(meetingId, attendanceStatus),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
      setAttendanceByMeeting((prev) => ({ ...prev, [vars.meetingId]: vars.attendanceStatus }));
      setFeedback("Status RSVP zapisany.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zapisac RSVP.")),
  });

  const addActionItemMutation = useMutation({
    mutationFn: ({ meetingId, description, assignee, dueDate }: { meetingId: number; description: string; assignee?: number; dueDate?: string }) =>
      addMeetingActionItem(meetingId, { description, assignee, due_date: dueDate }),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
      setActionItemByMeeting((prev) => ({ ...prev, [vars.meetingId]: { description: "", assignee: "", due_date: "" } }));
      setFeedback("Action item dodany.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie dodac action item.")),
  });

  const generateTasksMutation = useMutation({
    mutationFn: generateMeetingTasks,
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      setFeedback(`Wygenerowano taski: ${payload.created_tasks.length}.`);
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie wygenerowac taskow.")),
  });

  const orderedMeetings = useMemo(
    () => [...meetings].sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime()),
    [meetings],
  );

  const filteredMeetings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orderedMeetings.filter((meeting) => {
      const project = projects.find((entry) => entry.id === meeting.related_project);
      const myParticipant = findMyParticipant(meeting, user?.id);
      const matchesQuery =
        !query ||
        meeting.title.toLowerCase().includes(query) ||
        meeting.description?.toLowerCase().includes(query) ||
        meeting.location?.toLowerCase().includes(query) ||
        project?.name.toLowerCase().includes(query);

      const matchesScope =
        scope === "all" ||
        (scope === "mine" && Boolean(myParticipant || meeting.organizer === user?.id)) ||
        (scope === "actionable" &&
          (Boolean(myParticipant && ["invited", "accepted"].includes(myParticipant.attendance_status)) ||
            Boolean(meeting.related_project && coordinatorProjectIds.includes(meeting.related_project))));

      const matchesProject = !projectFilter || String(meeting.related_project ?? "") === projectFilter;
      const matchesType = typeFilter === "all" || meeting.meeting_type === typeFilter;

      return matchesQuery && matchesScope && matchesProject && matchesType;
    });
  }, [coordinatorProjectIds, orderedMeetings, projectFilter, projects, scope, search, typeFilter, user?.id]);

  const upcomingMeetings = filteredMeetings.filter((meeting) => new Date(meeting.start_at).getTime() >= Date.now());
  const todayMeetings = filteredMeetings.filter((meeting) => new Date(meeting.start_at).toDateString() === new Date().toDateString()).length;
  const myPendingRsvp = filteredMeetings.filter((meeting) => {
    const participant = findMyParticipant(meeting, user?.id);
    return participant?.attendance_status === "invited";
  }).length;
  const openActionItems = filteredMeetings.reduce((sum, meeting) => sum + (meeting.action_items?.length ?? 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Cadence"
        title="Kalendarz spotkan, RSVP i przejscie od decyzji do taskow"
        description="Widok ma wspierac rytm operacyjny: planowanie, attendance, action items i generowanie taskow bez opuszczania ekranu."
        actions={
          <div className="flex flex-wrap gap-3">
            <Badge tone="success">{todayMeetings} dzisiaj</Badge>
            <Badge tone="warning">{myPendingRsvp} czeka na RSVP</Badge>
            <Badge>{openActionItems} action items</Badge>
          </div>
        }
      />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <StatCard label="Spotkania w widoku" value={filteredMeetings.length} detail="Aktualny wynik po filtrach i zakresie roli." icon={<Calendar size={18} />} />
        <StatCard label="Nadchodzace" value={upcomingMeetings.length} detail="To najblizsze punkty rytmu operacyjnego." tone="success" icon={<FolderKanban size={18} />} />
        <StatCard label="RSVP do decyzji" value={myPendingRsvp} detail="Osobiste potwierdzenia, ktore warto domknac od razu." tone="warning" icon={<Users size={18} />} />
        <StatCard label="Action items" value={openActionItems} detail="Liczba ustalen, ktore nadal istnieja tylko jako ustalenia." tone={openActionItems > 0 ? "danger" : "success"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          {canCreateMeetings ? (
            <SectionCard title="Console planowania" description="Tworzenie spotkania jest tutaj traktowane jak konfiguracja wydarzenia operacyjnego, a nie tylko wpis do kalendarza.">
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Tytul" value={meetingForm.title} onChange={(event) => setMeetingForm((prev) => ({ ...prev, title: event.target.value }))} />
                <Input placeholder="Opis" value={meetingForm.description} onChange={(event) => setMeetingForm((prev) => ({ ...prev, description: event.target.value }))} />
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={meetingForm.meeting_type}
                  onChange={(event) => setMeetingForm((prev) => ({ ...prev, meeting_type: event.target.value }))}
                >
                  <option value="project">project</option>
                  <option value="general">general</option>
                  <option value="board">board</option>
                  <option value="workshop">workshop</option>
                </select>
                <select
                  className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                  value={meetingForm.related_project}
                  onChange={(event) => setMeetingForm((prev) => ({ ...prev, related_project: event.target.value }))}
                >
                  <option value="">Spotkanie globalne</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Input type="datetime-local" value={meetingForm.start_at} onChange={(event) => setMeetingForm((prev) => ({ ...prev, start_at: event.target.value }))} />
                <Input type="datetime-local" value={meetingForm.end_at} onChange={(event) => setMeetingForm((prev) => ({ ...prev, end_at: event.target.value }))} />
                <Input className="md:col-span-2" placeholder="Lokalizacja lub link online" value={meetingForm.location} onChange={(event) => setMeetingForm((prev) => ({ ...prev, location: event.target.value }))} />
                <div className="md:col-span-2">
                  <Button
                    className="h-12 w-full"
                    onClick={() =>
                      createMeetingMutation.mutate({
                        title: meetingForm.title,
                        description: meetingForm.description,
                        meeting_type: meetingForm.related_project ? "project" : meetingForm.meeting_type,
                        related_project: meetingForm.related_project ? Number(meetingForm.related_project) : null,
                        start_at: new Date(meetingForm.start_at).toISOString(),
                        end_at: new Date(meetingForm.end_at).toISOString(),
                        location: meetingForm.location,
                      })
                    }
                    disabled={!meetingForm.title || !meetingForm.start_at || !meetingForm.end_at || createMeetingMutation.isPending}
                  >
                    {createMeetingMutation.isPending ? "Tworzenie..." : "Zaplanuj spotkanie"}
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Filtry rytmu spotkan" description="Zawaz widok do swojego obszaru pracy albo do spotkan wymagajacych reakcji.">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Szukaj po tytule, opisie, lokalizacji lub projekcie..." value={search} onChange={(event) => setSearch(event.target.value)} />
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={scope}
                onChange={(event) => setScope(event.target.value as MeetingFilter)}
              >
                <option value="all">Wszystkie spotkania</option>
                <option value="mine">Moje / z moim udzialem</option>
                <option value="actionable">Wymagajace reakcji</option>
              </select>
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="">Wszystkie projekty</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <select
                className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">Kazdy typ spotkania</option>
                <option value="project">project</option>
                <option value="general">general</option>
                <option value="board">board</option>
                <option value="workshop">workshop</option>
              </select>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Agenda operacyjna" description="Kazda karta skupia w jednym miejscu: kontekst, uczestnikow, attendance i przejscie do action items.">
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => {
              const isProjectMeeting = Boolean(meeting.related_project);
              const canManageMeeting =
                user?.global_role === "admin" || (meeting.related_project ? coordinatorProjectIds.includes(meeting.related_project) : false);
              const draft = actionItemByMeeting[meeting.id] ?? { description: "", assignee: "", due_date: "" };
              const project = projects.find((entry) => entry.id === meeting.related_project);
              const myParticipant = findMyParticipant(meeting, user?.id);
              const breakdown = attendanceBreakdown(meeting.participants);

              return (
                <article
                  key={meeting.id}
                  className="rounded-[28px] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(247,250,255,0.75))] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={statusTone(meeting.status)}>{meeting.status}</Badge>
                          <Badge>{meeting.meeting_type}</Badge>
                          {project ? <Badge tone="success">{project.name}</Badge> : <Badge>globalne</Badge>}
                          {myParticipant ? <Badge tone={statusTone(myParticipant.attendance_status)}>{myParticipant.attendance_status}</Badge> : null}
                        </div>
                        <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{meeting.title}</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{meeting.description || "Brak dodatkowego opisu spotkania."}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
                          {new Date(meeting.start_at).toLocaleString("pl-PL")} - {new Date(meeting.end_at).toLocaleString("pl-PL")}
                        </p>
                        <p className="mt-1 text-sm text-muted">{meeting.location || meeting.online_url || "Brak lokalizacji"}</p>
                      </div>
                      <div className="grid min-w-[240px] gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] bg-white/70 px-4 py-3 text-center dark:bg-white/5">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">Accepted</p>
                          <p className="mt-2 text-xl font-bold">{breakdown.accepted}</p>
                        </div>
                        <div className="rounded-[22px] bg-white/70 px-4 py-3 text-center dark:bg-white/5">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">Invited</p>
                          <p className="mt-2 text-xl font-bold">{breakdown.invited}</p>
                        </div>
                        <div className="rounded-[22px] bg-white/70 px-4 py-3 text-center dark:bg-white/5">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">Action items</p>
                          <p className="mt-2 text-xl font-bold">{meeting.action_items?.length ?? 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">RSVP / attendance</p>
                        <div className="mt-3 flex gap-2">
                          <select
                            className="h-10 w-full rounded-xl border border-white/30 bg-white/70 px-3 text-xs dark:border-white/10 dark:bg-white/5"
                            value={attendanceByMeeting[meeting.id] ?? ""}
                            onChange={(event) => setAttendanceByMeeting((prev) => ({ ...prev, [meeting.id]: event.target.value }))}
                          >
                            <option value="">Wybierz status</option>
                            <option value="invited">invited</option>
                            <option value="accepted">accepted</option>
                            <option value="declined">declined</option>
                            <option value="attended">attended</option>
                            <option value="absent">absent</option>
                          </select>
                          <Button
                            variant="secondary"
                            disabled={!attendanceByMeeting[meeting.id]}
                            onClick={() =>
                              attendanceMutation.mutate({
                                meetingId: meeting.id,
                                attendanceStatus: attendanceByMeeting[meeting.id] ?? "",
                              })
                            }
                          >
                            Zapisz RSVP
                          </Button>
                        </div>
                        <div className="mt-3 space-y-2 text-xs text-muted">
                          {(meeting.participants ?? []).length > 0 ? (
                            (meeting.participants ?? []).map((participant) => (
                              <div key={participant.id} className="flex items-center justify-between gap-3">
                                <span>{participant.user_email}</span>
                                <Badge tone={statusTone(participant.attendance_status)}>{participant.attendance_status}</Badge>
                              </div>
                            ))
                          ) : (
                            <p>Brak uczestnikow na liscie.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted">Execution lane</p>
                          {canManageMeeting ? <Badge tone="warning">manage</Badge> : <Badge>view</Badge>}
                        </div>

                        {canManageMeeting ? (
                          <div className="mt-3 flex gap-2">
                            <select
                              className="h-10 w-full rounded-xl border border-white/30 bg-white/70 px-3 text-xs dark:border-white/10 dark:bg-white/5"
                              value={participantByMeeting[meeting.id] ?? ""}
                              onChange={(event) => setParticipantByMeeting((prev) => ({ ...prev, [meeting.id]: event.target.value }))}
                            >
                              <option value="">Wybierz uzytkownika</option>
                              {users.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.first_name} {entry.last_name}
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="secondary"
                              disabled={!participantByMeeting[meeting.id]}
                              onClick={() =>
                                addParticipantMutation.mutate({
                                  meetingId: meeting.id,
                                  userId: Number(participantByMeeting[meeting.id]),
                                })
                              }
                            >
                              Dodaj
                            </Button>
                          </div>
                        ) : null}

                        <div className="mt-4">
                          <Input
                            placeholder="Opis action item"
                            value={draft.description}
                            onChange={(event) =>
                              setActionItemByMeeting((prev) => ({
                                ...prev,
                                [meeting.id]: { ...draft, description: event.target.value },
                              }))
                            }
                          />
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <select
                              className="h-10 rounded-xl border border-white/30 bg-white/70 px-3 text-xs dark:border-white/10 dark:bg-white/5"
                              value={draft.assignee}
                              onChange={(event) =>
                                setActionItemByMeeting((prev) => ({
                                  ...prev,
                                  [meeting.id]: { ...draft, assignee: event.target.value },
                                }))
                              }
                            >
                              <option value="">Bez assignee</option>
                              {users.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.first_name} {entry.last_name}
                                </option>
                              ))}
                            </select>
                            <Input
                              type="date"
                              value={draft.due_date}
                              onChange={(event) =>
                                setActionItemByMeeting((prev) => ({
                                  ...prev,
                                  [meeting.id]: { ...draft, due_date: event.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="secondary"
                              disabled={!draft.description || (isProjectMeeting && !canManageMeeting)}
                              onClick={() =>
                                addActionItemMutation.mutate({
                                  meetingId: meeting.id,
                                  description: draft.description,
                                  assignee: draft.assignee ? Number(draft.assignee) : undefined,
                                  dueDate: draft.due_date || undefined,
                                })
                              }
                            >
                              Dodaj action item
                            </Button>
                            <Button variant="ghost" disabled={isProjectMeeting && !canManageMeeting} onClick={() => generateTasksMutation.mutate(meeting.id)}>
                              Generuj taski
                            </Button>
                          </div>
                          <div className="mt-3 space-y-2 text-xs text-muted">
                            {(meeting.action_items ?? []).length > 0 ? (
                              (meeting.action_items ?? []).map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                                  <span>{item.description}</span>
                                  <span>{item.assignee_email || "bez assignee"}</span>
                                </div>
                              ))
                            ) : (
                              <p>Brak action items.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
            {filteredMeetings.length === 0 ? <p className="text-sm text-muted">Brak spotkan po obecnych filtrach.</p> : null}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
