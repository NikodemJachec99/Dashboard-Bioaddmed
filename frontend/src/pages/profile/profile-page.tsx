import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/app/providers/auth-provider";
import { fetchNotifications, fetchUserPortfolio, queryKeys } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";

export function ProfilePage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data: achievements = [] } = useQuery({
    queryKey: ["portfolio", userId],
    queryFn: () => fetchUserPortfolio(userId as number),
    enabled: Boolean(userId),
  });
  const { data: notifications = [] } = useQuery({ queryKey: queryKeys.notifications, queryFn: fetchNotifications });

  return (
    <>
      <PageHeader
        eyebrow="Profil"
        title={`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Mój profil"}
        description="Twoje dane, osiągnięcia i powiadomienia pobierane z produkcyjnego API."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.48fr]">
        <SectionCard title="Dane użytkownika">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <p className="text-muted">Email</p>
              <p className="mt-1 font-semibold">{user?.email ?? "-"}</p>
            </div>
            <div className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <p className="text-muted">Rola globalna</p>
              <p className="mt-1">
                <Badge tone={user?.global_role === "admin" ? "warning" : "default"}>{user?.global_role ?? "member"}</Badge>
              </p>
            </div>
            <div className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <p className="text-muted">Kierunek</p>
              <p className="mt-1 font-semibold">{user?.field_of_study || "-"}</p>
            </div>
            <div className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
              <p className="text-muted">Specjalizacja</p>
              <p className="mt-1 font-semibold">{user?.specialization || "-"}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Powiadomienia">
          <div className="space-y-3">
            {notifications.length === 0 ? <p className="text-sm text-muted">Brak powiadomień.</p> : null}
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

      <SectionCard title="Portfolio i osiągnięcia">
        <div className="space-y-4">
          {achievements.length === 0 ? <p className="text-sm text-muted">Brak wpisów portfolio dla tego użytkownika.</p> : null}
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
    </>
  );
}
