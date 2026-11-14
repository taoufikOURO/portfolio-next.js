import { describe, expect, it } from "vitest";

import { FAKE_ADDRESS, FAKE_BIRTHDATE, FAKE_EMAIL, FAKE_PHONE, TODAY, fakeSources } from "./fixtures";
import { buildImportPlan } from "./plan";

describe("plan d'import (données fictives)", () => {
  it("lit chaque type de contenu, sans doublon", () => {
    const plan = buildImportPlan(fakeSources(), TODAY);
    expect(plan.technologies.map((technology) => technology.name)).toEqual(["Outil Un", "Outil Deux", "Outil Trois"]);
    expect(plan.skills.map((skill) => skill.name)).toEqual(["Compétence A", "Compétence B"]);
    expect(plan.educations).toHaveLength(1);
    expect(plan.educations[0].skillKeys).toHaveLength(2);
    expect(plan.projects.map((project) => project.input.slug)).toEqual(["projet-alpha", "projet-beta"]);
    expect(plan.profile.identity).toMatchObject({ firstName: "Ada", lastName: "Exemple", githubUrl: "https://github.com/exemple" });
    expect(plan.profile.resumeUrl).toBe("https://cv.exemple.invalid/cv.pdf");
  });

  it("projet : liens dans l'ordre, technologies, collaborateurs, statut", () => {
    const [alpha, beta] = buildImportPlan(fakeSources(), TODAY).projects;
    expect(alpha.input.links.map((link) => link.label)).toEqual(["Voir le projet", "Front", "API"]);
    expect(alpha.input.links.map((link) => link.url)).toEqual([
      "https://alpha.exemple.invalid",
      "https://github.com/exemple/alpha-front",
      "https://github.com/exemple/alpha-api",
    ]);
    expect(alpha.technologyKeys).toHaveLength(2);
    expect(alpha.input.collaborators).toEqual(["exemple-collab"]);
    expect(alpha.isPublished).toBe(true);
    expect(beta.isPublished).toBe(false);
  });

  it("articles : publié seulement s'il l'était déjà, date d'origine conservée", () => {
    const plan = buildImportPlan(fakeSources(), TODAY);
    const [published, upcoming] = plan.articles;
    expect(published).toMatchObject({ slug: "article-public", status: "PUBLISHED" });
    expect(published.date?.toISOString()).toBe("2025-03-14T12:00:00.000Z");
    expect(published.content.content).toBe("Contenu fictif publié.");
    expect(upcoming).toMatchObject({ slug: "article-a-venir", status: "DRAFT" });
    expect(upcoming.date?.toISOString()).toBe("2027-01-01T12:00:00.000Z");
    // Markdown introuvable : écarté et compté.
    expect(plan.articles).toHaveLength(2);
    expect(plan.rejected.articles).toEqual({ "Markdown introuvable, distant ou hors de data/": 1 });
  });

  it("n'importe aucune donnée personnelle et liste seulement leurs noms", () => {
    const plan = buildImportPlan(fakeSources(), TODAY);
    expect(plan.personalFields).toEqual([
      "profile.json : adresse",
      "profile.json : dateNaissance",
      "profile.json : email",
      "profile.json : telephone",
    ]);
    const serialized = JSON.stringify(plan);
    for (const value of [FAKE_EMAIL, FAKE_PHONE, FAKE_ADDRESS, FAKE_BIRTHDATE]) expect(serialized).not.toContain(value);
    expect(plan.profile.identity).not.toHaveProperty("email");
  });

  it("laisse tous les champs image vides : aucun chemin local conservé", () => {
    const plan = buildImportPlan(fakeSources(), TODAY);
    // 3 icônes de stack.json + 1 dans un projet, 1 image de projet, 2 photos, 1 image d'article.
    expect(plan.imagesLeftEmpty).toBe(8);
    const serialized = JSON.stringify(plan);
    expect(serialized).not.toContain("/images/");
    expect(serialized).not.toMatch(/\.(png|jpe?g|svg|webp)"/);
  });

  it("signale les fichiers sans modèle en base et les textes à relire", () => {
    const sources = fakeSources();
    const projects = sources.files["projets.json"] as { description: string }[];
    projects[1].description = `Contact : ${FAKE_EMAIL}`;
    const plan = buildImportPlan(sources, TODAY);
    expect(plan.ignoredFiles).toEqual(["faq.json"]);
    expect(plan.personalTextWarnings).toEqual(["projets : description"]);
  });

  it("écarte un élément invalide en le comptant, sans contenu", () => {
    const sources = fakeSources();
    (sources.files["formations.json"] as { intitule: string }[])[0].intitule = "";
    const plan = buildImportPlan(sources, TODAY);
    expect(plan.educations).toHaveLength(0);
    // Compétences d'une formation écartée : non retenues.
    expect(plan.skills).toHaveLength(0);
    expect(plan.rejected.educations).toEqual({ "champ refusé par la validation": 1 });
  });
});
