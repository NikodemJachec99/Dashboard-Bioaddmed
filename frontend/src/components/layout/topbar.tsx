import { startTransition } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/providers/auth-provider";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Search } from "@/components/ui/icons";

export function Topbar() {
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <header className="glass-panel hairline sticky top-4 z-10 flex items-center justify-between gap-4 px-5 py-4">
      <label className="flex flex-1 items-center gap-3 rounded-full bg-white/60 px-4 py-3 text-sm text-muted dark:bg-white/5">
        <Search size={16} />
        <input className="w-full bg-transparent outline-none" placeholder="Szukaj projektów, tasków, artykułów..." />
      </label>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button
          variant="ghost"
          className="h-11 px-4"
          disabled={isLoggingOut}
          onClick={async () => {
            await logout();
            startTransition(() => {
              navigate("/login", { replace: true });
            });
          }}
        >
          {isLoggingOut ? "Wylogowanie..." : "Wyloguj"}
        </Button>
        <Link to="/profile" className="flex items-center gap-3 rounded-full bg-white/60 px-4 py-2 dark:bg-white/5">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            {user?.first_name?.[0] ?? "B"}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-muted">{user?.global_role === "admin" ? "Admin" : "Member"}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
