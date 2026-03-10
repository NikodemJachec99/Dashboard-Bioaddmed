import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/client";
import {
  createKnowledgeArticle,
  deleteKnowledgeArticle,
  fetchKnowledge,
  fetchProjects,
  queryKeys,
  updateKnowledgeArticle,
} from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Brak uprawnien do tej akcji.";
    if (error.status === 404) return "Artykul nie istnieje.";
    if (error.status === 409) return "Konflikt wersji artykulu.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function KnowledgePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: articles = [] } = useQuery({ queryKey: queryKeys.knowledge, queryFn: fetchKnowledge });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    category: "guide",
    visibility: "internal",
    related_project: "",
    is_pinned: false,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const coordinatorProjectIds = useMemo(
    () =>
      projects
        .filter((project) =>
          project.memberships?.some(
            (membership) => membership.user === user?.id && membership.project_role === "coordinator" && membership.is_active !== false,
          ),
        )
        .map((project) => project.id),
    [projects, user?.id],
  );
  const canCreateGlobal = user?.global_role === "admin";
  const canCreateProjectArticle = coordinatorProjectIds.length > 0 || canCreateGlobal;

  const filteredArticles = useMemo(
    () =>
      articles
        .filter((article) => (categoryFilter === "all" ? true : article.category === categoryFilter))
        .filter((article) => {
          const phrase = search.toLowerCase().trim();
          if (!phrase) return true;
          return `${article.title} ${article.content} ${article.category}`.toLowerCase().includes(phrase);
        })
        .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned)),
    [articles, categoryFilter, search],
  );

  const createMutation = useMutation({
    mutationFn: createKnowledgeArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledge });
      setForm({ title: "", slug: "", content: "", category: "guide", visibility: "internal", related_project: "", is_pinned: false });
      setFeedback("Artykul dodany.");
      setError(null);
    },
    onError: (mutationError) => setError(errorMessage(mutationError, "Nie udalo sie dodac artykulu.")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ articleId, payload }: { articleId: number; payload: Parameters<typeof updateKnowledgeArticle>[1] }) =>
      updateKnowledgeArticle(articleId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledge });
      setEditingId(null);
      setFeedback("Artykul zaktualizowany.");
      setError(null);
    },
    onError: (mutationError) => setError(errorMessage(mutationError, "Nie udalo sie zaktualizowac artykulu.")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKnowledgeArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledge });
      setFeedback("Artykul usuniety.");
      setError(null);
    },
    onError: (mutationError) => setError(errorMessage(mutationError, "Nie udalo sie usunac artykulu.")),
  });

  const canManageArticle = (relatedProjectId?: number | null) => {
    if (user?.global_role === "admin") return true;
    if (!relatedProjectId) return false;
    return coordinatorProjectIds.includes(relatedProjectId);
  };

  return (
    <>
      <PageHeader eyebrow="Wiedza" title="Baza wiedzy" description="Pelny CRUD artykulow: kategorie, pinowanie i kontrola widocznosci." />
      {feedback ? <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}
      {error ? <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      {canCreateProjectArticle ? (
        <SectionCard title="Nowy artykul">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Tytul"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                  slug: prev.slug || slugify(event.target.value),
                }))
              }
            />
            <Input placeholder="Slug" value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))} />
            <textarea
              className="md:col-span-2 min-h-28 rounded-2xl border border-white/30 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5"
              placeholder="Tresc artykulu"
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              <option value="guide">guide</option>
              <option value="instruction">instruction</option>
              <option value="standard">standard</option>
              <option value="checklist">checklist</option>
              <option value="lesson">lesson</option>
              <option value="faq">faq</option>
              <option value="onboarding">onboarding</option>
            </select>
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={form.visibility}
              onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
            >
              <option value="internal">internal</option>
              <option value="project">project</option>
            </select>
            <select
              className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
              value={form.related_project}
              onChange={(event) => setForm((prev) => ({ ...prev, related_project: event.target.value }))}
            >
              <option value="">Globalny</option>
              {projects
                .filter((project) => user?.global_role === "admin" || coordinatorProjectIds.includes(project.id))
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(event) => setForm((prev) => ({ ...prev, is_pinned: event.target.checked }))}
              />
              Przypnij artykul
            </label>
            <Button
              onClick={() =>
                createMutation.mutate({
                  title: form.title,
                  slug: form.slug,
                  content: form.content,
                  category: form.category,
                  visibility: form.related_project ? "project" : form.visibility,
                  related_project: form.related_project ? Number(form.related_project) : null,
                  is_pinned: form.is_pinned,
                })
              }
              disabled={!form.title || !form.slug || !form.content || createMutation.isPending || (!canCreateGlobal && !form.related_project)}
            >
              Dodaj artykul
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Artykuly">
        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <Input placeholder="Szukaj po tytule/tresci/kategorii" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select
            className="h-12 rounded-2xl border border-white/30 bg-white/70 px-4 text-sm dark:border-white/10 dark:bg-white/5"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">all</option>
            <option value="guide">guide</option>
            <option value="instruction">instruction</option>
            <option value="standard">standard</option>
            <option value="checklist">checklist</option>
            <option value="lesson">lesson</option>
            <option value="faq">faq</option>
            <option value="onboarding">onboarding</option>
          </select>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredArticles.map((article) => {
            const canManage = canManageArticle(article.related_project);
            const isEditing = editingId === article.id;
            return (
              <article key={article.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{article.title}</h3>
                    <p className="mt-2 text-sm text-muted">{article.content}</p>
                    <p className="mt-2 text-xs text-muted">
                      {article.category} {article.related_project ? `| project #${article.related_project}` : "| global"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">{article.is_pinned ? <Badge>Pin</Badge> : null}</div>
                </div>
                {canManage ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingId(isEditing ? null : article.id);
                      }}
                    >
                      {isEditing ? "Zamknij edycje" : "Edytuj"}
                    </Button>
                    <Button variant="secondary" onClick={() => updateMutation.mutate({ articleId: article.id, payload: { is_pinned: !article.is_pinned } })}>
                      {article.is_pinned ? "Odepnij" : "Przypnij"}
                    </Button>
                    <Button variant="ghost" onClick={() => deleteMutation.mutate(article.id)}>
                      Usun
                    </Button>
                  </div>
                ) : null}
                {isEditing ? (
                  <div className="mt-3 grid gap-2">
                    <Input
                      defaultValue={article.title}
                      onBlur={(event) => updateMutation.mutate({ articleId: article.id, payload: { title: event.target.value } })}
                    />
                    <textarea
                      className="min-h-24 rounded-xl border border-white/30 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-white/5"
                      defaultValue={article.content}
                      onBlur={(event) => updateMutation.mutate({ articleId: article.id, payload: { content: event.target.value } })}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}
