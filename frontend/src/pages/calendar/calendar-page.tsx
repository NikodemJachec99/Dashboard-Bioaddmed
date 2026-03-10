import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addMeetingActionItem, createMeeting, fetchMeetings, fetchProjects, generateMeetingTasks, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CalendarPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: meetings = [] } = useQuery({ queryKey: queryKeys.meetings, queryFn: fetchMeetings });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const canCreateMeetings =
    user?.global_role === "admin" ||
    projects.some((project) => project.memberships?.some((membership) => membership.user === user?.id && membership.project_role === "coordinator"));
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    related_project: "",
    start_at: "",
    end_at: "",
    location: "",
  });
  const [actionItemTextByMeeting, setActionItemTextByMeeting] = useState<Record<number, string>>({});

  const createMeetingMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
      setMeetingForm({ title: "", description: "", related_project: "", start_at: "", end_at: "", location: "" });
    },
  });

  const addActionItemMutation = useMutation({
    mutationFn: ({ meetingId, description }: { meetingId: number; description: string }) => addMeetingActionItem(meetingId, { description }),
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
      setActionItemTextByMeeting((prev) => ({ ...prev, [vars.meetingId]: "" }));
    },
  });

  const generateTasksMutation = useMutation({
    mutationFn: generateMeetingTasks,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.meetings });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Harmonogram"
        title="Kalendarz spotkań"
        description="Widok operacyjny dla spotkań ogólnych, projektowych i zarządowych."
      />
      {canCreateMeetings ? (
        <SectionCard title="Nowe spotkanie">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Tytuł" value={meetingForm.title} onChange={(event) => setMeetingForm((prev) => ({ ...prev, title: event.target.value }))} />
            <Input
              placeholder="Opis"
              value={meetingForm.description}
              onChange={(event) => setMeetingForm((prev) => ({ ...prev, description: event.target.value }))}
            />
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
            <Input
              placeholder="Lokalizacja / link"
              value={meetingForm.location}
              onChange={(event) => setMeetingForm((prev) => ({ ...prev, location: event.target.value }))}
            />
            <Button
              onClick={() =>
                createMeetingMutation.mutate({
                  title: meetingForm.title,
                  description: meetingForm.description,
                  meeting_type: meetingForm.related_project ? "project" : "general",
                  related_project: meetingForm.related_project ? Number(meetingForm.related_project) : null,
                  start_at: new Date(meetingForm.start_at).toISOString(),
                  end_at: new Date(meetingForm.end_at).toISOString(),
                  location: meetingForm.location,
                })
              }
              disabled={createMeetingMutation.isPending || !meetingForm.title || !meetingForm.start_at || !meetingForm.end_at}
            >
              {createMeetingMutation.isPending ? "Tworzenie..." : "Dodaj spotkanie"}
            </Button>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard title="Najbliższe wydarzenia">
        <div className="space-y-4">
          {meetings.map((meeting) => (
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
                <div className="w-full max-w-xs space-y-2">
                  <Input
                    placeholder="Action item"
                    value={actionItemTextByMeeting[meeting.id] ?? ""}
                    onChange={(event) => setActionItemTextByMeeting((prev) => ({ ...prev, [meeting.id]: event.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        addActionItemMutation.mutate({
                          meetingId: meeting.id,
                          description: actionItemTextByMeeting[meeting.id] ?? "",
                        })
                      }
                      disabled={!actionItemTextByMeeting[meeting.id]}
                    >
                      Dodaj action item
                    </Button>
                    <Button variant="ghost" onClick={() => generateTasksMutation.mutate(meeting.id)}>
                      Generuj taski
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
