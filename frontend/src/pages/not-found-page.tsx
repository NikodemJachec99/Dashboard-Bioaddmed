import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">404</p>
      <h1 className="text-4xl font-bold">Nie znaleziono strony</h1>
      <p className="max-w-xl text-muted">Ten adres nie prowadzi do żadnego ekranu BioAddMed Hub.</p>
      <Link to="/dashboard" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
        Wróć do dashboardu
      </Link>
    </div>
  );
}
