import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuth } from "@/app/providers/auth-provider";
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
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="glass-panel hairline overflow-hidden p-8 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">BioAddMed Hub</p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight lg:text-6xl">
            Nowoczesny system operacyjny koła naukowego.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted">
            Projekty, spotkania, głosowania, wiedza i raporty w jednym, spójnym środowisku gotowym do pracy produkcyjnej.
          </p>
        </section>
        <section className="glass-panel hairline p-8 lg:p-10">
          <h2 className="text-2xl font-bold">Zaloguj się</h2>
          <p className="mt-2 text-sm text-muted">Dostęp do panelu `bioaddmed.bieda.it`.</p>
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
                const message = error instanceof Error ? error.message : "Nie udało się zalogować.";
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
              <label className="mb-2 block text-sm font-medium">Hasło</label>
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password ? (
                <p className="mt-2 text-sm text-rose-500">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {errorMessage ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{errorMessage}</div> : null}
            <Button className="h-12 w-full gap-2" disabled={isLoggingIn}>
              {isLoggingIn ? "Logowanie..." : "Wejdź do systemu"}
              <ArrowRight size={16} />
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
