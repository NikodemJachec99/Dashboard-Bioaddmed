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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function CalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: meetings = [] } = useQuery({ queryKey: queryKeys.meetings, queryFn: fetchMeetings });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const { data: users = [] } = useQuery({ queryKey: queryKeys.users, queryFn: fetchUsers });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <PageHeader eyebrow="Harmonogram" title="Kalendarz spotkan" description="Spotkania, RSVP, attendance i action items z generowaniem taskow." />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {canCreateMeetings ? (
        <SectionCard title="Nowe spotkanie">
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
            <Input placeholder="Lokalizacja / link" value={meetingForm.location} onChange={(event) => setMeetingForm((prev) => ({ ...prev, location: event.target.value }))} />
            <Button
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
              {createMeetingMutation.isPending ? "Tworzenie..." : "Dodaj spotkanie"}
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Spotkania">
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const isProjectMeeting = Boolean(meeting.related_project);
            const canManageMeeting =
              user?.global_role === "admin" || (meeting.related_project ? coordinatorProjectIds.includes(meeting.related_project) : false);
            const draft = actionItemByMeeting[meeting.id] ?? { description: "", assignee: "", due_date: "" };

            return (
              <article key={meeting.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{meeting.title}</h3>
                    <p className="mt-2 text-sm text-muted">{meeting.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge>{meeting.meeting_type}</Badge>
                      <Badge>{meeting.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {new Date(meeting.start_at).toLocaleString("pl-PL")} - {new Date(meeting.end_at).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <div className="w-full max-w-lg space-y-3">
                    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                      <p className="mb-2 text-xs text-muted">RSVP / attendance</p>
                      <div className="flex gap-2">
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
                    </div>

                    {canManageMeeting ? (
                      <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                        <p className="mb-2 text-xs text-muted">Uczestnicy</p>
                        <div className="flex gap-2">
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
                        <div className="mt-2 text-xs text-muted">
                          {(meeting.participants ?? []).map((participant) => (
                            <p key={participant.id}>
                              {participant.user_email} - {participant.attendance_status}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl bg-white/70 p-3 dark:bg-white/10">
                      <p className="mb-2 text-xs text-muted">Action items</p>
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
                      <div className="mt-2 text-xs text-muted">
                        {(meeting.action_items ?? []).map((item) => (
                          <p key={item.id}>
                            {item.description} {item.assignee_email ? `-> ${item.assignee_email}` : ""}
                          </p>
                        ))}
                      </div>
                    </div>
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
