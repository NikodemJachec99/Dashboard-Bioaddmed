import { achievements, currentUser, notifications } from "@/lib/mock-data";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";

export function ProfilePage() {
  return (
    <>
      <PageHeader
        eyebrow="Profil"
        title={`${currentUser.first_name} ${currentUser.last_name}`}
        description="Portfolio aktywności, powiadomienia i osobista historia zaangażowania."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.48fr]">
        <SectionCard title="Osiągnięcia">
          <div className="space-y-4">
            {achievements.map((achievement) => (
              <article key={achievement.id} className="rounded-[24px] bg-white/60 p-5 dark:bg-white/5">
                <h3 className="font-semibold">{achievement.title}</h3>
                <p className="mt-2 text-sm text-muted">{achievement.description}</p>
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Powiadomienia">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article key={notification.id} className="rounded-[20px] bg-white/60 p-4 text-sm dark:bg-white/5">
                <p className="font-semibold">{notification.title}</p>
                <p className="mt-1 text-muted">{notification.message}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

