import { Outlet } from "react-router-dom";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1680px] gap-6 p-4 lg:p-6">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col gap-6">
        <Topbar />
        <div className="flex flex-1 flex-col gap-6 pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

