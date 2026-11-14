// Store Prisma de l'import (phase 2, E65 et E68) : écrit par les modules de
// `lib/` (mêmes transactions, verrous et contraintes que l'admin), sauf
// l'identité du profil (sans l'e-mail) et les articles (créés en une seule
// transaction, à leur date d'origine, pour qu'un arrêt en cours de route ne
// laisse jamais un article sans slug, que la relance recréerait).
//
// Aucune image : technologies sans icône (champ vide), projets, profil et
// articles sans image. Aucun accès aux tables de l'administrateur, de ses
// sessions ni de ses jetons (vérifié par `run.test.ts`). Aucun appel GitHub :
// les collaborateurs sont créés avec leur seul nom d'utilisateur.

import { lockArticleSlugs, isArticleSlugTaken } from "@/lib/articles/shared";
import { db } from "@/lib/db";
import { createEducation } from "@/lib/educations";
import { saveProfileResume } from "@/lib/profile";
import { createProject, setProjectPublication } from "@/lib/projects";
import { createSkill } from "@/lib/skills";
import { createTechnology } from "@/lib/technologies";
import { normalizeSkillName } from "@/lib/validation/skill";
import { normalizeTechnologyName } from "@/lib/validation/technology";

import type { ImportStore } from "./run";

const PROFILE_ID = 1;

export const prismaImportStore: ImportStore = {
  async findTechnologyId(normalizedName) {
    return (await db.technology.findUnique({ where: { normalizedName }, select: { id: true } }))?.id ?? null;
  },

  async createTechnology(name) {
    const result = await createTechnology(name, "");
    if (result.status === "saved") return result.technology.id;
    // Créée entre-temps : l'existante est gardée telle quelle.
    const existing = await prismaImportStore.findTechnologyId(normalizeTechnologyName(name));
    if (!existing) throw new Error("technologie introuvable après un doublon");
    return existing;
  },

  async findSkillId(normalizedName) {
    return (await db.skill.findUnique({ where: { normalizedName }, select: { id: true } }))?.id ?? null;
  },

  async createSkill(name) {
    const result = await createSkill(name);
    if (result.status === "saved") return result.skill.id;
    const existing = await prismaImportStore.findSkillId(normalizeSkillName(name));
    if (!existing) throw new Error("compétence introuvable après un doublon");
    return existing;
  },

  async educationExists(title, institution) {
    return (await db.education.findFirst({ where: { title, institution }, select: { id: true } })) !== null;
  },

  async createEducation(input) {
    return (await createEducation(input)).status === "saved";
  },

  async profileState() {
    const profile = await db.profile.findUnique({
      where: { id: PROFILE_ID },
      select: { firstName: true, lastName: true, resumeUrl: true, resumePath: true },
    });
    return {
      hasIdentity: !!(profile?.firstName.trim() || profile?.lastName.trim()),
      hasResume: !!(profile?.resumeUrl || profile?.resumePath),
    };
  },

  async saveProfileIdentity(identity) {
    // L'e-mail n'est jamais écrit (donnée personnelle, E68) : il se saisit dans l'admin.
    await db.profile.upsert({
      where: { id: PROFILE_ID },
      create: { id: PROFILE_ID, ...identity },
      update: identity,
      select: { id: true },
    });
  },

  async saveProfileResumeUrl(url) {
    await saveProfileResume({ url });
  },

  async projectExists(slug) {
    return (await db.project.findUnique({ where: { slug }, select: { id: true } })) !== null;
  },

  async createProject(input, isPublished) {
    // `newCollaborators` vide : aucun appel GitHub, les collaborateurs sont créés sans profil.
    const result = await createProject(input, { newCollaborators: [] });
    if (result.status !== "saved") return false;
    if (isPublished) await setProjectPublication(result.project.id, true);
    return true;
  },

  async articleSlugTaken(slug) {
    return isArticleSlugTaken(db, slug);
  },

  async createArticle(article) {
    const when = article.date ?? new Date();
    const published = article.status === "PUBLISHED";
    return db.$transaction(async (tx) => {
      await lockArticleSlugs(tx);
      if (await isArticleSlugTaken(tx, article.slug)) return false;
      const created = await tx.article.create({
        data: {
          status: article.status,
          slug: published ? article.slug : null,
          // « Publié le » : la date d'origine ; aucune republication (« mis à jour le » vide).
          publishedAt: published ? when : null,
          lastPublishedAt: null,
          createdAt: when,
          updatedAt: when,
        },
        select: { id: true },
      });
      const version = await tx.articleVersion.create({
        data: { articleId: created.id, ...article.content, slug: article.slug, coverImagePath: null, createdAt: when, updatedAt: when },
        select: { id: true },
      });
      await tx.article.update({
        where: { id: created.id },
        data: { ...(published ? { publishedVersionId: version.id } : { draftVersionId: version.id }), updatedAt: when },
      });
      return true;
    });
  },
};
