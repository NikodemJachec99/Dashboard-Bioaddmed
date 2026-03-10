import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "@/app/providers/auth-provider";
import { AppLogo } from "@/components/common/app-logo";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { user, isLoading, isLoggingIn, login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "admin@bioaddmed.local",
      password: "change-me",
    },
  });

  if (!isLoading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,247,255,0.9))] dark:bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(10,15,32,0.96))]" />
      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="glass-panel hairline relative overflow-hidden p-8 lg:p-12">
          <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          <AppLogo titleClassName="text-2xl lg:text-3xl" subtitleClassName="tracking-[0.3em]" />
          <h1 className="mt-8 max-w-2xl text-4xl font-bold leading-tight tracking-[-0.05em] lg:text-6xl">
            Operacyjny cockpit dla projektow, zespolu i decyzji.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted">
            Projekty, spotkania, glosowania, wiedza i raporty w jednym, spojnym srodowisku gotowym do codziennej pracy produkcyjnej.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Portfolio</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.04em]">Projekty</p>
              <p className="mt-2 text-sm text-muted">Status, milestone&apos;y, ryzyka i linki operacyjne w jednym miejscu.</p>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Workflow</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.04em]">Kanban</p>
              <p className="mt-2 text-sm text-muted">Taski, komentarze, checklisty i rzeczywisty przeplyw pracy zespolu.</p>
            </div>
            <div className="rounded-[28px] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Governance</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.04em]">Decyzje</p>
              <p className="mt-2 text-sm text-muted">Spotkania, glosowania, ogloszenia i raporty gotowe do wdrozenia.</p>
            </div>
          </div>
        </section>
        <section className="glass-panel hairline relative p-8 lg:p-10">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <h2 className="text-2xl font-bold tracking-[-0.03em]">Zaloguj sie</h2>
          <p className="mt-2 text-sm text-muted">Dostep do panelu `bioaddmed.bieda.it`.</p>
          <form
            className="mt-8 space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setErrorMessage(null);
              try {
                await login(values);
                startTransition(() => {
                  navigate("/dashboard", { replace: true });
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : "Nie udalo sie zalogowac.";
                setErrorMessage(message);
              }
            })}
          >
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <Input {...form.register("email")} />
              {form.formState.errors.email ? (
                <p className="mt-2 text-sm text-rose-500">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Haslo</label>
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password ? (
                <p className="mt-2 text-sm text-rose-500">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {errorMessage ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{errorMessage}</div> : null}
            <Button className="h-12 w-full gap-2" disabled={isLoggingIn}>
              {isLoggingIn ? "Logowanie..." : "Wejdz do systemu"}
              <ArrowRight size={16} />
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
