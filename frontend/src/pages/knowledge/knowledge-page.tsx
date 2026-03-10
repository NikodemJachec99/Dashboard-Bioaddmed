import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createKnowledgeArticle, deleteKnowledgeArticle, fetchKnowledge, fetchProjects, queryKeys } from "@/api/queries";
import { useAuth } from "@/app/providers/auth-provider";
import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function KnowledgePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: articles = [] } = useQuery({ queryKey: queryKeys.knowledge, queryFn: fetchKnowledge });
  const { data: projects = [] } = useQuery({ queryKey: queryKeys.projects, queryFn: fetchProjects });
  const canManageKnowledge =
    user?.global_role === "admin" ||
    projects.some((project) => project.memberships?.some((membership) => membership.user === user?.id && membership.project_role === "coordinator"));
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    category: "guide",
    related_project: "",
  });

  const createMutation = useMutation({
    mutationFn: createKnowledgeArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledge });
      setForm({ title: "", slug: "", content: "", category: "guide", related_project: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKnowledgeArticle,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledge });
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Wiedza"
        title="Baza wiedzy"
        description="Artykuły onboardingowe, standardy pracy, checklisty i lessons learned."
      />
      {canManageKnowledge ? (
        <SectionCard title="Nowy artykuł">
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Tytuł" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          <Input placeholder="Slug" value={form.slug} onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))} />
          <Input placeholder="Treść" value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
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
            value={form.related_project}
            onChange={(event) => setForm((prev) => ({ ...prev, related_project: event.target.value }))}
          >
            <option value="">Artykuł globalny</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() =>
              createMutation.mutate({
                title: form.title,
                slug: form.slug,
                content: form.content,
                category: form.category,
                visibility: form.related_project ? "project" : "internal",
                related_project: form.related_project ? Number(form.related_project) : null,
              })
            }
            disabled={createMutation.isPending || !form.title || !form.slug || !form.content}
          >
            Dodaj artykuł
          </Button>
        </div>
        </SectionCard>
      ) : null}
      <SectionCard title="Artykuły">
        <div className="grid gap-4 xl:grid-cols-2">
          {articles.map((article) => (
            <article key={article.id} className="rounded-[24px] border border-white/20 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{article.title}</h3>
                  <p className="mt-2 text-sm text-muted">{article.content}</p>
                  <p className="mt-2 text-xs text-muted">{article.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  {article.is_pinned ? <Badge>Pin</Badge> : null}
                  {canManageKnowledge ? (
                    <>
                      <Button variant="ghost" onClick={() => deleteMutation.mutate(article.id)}>
                        Usuń
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
