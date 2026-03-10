import { NavLink } from "react-router-dom";

import { useAuth } from "@/app/providers/auth-provider";
import {
  Bell,
  BookOpen,
  Calendar,
  FolderKanban,
  LayoutDashboard,
  RadioTower,
  ScrollText,
  Settings2,
  Trophy,
  Users,
} from "@/components/ui/icons";
import { AppLogo } from "@/components/common/app-logo";
import { cn } from "@/lib/cn";

const baseItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projekty", icon: FolderKanban },
  { to: "/calendar", label: "Kalendarz", icon: Calendar },
  { to: "/polls", label: "Glosowania", icon: RadioTower },
  { to: "/members", label: "Czlonkowie", icon: Users },
  { to: "/knowledge", label: "Baza wiedzy", icon: BookOpen },
  { to: "/announcements", label: "Ogloszenia", icon: Bell },
  { to: "/reports", label: "Raporty", icon: ScrollText },
  { to: "/resources", label: "Zasoby", icon: Trophy },
];

const adminItem = { to: "/admin", label: "Admin", icon: Settings2 };

export function Sidebar() {
  const { user } = useAuth();
  const items = [...baseItems, ...(user?.global_role === "admin" ? [adminItem] : [])];

  return (
    <aside className="glass-panel hairline hidden w-[290px] shrink-0 flex-col p-4 lg:flex">
      <div className="mb-8 px-2 pt-2">
        <AppLogo compact />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted transition hover:bg-white/40 hover:text-foreground dark:hover:bg-white/5",
                  isActive && "bg-white/70 text-foreground shadow-sm dark:bg-white/10",
                )
              }
            >
              <Icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
