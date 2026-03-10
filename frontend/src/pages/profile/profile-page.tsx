import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  addUserSkill,
  deleteUserSkill,
  fetchNotifications,
  fetchUserPortfolio,
  fetchUserSkills,
  queryKeys,
  updateUser,
  updateUserSkill,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do edycji tego profilu.";
    if (error.status === 404) return "Profil nie istnieje.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    field_of_study: user?.field_of_study ?? "",
    specialization: user?.specialization ?? "",
    bio: user?.bio ?? "",
    experience: user?.experience ?? "",
  });
  const [skillForm, setSkillForm] = useState({ name: "", category: "technical", proficiency: "beginner" });

  const { data: achievements = [] } = useQuery({
    queryKey: ["portfolio", userId],
    queryFn: () => fetchUserPortfolio(userId as number),
    enabled: Boolean(userId),
  });
  const { data: notifications = [] } = useQuery({ queryKey: queryKeys.notifications, queryFn: fetchNotifications });
  const { data: skills = [] } = useQuery({
    queryKey: ["skills", userId],
    queryFn: () => fetchUserSkills(userId as number),
    enabled: Boolean(userId),
  });

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      updateUser(userId as number, {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        field_of_study: profileForm.field_of_study,
        specialization: profileForm.specialization,
        bio: profileForm.bio,
        experience: profileForm.experience,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      await refetchUser();
      setFeedback("Profil zaktualizowany.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zapisac profilu.")),
  });

  const addSkillMutation = useMutation({
    mutationFn: () => addUserSkill(userId as number, skillForm),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["skills", userId] });
      setSkillForm({ name: "", category: "technical", proficiency: "beginner" });
      setFeedback("Umiejetnosc dodana.");
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie dodac umiejetnosci.")),
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ skillId, proficiency }: { skillId: number; proficiency: string }) =>
      updateUserSkill(userId as number, skillId, { proficiency }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["skills", userId] });
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie zaktualizowac umiejetnosci.")),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (skillId: number) => deleteUserSkill(userId as number, skillId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["skills", userId] });
      setError(null);
    },
    onError: (mutationError) => setError(toErrorMessage(mutationError, "Nie udalo sie usunac umiejetnosci.")),
  });

  return (
    <>
      <PageHeader eyebrow="Profil" title={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Moj profil"} description="Edycja danych, umiejetnosci i podglad aktywnosci." />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_.48fr]">
        <SectionCard title="Dane uzytkownika">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Imie" value={profileForm.first_name} onChange={(event) => setProfileForm((prev) => ({ ...prev, first_name: event.target.value }))} />
            <Input placeholder="Nazwisko" value={profileForm.last_name} onChange={(event) => setProfileForm((prev) => ({ ...prev, last_name: event.target.value }))} />
            <Input
              placeholder="Kierunek"
              value={profileForm.field_of_study}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, field_of_study: event.target.value }))}
            />
            <Input
              placeholder="Specjalizacja"
              value={profileForm.specialization}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, specialization: event.target.value }))}
            />
            <textarea
              className="md:col-span-2 min-h-20 rounded-2xl border border-white/30 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5"
              placeholder="Bio"
              value={profileForm.bio}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
            />
            <textarea
              className="md:col-span-2 min-h-20 rounded-2xl border border-white/30 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5"
              placeholder="Doswiadczenie"
              value={profileForm.experience}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, experience: event.target.value }))}
            />
            <Button className="md:col-span-2" onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Zapisywanie..." : "Zapisz profil"}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Powiadomienia">
          <div className="space-y-3">
            {notifications.length === 0 ? <p className="text-sm text-muted">Brak powiadomien.</p> : null}
            {notifications.map((notification) => (
              <article key={notification.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{notification.title}</p>
                  {!notification.is_read ? <Badge tone="warning">Nowe</Badge> : null}
                </div>
                <p className="mt-1 text-muted">{notification.message}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_.48fr]">
        <SectionCard title="Umiejetnosci">
          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <Input placeholder="Nazwa" value={skillForm.name} onChange={(event) => setSkillForm((prev) => ({ ...prev, name: event.target.value }))} />
            <Input placeholder="Kategoria" value={skillForm.category} onChange={(event) => setSkillForm((prev) => ({ ...prev, category: event.target.value }))} />
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={skillForm.proficiency}
              onChange={(event) => setSkillForm((prev) => ({ ...prev, proficiency: event.target.value }))}
            >
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
              <option value="expert">expert</option>
            </select>
            <Button className="md:col-span-3" disabled={!skillForm.name} onClick={() => addSkillMutation.mutate()}>
              Dodaj umiejetnosc
            </Button>
          </div>
          <div className="space-y-3">
            {skills.map((skill) => (
              <article key={skill.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{skill.name}</p>
                    <p className="text-muted">{skill.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 rounded-xl border border-white/30 bg-white/70 px-3 text-xs dark:border-white/10 dark:bg-white/5"
                      value={skill.proficiency}
                      onChange={(event) => updateSkillMutation.mutate({ skillId: skill.id, proficiency: event.target.value })}
                    >
                      <option value="beginner">beginner</option>
                      <option value="intermediate">intermediate</option>
                      <option value="advanced">advanced</option>
                      <option value="expert">expert</option>
                    </select>
                    <Button variant="ghost" onClick={() => deleteSkillMutation.mutate(skill.id)}>
                      Usun
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Portfolio i osiagniecia">
          <div className="space-y-4">
            {achievements.length === 0 ? <p className="text-sm text-muted">Brak wpisow portfolio dla tego uzytkownika.</p> : null}
            {achievements.map((achievement) => (
              <article key={achievement.id} className="rounded-[24px] bg-white/60 p-5 dark:bg-white/5">
                <h3 className="font-semibold">{achievement.title}</h3>
                <p className="mt-2 text-sm text-muted">{achievement.description}</p>
                <div className="mt-3">
                  <Badge>{achievement.category}</Badge>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
