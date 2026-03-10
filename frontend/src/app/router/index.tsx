import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import { AppShell } from "@/app/layouts/app-shell";
import { AdminRoute, ProtectedRoute } from "@/app/router/guards";
import { AdminPage } from "@/pages/admin/admin-page";
import { AnnouncementsPage } from "@/pages/announcements/announcements-page";
import { LoginPage } from "@/pages/auth/login-page";
import { CalendarPage } from "@/pages/calendar/calendar-page";
import { DashboardPage } from "@/pages/dashboard/dashboard-page";
import { KnowledgePage } from "@/pages/knowledge/knowledge-page";
import { MembersPage } from "@/pages/members/members-page";
import { PollsPage } from "@/pages/polls/polls-page";
import { ProfilePage } from "@/pages/profile/profile-page";
import { ProjectDetailPage } from "@/pages/projects/project-detail-page";
import { ProjectsPage } from "@/pages/projects/projects-page";
import { ReportsPage } from "@/pages/reports/reports-page";
import { ResourcesPage } from "@/pages/resources/resources-page";
import { NotFoundPage } from "@/pages/not-found-page";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/projects", element: <ProjectsPage /> },
          { path: "/projects/:slug", element: <ProjectDetailPage /> },
          { path: "/calendar", element: <CalendarPage /> },
          { path: "/polls", element: <PollsPage /> },
          { path: "/members", element: <MembersPage /> },
          { path: "/knowledge", element: <KnowledgePage /> },
          { path: "/announcements", element: <AnnouncementsPage /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/resources", element: <ResourcesPage /> },
          { path: "/profile", element: <ProfilePage /> },
          {
            element: <AdminRoute />,
            children: [{ path: "/admin", element: <AdminPage /> }],
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
