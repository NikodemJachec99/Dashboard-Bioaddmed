import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createAnnouncement, fetchAnnouncements, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AnnouncementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: queryKeys.announcements, queryFn: fetchAnnouncements });
  const [form, setForm] = useState({
    title: "",
    content: "",
    audience_type: "all",
    start_at: "",
    expires_at: "",
  });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
      setForm({ title: "", content: "", audience_type: "all", start_at: "", expires_at: "" });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Komunikacja"
        title="Ogłoszenia"
        description="Istotne komunikaty operacyjne bez gubienia ich w komunikatorach."
      />
      {user?.global_role === "admin" ? (
        <SectionCard title="Nowe ogłoszenie">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Tytuł" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            <Input placeholder="Treść" value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
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
            <Button
              onClick={() =>
                createMutation.mutate({
                  title: form.title,
                  content: form.content,
                  audience_type: form.audience_type,
                  start_at: new Date(form.start_at).toISOString(),
                  expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
                  is_pinned: false,
                })
              }
              disabled={!form.title || !form.content || !form.start_at}
            >
              Opublikuj
            </Button>
          </div>
        </SectionCard>
      ) : null}
      <SectionCard title="Aktualne publikacje">
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.content}</p>
                </div>
                <Badge>{item.audience_type}</Badge>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
