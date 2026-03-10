import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { fetchNotificationSummary, markAllNotificationsRead, markNotificationRead, queryKeys } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell } from "@/components/ui/icons";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pl-PL");
}

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["notifications", "summary"],
    queryFn: fetchNotificationSummary,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: number) => markNotificationRead(notificationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
        queryClient.invalidateQueries({ queryKey: ["notifications", "summary"] }),
      ]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
        queryClient.invalidateQueries({ queryKey: ["notifications", "summary"] }),
      ]);
    },
  });

  return (
    <div className="relative">
      <button
        type="button"
        className="tile-soft relative flex h-11 w-11 items-center justify-center rounded-full"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {data?.unread ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {data.unread > 9 ? "9+" : data.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="tile-panel absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[420px] max-w-[92vw] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Notification center</p>
              <h3 className="mt-1 text-lg font-semibold">Powiadomienia operacyjne</h3>
            </div>
            <Button variant="ghost" className="px-3 py-2 text-xs" onClick={() => markAllReadMutation.mutate()}>
              Oznacz wszystko
            </Button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="tile-soft px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Nieprzeczytane</p>
              <p className="mt-2 text-2xl font-bold">{data?.unread ?? 0}</p>
            </div>
            <div className="tile-soft px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Lacznie</p>
              <p className="mt-2 text-2xl font-bold">{data?.total ?? 0}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {data?.recent?.length ? (
              data.recent.map((notification) => (
                <article key={notification.id} className="tile-soft px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{notification.title}</p>
                        <Badge tone={notification.is_read ? "default" : "warning"}>{notification.is_read ? "read" : "new"}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">{notification.message}</p>
                      <p className="mt-2 text-xs text-muted">{formatDateTime(notification.created_at)}</p>
                    </div>
                    {!notification.is_read ? (
                      <Button variant="ghost" className="px-3 py-2 text-xs" onClick={() => markReadMutation.mutate(notification.id)}>
                        Read
                      </Button>
                    ) : null}
                  </div>
                  {notification.url ? (
                    <Link className="mt-3 inline-flex text-sm font-medium text-accent underline" to={notification.url} onClick={() => setOpen(false)}>
                      Otworz
                    </Link>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="tile-soft px-4 py-5 text-sm text-muted">Brak powiadomien do pokazania.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
