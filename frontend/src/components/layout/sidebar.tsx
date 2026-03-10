import { NavLink } from "react-router-dom";

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
import { cn } from "@/lib/cn";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projekty", icon: FolderKanban },
  { to: "/calendar", label: "Kalendarz", icon: Calendar },
  { to: "/polls", label: "Głosowania", icon: RadioTower },
  { to: "/members", label: "Członkowie", icon: Users },
  { to: "/knowledge", label: "Baza wiedzy", icon: BookOpen },
  { to: "/announcements", label: "Ogłoszenia", icon: Bell },
  { to: "/reports", label: "Raporty", icon: ScrollText },
  { to: "/resources", label: "Zasoby", icon: Trophy },
  { to: "/admin", label: "Admin", icon: Settings2 },
];

export function Sidebar() {
  return (
    <aside className="glass-panel hairline hidden w-[290px] shrink-0 flex-col p-4 lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2 pt-2">
        <div className="flex size-12 items-center justify-center rounded-[18px] bg-accent text-lg font-bold text-white">B</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">BioAddMed</p>
          <h1 className="text-lg font-bold">Hub</h1>
        </div>
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
