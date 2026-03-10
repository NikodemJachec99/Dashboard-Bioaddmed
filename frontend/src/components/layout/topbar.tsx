import { startTransition } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/app/providers/auth-provider";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const navigate = useNavigate();
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <header className="tile-panel hairline sticky top-4 z-20 flex items-center justify-between gap-4 px-5 py-4">
      <GlobalSearch />
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
        <Link to="/profile" className="tile-soft flex items-center gap-3 rounded-full px-4 py-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            {user?.first_name?.[0] ?? "B"}
          </div>
          <div className="hidden text-left md:block">
            <p className="text-sm font-semibold">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted">{user?.global_role === "admin" ? "Admin" : "Member"}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
