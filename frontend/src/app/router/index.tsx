import { Suspense, lazy, type ReactElement } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import { AppShell } from "@/app/layouts/app-shell";
import { AdminRoute, ProtectedRoute } from "@/app/router/guards";

const AdminPage = lazy(() => import("@/pages/admin/admin-page").then((module) => ({ default: module.AdminPage })));
const AnnouncementsPage = lazy(() => import("@/pages/announcements/announcements-page").then((module) => ({ default: module.AnnouncementsPage })));
const LoginPage = lazy(() => import("@/pages/auth/login-page").then((module) => ({ default: module.LoginPage })));
const CalendarPage = lazy(() => import("@/pages/calendar/calendar-page").then((module) => ({ default: module.CalendarPage })));
const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const KnowledgePage = lazy(() => import("@/pages/knowledge/knowledge-page").then((module) => ({ default: module.KnowledgePage })));
const MembersPage = lazy(() => import("@/pages/members/members-page").then((module) => ({ default: module.MembersPage })));
const PollsPage = lazy(() => import("@/pages/polls/polls-page").then((module) => ({ default: module.PollsPage })));
const ProfilePage = lazy(() => import("@/pages/profile/profile-page").then((module) => ({ default: module.ProfilePage })));
const ProjectDetailPage = lazy(() => import("@/pages/projects/project-detail-page").then((module) => ({ default: module.ProjectDetailPage })));
const ProjectsPage = lazy(() => import("@/pages/projects/projects-page").then((module) => ({ default: module.ProjectsPage })));
const ReportsPage = lazy(() => import("@/pages/reports/reports-page").then((module) => ({ default: module.ReportsPage })));
const ResourcesPage = lazy(() => import("@/pages/resources/resources-page").then((module) => ({ default: module.ResourcesPage })));
const NotFoundPage = lazy(() => import("@/pages/not-found-page").then((module) => ({ default: module.NotFoundPage })));

function withSuspense(element: ReactElement) {
  return (
    <Suspense
      fallback={
        <div className="glass-panel hairline flex min-h-[280px] items-center justify-center rounded-[32px] p-8 text-sm text-muted">
          Ladowanie widoku...
        </div>
      }
    >
      {element}
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: "/login", element: withSuspense(<LoginPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: withSuspense(<DashboardPage />) },
          { path: "/projects", element: withSuspense(<ProjectsPage />) },
          { path: "/projects/:slug", element: withSuspense(<ProjectDetailPage />) },
          { path: "/calendar", element: withSuspense(<CalendarPage />) },
          { path: "/polls", element: withSuspense(<PollsPage />) },
          { path: "/members", element: withSuspense(<MembersPage />) },
          { path: "/knowledge", element: withSuspense(<KnowledgePage />) },
          { path: "/announcements", element: withSuspense(<AnnouncementsPage />) },
          { path: "/reports", element: withSuspense(<ReportsPage />) },
          { path: "/resources", element: withSuspense(<ResourcesPage />) },
          { path: "/profile", element: withSuspense(<ProfilePage />) },
          {
            element: <AdminRoute />,
            children: [{ path: "/admin", element: withSuspense(<AdminPage />) }],
          },
          { path: "*", element: withSuspense(<NotFoundPage />) },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
