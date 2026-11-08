// Doublures pour les tests Vitest (étapes 7 à 9).
//
// - `fakeDb` : base en mémoire qui imite le sous-ensemble du client Prisma
//   utilisé par `lib/auth/` (administrateurs, sessions, tentatives, jetons des
//   liens), `lib/skills.ts` et `lib/educations.ts` (compétences, formations et
//   leurs liens). Les options `select` sont ignorées : les lignes sont
//   renvoyées entières, avec leurs relations ;
// - `testEnv` : variables d'environnement factices, modifiables par test ;
// - `fakeRequest` : cookies et en-têtes de la requête (`next/headers`) ;
// - `RedirectError` : remplace l'exception levée par `redirect()`.
//
// Utilisation, dans un fichier de test :
//   vi.mock("@/lib/db", async () => ({ db: (await import("@/test/fakes")).fakeDb.client }));
//   vi.mock("@/lib/env", async () => ({ env: (await import("@/test/fakes")).testEnv }));
// puis `resetFakes()` dans `beforeEach`.
//
// Valeurs factices uniquement.

type Row = Record<string, unknown>;

export type FakeAdmin = {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: Date | null;
};

export type FakeSession = {
  id: string;
  adminId: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

export type FakeAuthToken = {
  id: string;
  adminId: string;
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET";
  tokenHash: string;
  targetEmail: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type FakeSkill = { id: string; name: string; normalizedName: string };

export type FakeEducation = {
  id: string;
  title: string;
  description: string;
  institution: string;
  location: string;
  startDate: Date;
  endDate: Date | null;
  honors: string | null;
  /** `Decimal` côté Prisma ; chaîne ici (seul `toString()` est utilisé). */
  grade: string | null;
  position: number;
};

export type FakeTechnology = {
  id: string;
  name: string;
  normalizedName: string;
  iconPath: string;
  position: number;
};

/**
 * Projet : l'étape 11 n'utilise que le titre et la position (rattachement des
 * technologies) ; les autres champs, facultatifs ici, prennent leur valeur par
 * défaut à la lecture (étape 13).
 */
export type FakeProject = {
  id: string;
  title: string;
  position: number;
  slug?: string;
  description?: string;
  imagePath?: string | null;
  isPublished?: boolean;
  date?: Date | null;
};

export type FakeProjectLink = { id: string; projectId: string; label: string; url: string; position: number };

export type FakeCollaborator = {
  id: string;
  githubUsername: string;
  name: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  syncedAt: Date | null;
  syncError: string | null;
};

/** Ligne de la table de liaison implicite `_project_collaborators`. */
export type FakeProjectCollaborator = { projectId: string; collaboratorId: string };

/** Ligne de la table de liaison implicite `_project_technologies`. */
export type FakeProjectTechnology = { projectId: string; technologyId: string };

/** Ligne de la table de liaison implicite `_education_skills`. */
export type FakeEducationSkill = { educationId: string; skillId: string };

export type FakeProfile = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  bio: string;
  about: string;
  githubUrl: string | null;
  linkedinUrl: string | null;
  photoPath: string | null;
  cutoutPhotoPath: string | null;
  resumeUrl: string | null;
  resumePath: string | null;
};

const EMPTY_FAKE_PROFILE: Omit<FakeProfile, "id"> = {
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  bio: "",
  about: "",
  githubUrl: null,
  linkedinUrl: null,
  photoPath: null,
  cutoutPhotoPath: null,
  resumeUrl: null,
  resumePath: null,
};

export type FakeLoginAttempt = {
  id: string;
  email: string;
  ipAddress: string;
  succeeded: boolean;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Filtres `where` (sous-ensemble de Prisma : égalité, lt/lte/gt/gte/not, OR)
// ---------------------------------------------------------------------------

function comparable(value: unknown): number | string | null {
  if (value instanceof Date) return value.getTime();
  if (value === undefined) return null;
  return value as number | string | null;
}

function matchesOperator(operator: string, value: unknown, operand: unknown): boolean {
  const a = comparable(value);
  const b = comparable(operand);
  switch (operator) {
    // Comme en SQL : une comparaison avec NULL est fausse.
    case "lt":
      return a !== null && b !== null && a < b;
    case "lte":
      return a !== null && b !== null && a <= b;
    case "gt":
      return a !== null && b !== null && a > b;
    case "gte":
      return a !== null && b !== null && a >= b;
    case "not":
      return b === null ? a !== null : a !== null && a !== b;
    case "in":
      return (operand as unknown[]).includes(value);
    default:
      throw new Error(`Opérateur non pris en charge par la doublure : ${operator}`);
  }
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return (condition as Row[]).some((clause) => matches(row, clause));
    const value = row[key];
    if (condition === null) return value === null || value === undefined;
    if (condition instanceof Date) return comparable(value) === condition.getTime();
    if (condition !== null && typeof condition === "object") {
      return Object.entries(condition as Row).every(([operator, operand]) =>
        matchesOperator(operator, value, operand),
      );
    }
    return value === condition;
  });
}

function removeWhere<T extends Row>(rows: T[], where: Row): number {
  let count = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (matches(rows[index], where)) {
      rows.splice(index, 1);
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Base en mémoire
// ---------------------------------------------------------------------------

let sequence = 0;

/** UUID factice, croissant comme un UUID v7. */
export function fakeId(): string {
  sequence += 1;
  return `00000000-0000-7000-8000-${String(sequence).padStart(12, "0")}`;
}

type OrderBy = Record<string, "asc" | "desc">[] | Record<string, "asc" | "desc">;

function sortRows<T extends Row>(rows: T[], orderBy?: OrderBy): T[] {
  if (!orderBy) return rows;
  const keys = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap((entry) => Object.entries(entry));
  return [...rows].sort((left, right) => {
    for (const [key, direction] of keys) {
      const a = comparable(left[key]) ?? "";
      const b = comparable(right[key]) ?? "";
      if (a < b) return direction === "asc" ? -1 : 1;
      if (a > b) return direction === "asc" ? 1 : -1;
    }
    return 0;
  });
}

/** Erreur connue de Prisma (seul `code` est lu par l'application). */
function prismaError(code: "P2002" | "P2025", message: string): Error {
  return Object.assign(new Error(`Doublure : ${message} (${code}).`), { code });
}

function createFakeDb() {
  const skills: FakeSkill[] = [];
  const educations: FakeEducation[] = [];
  const educationSkills: FakeEducationSkill[] = [];
  const technologies: FakeTechnology[] = [];
  const profiles: FakeProfile[] = [];
  const projects: FakeProject[] = [];
  const projectTechnologies: FakeProjectTechnology[] = [];
  const projectLinks: FakeProjectLink[] = [];
  const collaborators: FakeCollaborator[] = [];
  const projectCollaborators: FakeProjectCollaborator[] = [];
  const admins: FakeAdmin[] = [];
  const sessions: FakeSession[] = [];
  const loginAttempts: FakeLoginAttempt[] = [];
  const authTokens: FakeAuthToken[] = [];

  const withAdmin = (session: FakeSession) => {
    const admin = admins.find((candidate) => candidate.id === session.adminId);
    if (!admin) throw new Error("Doublure : session sans administrateur.");
    return { ...session, admin: { email: admin.email, emailVerifiedAt: admin.emailVerifiedAt } };
  };

  const calls = {
    executeRaw: [] as string[],
    sessionFindUnique: 0,
    authTokenFindUnique: 0,
    profileUpsert: [] as { where: Row; create: Row }[],
    /** Écritures sur les collaborateurs : création, `upsert` sur une ligne existante, `update`. */
    collaboratorWrites: [] as { op: "create" | "upsert-existing" | "update"; githubUsername: string }[],
  };

  const skillWithRelations = (skill: FakeSkill) => ({
    ...skill,
    educations: sortRows(
      educationSkills
        .filter((link) => link.skillId === skill.id)
        .map((link) => educations.find((education) => education.id === link.educationId)!),
      [{ position: "asc" }, { id: "asc" }],
    ).map(({ id, title }) => ({ id, title })),
  });

  const educationWithRelations = (education: FakeEducation) => ({
    ...education,
    skills: sortRows(
      educationSkills
        .filter((link) => link.educationId === education.id)
        .map((link) => skills.find((skill) => skill.id === link.skillId)!),
      { normalizedName: "asc" },
    ).map(({ id, name }) => ({ id, name })),
  });

  const technologyWithRelations = (technology: FakeTechnology) => ({
    ...technology,
    projects: sortRows(
      projectTechnologies
        .filter((link) => link.technologyId === technology.id)
        .map((link) => projects.find((project) => project.id === link.projectId)!),
      [{ position: "asc" }, { id: "asc" }],
    ).map(({ id, title }) => ({ id, title })),
  });

  const projectWithRelations = (project: FakeProject) => ({
    slug: `projet-${project.id}`,
    description: "",
    imagePath: null as string | null,
    isPublished: false,
    date: null as Date | null,
    ...project,
    links: sortRows(
      projectLinks.filter((link) => link.projectId === project.id),
      [{ position: "asc" }, { id: "asc" }],
    ).map(({ id, label, url, position }) => ({ id, label, url, position })),
    technologies: sortRows(
      projectTechnologies
        .filter((link) => link.projectId === project.id)
        .map((link) => technologies.find((technology) => technology.id === link.technologyId)!),
      [{ position: "asc" }, { id: "asc" }],
    ).map(({ id, name }) => ({ id, name })),
    collaborators: sortRows(
      projectCollaborators
        .filter((link) => link.projectId === project.id)
        .map((link) => collaborators.find((collaborator) => collaborator.id === link.collaboratorId)!),
      { githubUsername: "asc" },
    ).map((collaborator) => ({
      ...collaborator,
      // Projets auxquels le collaborateur est rattaché (orphelins annoncés avant une suppression).
      projects: projectCollaborators
        .filter((link) => link.collaboratorId === collaborator.id)
        .map((link) => ({ id: link.projectId })),
    })),
  });

  const assertUniqueSlug = (slug: string | undefined, except?: FakeProject) => {
    if (projects.some((other) => other !== except && projectWithRelations(other).slug === slug)) {
      throw prismaError("P2002", "slug de projet en double");
    }
  };

  /** `connect` et `set` : chaque ligne reliée doit exister, comme dans Prisma. */
  const assertExist = (ids: { id: string }[], rows: { id: string }[], what: string) => {
    if (ids.some(({ id }) => !rows.some((row) => row.id === id))) {
      throw prismaError("P2025", `${what} introuvable pour le lien`);
    }
  };

  type ProjectData = Partial<Omit<FakeProject, "id">> & {
    links?: { deleteMany?: Row; create?: Omit<FakeProjectLink, "id" | "projectId">[] };
    technologies?: { connect?: { id: string }[]; set?: { id: string }[] };
    collaborators?: { connect?: { id: string }[]; set?: { id: string }[] };
  };

  const applyProjectRelations = (projectId: string, data: ProjectData) => {
    const technologyIds = data.technologies?.set ?? data.technologies?.connect;
    const collaboratorIds = data.collaborators?.set ?? data.collaborators?.connect;
    if (technologyIds) assertExist(technologyIds, technologies, "technologie");
    if (collaboratorIds) assertExist(collaboratorIds, collaborators, "collaborateur");
    if (data.links?.deleteMany) removeWhere(projectLinks, { projectId });
    for (const link of data.links?.create ?? []) projectLinks.push({ ...link, id: fakeId(), projectId });
    if (data.technologies?.set) removeWhere(projectTechnologies, { projectId });
    for (const { id } of technologyIds ?? []) {
      if (!projectTechnologies.some((link) => link.projectId === projectId && link.technologyId === id)) {
        projectTechnologies.push({ projectId, technologyId: id });
      }
    }
    if (data.collaborators?.set) removeWhere(projectCollaborators, { projectId });
    for (const { id } of collaboratorIds ?? []) {
      if (!projectCollaborators.some((link) => link.projectId === projectId && link.collaboratorId === id)) {
        projectCollaborators.push({ projectId, collaboratorId: id });
      }
    }
  };

  const projectFields = (data: ProjectData): Partial<FakeProject> => {
    const fields: Row = { ...data };
    delete fields.links;
    delete fields.technologies;
    delete fields.collaborators;
    return fields as Partial<FakeProject>;
  };

  const findProject = (where: Row | undefined) =>
    projects.find((candidate) => matches(projectWithRelations(candidate), where));

  const assertUniqueTechnology = (normalizedName: string, except?: FakeTechnology) => {
    if (technologies.some((other) => other !== except && other.normalizedName === normalizedName)) {
      throw prismaError("P2002", "nom de technologie en double");
    }
  };

  const assertUniqueSkill = (normalizedName: string, except?: FakeSkill) => {
    if (skills.some((other) => other !== except && other.normalizedName === normalizedName)) {
      throw prismaError("P2002", "nom de compétence en double");
    }
  };

  /** `connect` et `set` : chaque compétence doit exister, comme dans Prisma. */
  const assertSkillsExist = (ids: { id: string }[]) => {
    if (ids.some(({ id }) => !skills.some((skill) => skill.id === id))) {
      throw prismaError("P2025", "compétence introuvable pour le lien");
    }
  };

  const linkSkills = (educationId: string, ids: { id: string }[]) => {
    for (const { id } of ids) {
      if (!educationSkills.some((link) => link.educationId === educationId && link.skillId === id)) {
        educationSkills.push({ educationId, skillId: id });
      }
    }
  };

  type EducationData = Partial<Omit<FakeEducation, "id">> & {
    skills?: { connect?: { id: string }[]; set?: { id: string }[] };
  };

  const client = {
    skill: {
      async findMany({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        return sortRows(
          skills.filter((candidate) => matches(candidate, where)),
          orderBy,
        ).map(skillWithRelations);
      },
      async findUnique({ where }: { where: Row }) {
        const skill = skills.find((candidate) => matches(candidate, where));
        return skill ? skillWithRelations(skill) : null;
      },
      async count({ where }: { where?: Row } = {}) {
        return skills.filter((candidate) => matches(candidate, where)).length;
      },
      async create({ data }: { data: Omit<FakeSkill, "id"> }) {
        assertUniqueSkill(data.normalizedName);
        const row: FakeSkill = { ...data, id: fakeId() };
        skills.push(row);
        return skillWithRelations(row);
      },
      async update({ where, data }: { where: Row; data: Partial<Omit<FakeSkill, "id">> }) {
        const skill = skills.find((candidate) => matches(candidate, where));
        if (!skill) throw prismaError("P2025", "compétence introuvable");
        if (data.normalizedName) assertUniqueSkill(data.normalizedName, skill);
        Object.assign(skill, data);
        return skillWithRelations(skill);
      },
      async delete({ where }: { where: Row }) {
        const skill = skills.find((candidate) => matches(candidate, where));
        if (!skill) throw prismaError("P2025", "compétence introuvable");
        const result = skillWithRelations(skill);
        skills.splice(skills.indexOf(skill), 1);
        // Clé étrangère en cascade : les liens partent avec la compétence.
        removeWhere(educationSkills, { skillId: skill.id });
        return result;
      },
    },
    project: {
      async findMany({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        return sortRows(
          projects.filter((candidate) => matches(projectWithRelations(candidate), where)).map(projectWithRelations),
          orderBy,
        );
      },
      async findUnique({ where }: { where: Row }) {
        const project = findProject(where);
        return project ? projectWithRelations(project) : null;
      },
      async findFirst({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        const [first] = sortRows(
          projects.filter((candidate) => matches(projectWithRelations(candidate), where)).map(projectWithRelations),
          orderBy,
        );
        return first ?? null;
      },
      async create({ data }: { data: ProjectData }) {
        const fields = projectFields(data);
        assertUniqueSlug(fields.slug);
        // Liens contrôlés avant l'insertion : un rattachement impossible annule tout, comme dans Prisma.
        assertExist(data.technologies?.connect ?? [], technologies, "technologie");
        assertExist(data.collaborators?.connect ?? [], collaborators, "collaborateur");
        const row = { ...fields, id: fakeId() } as FakeProject;
        projects.push(row);
        applyProjectRelations(row.id, data);
        return projectWithRelations(row);
      },
      async update({ where, data }: { where: Row; data: ProjectData }) {
        const project = findProject(where);
        if (!project) throw prismaError("P2025", "projet introuvable");
        const fields = projectFields(data);
        if (fields.slug !== undefined) assertUniqueSlug(fields.slug, project);
        applyProjectRelations(project.id, data);
        Object.assign(project, fields);
        return projectWithRelations(project);
      },
      async delete({ where }: { where: Row }) {
        const project = findProject(where);
        if (!project) throw prismaError("P2025", "projet introuvable");
        const result = projectWithRelations(project);
        projects.splice(projects.indexOf(project), 1);
        // Clés étrangères en cascade : liens et rattachements partent avec le projet.
        removeWhere(projectLinks, { projectId: project.id });
        removeWhere(projectTechnologies, { projectId: project.id });
        removeWhere(projectCollaborators, { projectId: project.id });
        return result;
      },
    },
    collaborator: {
      async findMany({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        return sortRows(
          collaborators.filter((candidate) => matches(candidate, where)),
          orderBy,
        ).map((row) => ({ ...row }));
      },
      async findUnique({ where }: { where: Row }) {
        const collaborator = collaborators.find((candidate) => matches(candidate, where));
        return collaborator ? { ...collaborator } : null;
      },
      async upsert({
        where,
        create,
        update,
      }: {
        where: Row;
        create: Omit<FakeCollaborator, "id">;
        update: Partial<Omit<FakeCollaborator, "id">>;
      }) {
        const existing = collaborators.find((candidate) => matches(candidate, where));
        if (existing) {
          calls.collaboratorWrites.push({ op: "upsert-existing", githubUsername: existing.githubUsername });
          Object.assign(existing, update);
          return { ...existing };
        }
        if (collaborators.some((other) => other.githubUsername === create.githubUsername)) {
          throw prismaError("P2002", "collaborateur en double");
        }
        calls.collaboratorWrites.push({ op: "create", githubUsername: create.githubUsername });
        const row: FakeCollaborator = { ...create, id: fakeId() };
        collaborators.push(row);
        return { ...row };
      },
      async update({ where, data }: { where: Row; data: Partial<Omit<FakeCollaborator, "id">> }) {
        const collaborator = collaborators.find((candidate) => matches(candidate, where));
        if (!collaborator) throw prismaError("P2025", "collaborateur introuvable");
        calls.collaboratorWrites.push({ op: "update", githubUsername: collaborator.githubUsername });
        Object.assign(collaborator, data);
        return { ...collaborator };
      },
      /** `projects: { none: {} }` : seuls les collaborateurs rattachés à aucun projet sont supprimés. */
      async deleteMany({ where }: { where: Row }) {
        const { projects: relation, ...rest } = where as Row & { projects?: { none?: Row } };
        if (relation !== undefined && !(relation.none && Object.keys(relation.none).length === 0)) {
          throw new Error("Doublure : filtre de relation non pris en charge.");
        }
        let count = 0;
        for (let index = collaborators.length - 1; index >= 0; index -= 1) {
          const collaborator = collaborators[index];
          if (!matches(collaborator, rest)) continue;
          if (relation && projectCollaborators.some((link) => link.collaboratorId === collaborator.id)) continue;
          collaborators.splice(index, 1);
          removeWhere(projectCollaborators, { collaboratorId: collaborator.id });
          count += 1;
        }
        return { count };
      },
    },
    technology: {
      async count({ where }: { where?: Row } = {}) {
        return technologies.filter((candidate) => matches(candidate, where)).length;
      },
      async findMany({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        return sortRows(
          technologies.filter((candidate) => matches(candidate, where)),
          orderBy,
        ).map(technologyWithRelations);
      },
      async findUnique({ where }: { where: Row }) {
        const technology = technologies.find((candidate) => matches(candidate, where));
        return technology ? technologyWithRelations(technology) : null;
      },
      async findFirst({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        const [first] = sortRows(
          technologies.filter((candidate) => matches(candidate, where)),
          orderBy,
        );
        return first ? technologyWithRelations(first) : null;
      },
      async create({ data }: { data: Omit<FakeTechnology, "id"> }) {
        assertUniqueTechnology(data.normalizedName);
        const row: FakeTechnology = { ...data, id: fakeId() };
        technologies.push(row);
        return technologyWithRelations(row);
      },
      async update({ where, data }: { where: Row; data: Partial<Omit<FakeTechnology, "id">> }) {
        const technology = technologies.find((candidate) => matches(candidate, where));
        if (!technology) throw prismaError("P2025", "technologie introuvable");
        if (data.normalizedName) assertUniqueTechnology(data.normalizedName, technology);
        Object.assign(technology, data);
        return technologyWithRelations(technology);
      },
      async delete({ where }: { where: Row }) {
        const technology = technologies.find((candidate) => matches(candidate, where));
        if (!technology) throw prismaError("P2025", "technologie introuvable");
        const result = technologyWithRelations(technology);
        technologies.splice(technologies.indexOf(technology), 1);
        // Clé étrangère en cascade : les liens partent avec la technologie.
        removeWhere(projectTechnologies, { technologyId: technology.id });
        return result;
      },
    },
    education: {
      async findMany({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        return sortRows(
          educations.filter((candidate) => matches(candidate, where)),
          orderBy,
        ).map(educationWithRelations);
      },
      async findUnique({ where }: { where: Row }) {
        const education = educations.find((candidate) => matches(candidate, where));
        return education ? educationWithRelations(education) : null;
      },
      async findFirst({ where, orderBy }: { where?: Row; orderBy?: OrderBy } = {}) {
        const [first] = sortRows(
          educations.filter((candidate) => matches(candidate, where)),
          orderBy,
        );
        return first ? educationWithRelations(first) : null;
      },
      async create({ data }: { data: EducationData }) {
        const { skills: relation, ...fields } = data;
        assertSkillsExist(relation?.connect ?? []);
        const row = { ...fields, id: fakeId() } as FakeEducation;
        educations.push(row);
        linkSkills(row.id, relation?.connect ?? []);
        return educationWithRelations(row);
      },
      async update({ where, data }: { where: Row; data: EducationData }) {
        const education = educations.find((candidate) => matches(candidate, where));
        if (!education) throw prismaError("P2025", "formation introuvable");
        const { skills: relation, ...fields } = data;
        if (relation?.set) {
          assertSkillsExist(relation.set);
          removeWhere(educationSkills, { educationId: education.id });
          linkSkills(education.id, relation.set);
        }
        Object.assign(education, fields);
        return educationWithRelations(education);
      },
      async delete({ where }: { where: Row }) {
        const education = educations.find((candidate) => matches(candidate, where));
        if (!education) throw prismaError("P2025", "formation introuvable");
        const result = educationWithRelations(education);
        educations.splice(educations.indexOf(education), 1);
        // Clé étrangère en cascade : les liens partent avec la formation.
        removeWhere(educationSkills, { educationId: education.id });
        return result;
      },
    },
    admin: {
      async findUnique({ where }: { where: Row }) {
        const admin = admins.find((candidate) => matches(candidate, where));
        return admin ? { ...admin } : null;
      },
      async update({ where, data }: { where: Row; data: Partial<FakeAdmin> }) {
        const admin = admins.find((candidate) => matches(candidate, where));
        if (!admin) throw new Error("Doublure : administrateur introuvable (P2025).");
        if (data.email && admins.some((other) => other !== admin && other.email === data.email)) {
          throw new Error("Doublure : adresse déjà utilisée (P2002).");
        }
        Object.assign(admin, data);
        return { ...admin };
      },
    },
    session: {
      async create({ data }: { data: Omit<FakeSession, "id"> }) {
        const row: FakeSession = { ...data, id: fakeId() };
        sessions.push(row);
        return withAdmin(row);
      },
      async findUnique({ where }: { where: Row }) {
        calls.sessionFindUnique += 1;
        const session = sessions.find((candidate) => matches(candidate, where));
        return session ? withAdmin(session) : null;
      },
      async findMany({ where, orderBy }: { where: Row; orderBy?: OrderBy }) {
        return sortRows(
          sessions.filter((candidate) => matches(candidate, where)),
          orderBy,
        ).map((row) => ({ ...row }));
      },
      async updateMany({ where, data }: { where: Row; data: Partial<FakeSession> }) {
        const targets = sessions.filter((candidate) => matches(candidate, where));
        for (const target of targets) Object.assign(target, data);
        return { count: targets.length };
      },
      async deleteMany({ where }: { where: Row }) {
        return { count: removeWhere(sessions, where) };
      },
    },
    authToken: {
      async create({ data }: { data: Omit<FakeAuthToken, "id" | "usedAt"> & { usedAt?: Date | null } }) {
        if (authTokens.some((other) => other.tokenHash === data.tokenHash)) {
          throw new Error("Doublure : hash de jeton en double (P2002).");
        }
        const row: FakeAuthToken = { usedAt: null, ...data, id: fakeId() };
        authTokens.push(row);
        return { ...row };
      },
      async findUnique({ where }: { where: Row }) {
        calls.authTokenFindUnique += 1;
        const token = authTokens.find((candidate) => matches(candidate, where));
        return token ? { ...token } : null;
      },
      async findFirst({ where, orderBy }: { where: Row; orderBy?: OrderBy }) {
        const [first] = sortRows(
          authTokens.filter((candidate) => matches(candidate, where)),
          orderBy,
        );
        return first ? { ...first } : null;
      },
      async updateMany({ where, data }: { where: Row; data: Partial<FakeAuthToken> }) {
        const targets = authTokens.filter((candidate) => matches(candidate, where));
        for (const target of targets) Object.assign(target, data);
        return { count: targets.length };
      },
      async deleteMany({ where }: { where: Row }) {
        return { count: removeWhere(authTokens, where) };
      },
    },
    loginAttempt: {
      async create({ data }: { data: Omit<FakeLoginAttempt, "id"> }) {
        const row: FakeLoginAttempt = { ...data, id: fakeId() };
        loginAttempts.push(row);
        return { ...row };
      },
      async findMany({ where }: { where: Row }) {
        return loginAttempts
          .filter((candidate) => matches(candidate, where))
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
          .map((row) => ({ ...row }));
      },
      async deleteMany({ where }: { where: Row }) {
        return { count: removeWhere(loginAttempts, where) };
      },
    },
    profile: {
      async findUnique({ where }: { where: Row }) {
        const profile = profiles.find((candidate) => matches(candidate, where));
        return profile ? { ...profile } : null;
      },
      /** Comme Prisma : crée la ligne si l'identifiant est absent, la met à jour sinon (clé primaire unique). */
      async upsert({ where, create, update }: { where: Row; create: Partial<FakeProfile>; update: Partial<FakeProfile> }) {
        calls.profileUpsert.push({ where, create });
        const existing = profiles.find((candidate) => matches(candidate, where));
        if (existing) {
          Object.assign(existing, update);
          return { ...existing };
        }
        if (profiles.some((other) => other.id === create.id)) throw prismaError("P2002", "profil en double");
        const row: FakeProfile = { ...EMPTY_FAKE_PROFILE, ...create, id: create.id as number };
        profiles.push(row);
        return { ...row };
      },
    },
    async $executeRaw(strings: TemplateStringsArray) {
      calls.executeRaw.push(strings.join("?"));
      return 0;
    },
    async $transaction<T>(callback: (tx: unknown) => Promise<T>) {
      return callback(client);
    },
  };

  return {
    client,
    admins,
    sessions,
    loginAttempts,
    authTokens,
    skills,
    educations,
    educationSkills,
    technologies,
    profiles,
    projects,
    projectTechnologies,
    projectLinks,
    collaborators,
    projectCollaborators,
    calls,
  };
}

export const fakeDb = createFakeDb();

// ---------------------------------------------------------------------------
// Environnement et requête
// ---------------------------------------------------------------------------

export const TEST_SESSION_SECRET = "secret-de-session-factice-pour-les-tests-0123456789";

export const testEnv = {
  APP_ENV: "development" as "development" | "production",
  SESSION_SECRET: TEST_SESSION_SECRET,
};

export type CookieOptions = Record<string, unknown>;

export const fakeRequest = {
  cookies: new Map<string, string>(),
  /** Appels à `cookies().set(nom, valeur, options)`, dans l'ordre. */
  setCookies: [] as { name: string; value: string; options: CookieOptions }[],
  headers: new Headers(),
};

/** Remplace `cookies()` de `next/headers`. */
export async function fakeCookies() {
  return {
    get(name: string) {
      const value = fakeRequest.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name: string, value: string, options: CookieOptions = {}) {
      fakeRequest.setCookies.push({ name, value, options });
      fakeRequest.cookies.set(name, value);
    },
  };
}

/** Remplace `headers()` de `next/headers`. */
export async function fakeHeaders() {
  return fakeRequest.headers;
}

/** Remplace l'exception levée par `redirect()` de `next/navigation`. */
export class RedirectError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`Redirection vers ${url}`);
    this.name = "RedirectError";
    this.url = url;
  }
}

export function fakeRedirect(url: string): never {
  throw new RedirectError(url);
}

// ---------------------------------------------------------------------------
// E-mails, `after()` et `revalidatePath()` (étape 8)
// ---------------------------------------------------------------------------

export type SentMail =
  | { type: "email-verification"; to: string; token: string }
  | { type: "password-reset"; to: string; token: string }
  | { type: "email-change-notice"; to: string; newEmail: string };

/** Boîte d'envoi de `fakeMail` ; `failNext` fait échouer le prochain envoi. */
export const mailbox = { sent: [] as SentMail[], failNext: false };

async function deliver(mail: SentMail): Promise<void> {
  if (mailbox.failNext) {
    mailbox.failNext = false;
    throw new Error("Doublure : échec de l'envoi.");
  }
  mailbox.sent.push(mail);
}

/** Remplace `@/lib/mail/send` (aucun envoi, aucune console). */
export const fakeMail = {
  sendEmailVerification: ({ to, token }: { to: string; token: string }) =>
    deliver({ type: "email-verification", to, token }),
  sendPasswordReset: ({ to, token }: { to: string; token: string }) =>
    deliver({ type: "password-reset", to, token }),
  sendEmailChangeNotice: ({ to, newEmail }: { to: string; newEmail: string }) =>
    deliver({ type: "email-change-notice", to, newEmail }),
};

const afterCallbacks: (() => unknown)[] = [];

/** Remplace `after()` de `next/server` : le travail est mis de côté. */
export function fakeAfter(callback: () => unknown): void {
  afterCallbacks.push(callback);
}

/** Exécute le travail prévu « après la réponse ». */
export async function runAfterCallbacks(): Promise<number> {
  let count = 0;
  while (afterCallbacks.length > 0) {
    await afterCallbacks.shift()!();
    count += 1;
  }
  return count;
}

export function pendingAfterCallbacks(): number {
  return afterCallbacks.length;
}

export const revalidatedPaths: string[] = [];

/** Remplace `revalidatePath()` de `next/cache`. */
export function fakeRevalidatePath(path: string, type?: string): void {
  revalidatedPaths.push(type ? `${path} (${type})` : path);
}

// ---------------------------------------------------------------------------
// Supabase Storage en mémoire
// ---------------------------------------------------------------------------

/**
 * Faux Storage : `files` associe « bucket/chemin » au contenu. À brancher avec
 * `vi.mock("@/lib/storage/client")` (`getStorageContext` → `fakeStorage.context`) ;
 * `lib/storage/upload.ts` et `remove.ts` tournent alors pour de vrai (type
 * réel, taille, SVG, garde-fou `dev-`), seul le réseau est remplacé.
 */
export const fakeStorage = {
  files: new Map<string, Uint8Array>(),
  /** Refus simulés de Supabase (message d'erreur renvoyé). */
  failUpload: null as string | null,
  failRemove: null as string | null,
  errors: [] as string[],
  context: {
    config: {
      appEnv: "development",
      supabaseUrl: "https://projet.supabase.co",
      serviceRoleKey: "cle-factice",
      buckets: { articles: "dev-articles", projects: "dev-projets", profile: "dev-profil", stack: "dev-stack" },
    },
    api: {
      from(bucket: string) {
        return {
          async upload(path: string, body: Uint8Array) {
            if (fakeStorage.failUpload) return { error: { message: fakeStorage.failUpload } };
            fakeStorage.files.set(`${bucket}/${path}`, body);
            return { error: null };
          },
          async remove(paths: string[]) {
            if (fakeStorage.failRemove) return { error: { message: fakeStorage.failRemove } };
            for (const path of paths) fakeStorage.files.delete(`${bucket}/${path}`);
            return { error: null };
          },
        };
      },
      async listBuckets() {
        return { data: [], error: null };
      },
      async createBucket() {
        return { error: null };
      },
    },
    logger: { error: (message: string) => void fakeStorage.errors.push(message) },
  },
};

// ---------------------------------------------------------------------------
// API GitHub (étape 13)
// ---------------------------------------------------------------------------

export type FakeGitHubFailure = "not-found" | "rate-limited" | "timeout" | "server-error";

/**
 * Faux `fetch` de l'API GitHub, à passer à `fetchGitHubUser` (`lib/github.ts`) :
 * `users` donne le nom affiché des comptes existants (avatar et profil
 * construits sur les hôtes de GitHub) ; `failures` force un échec par nom ;
 * `requests` : noms demandés, dans l'ordre. Aucun appel réseau.
 */
export const fakeGitHub = {
  users: new Map<string, { name: string | null }>(),
  failures: new Map<string, FakeGitHubFailure>(),
  requests: [] as string[],
  async fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== "https://api.github.com" || !url.pathname.startsWith("/users/")) {
      throw new Error(`Doublure GitHub : adresse inattendue ${url.href}`);
    }
    const username = decodeURIComponent(url.pathname.slice("/users/".length));
    fakeGitHub.requests.push(username);
    const failure = fakeGitHub.failures.get(username);
    if (failure === "timeout") {
      // Délai dépassé : la requête n'aboutit pas, elle est interrompue par le signal de `fetchGitHubUser`.
      return new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Interrompu", "AbortError")));
      });
    }
    if (failure === "rate-limited") {
      return new Response(JSON.stringify({ message: "API rate limit exceeded" }), {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      });
    }
    if (failure === "server-error") return new Response("", { status: 502 });
    const user = fakeGitHub.users.get(username);
    if (failure === "not-found" || !user) return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
    return new Response(
      JSON.stringify({
        login: username,
        id: 1,
        name: user.name,
        avatar_url: `https://avatars.githubusercontent.com/u/1?v=4&s=${username.length}`,
        html_url: `https://github.com/${username}`,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  },
};

export function resetFakes() {
  fakeStorage.files.clear();
  fakeStorage.failUpload = null;
  fakeStorage.failRemove = null;
  fakeStorage.errors.length = 0;
  fakeDb.admins.length = 0;
  fakeDb.sessions.length = 0;
  fakeDb.loginAttempts.length = 0;
  fakeDb.authTokens.length = 0;
  fakeDb.skills.length = 0;
  fakeDb.educations.length = 0;
  fakeDb.educationSkills.length = 0;
  fakeDb.technologies.length = 0;
  fakeDb.projects.length = 0;
  fakeDb.projectTechnologies.length = 0;
  fakeDb.projectLinks.length = 0;
  fakeDb.collaborators.length = 0;
  fakeDb.projectCollaborators.length = 0;
  fakeDb.calls.collaboratorWrites.length = 0;
  fakeGitHub.users.clear();
  fakeGitHub.failures.clear();
  fakeGitHub.requests.length = 0;
  fakeDb.profiles.length = 0;
  fakeDb.calls.profileUpsert.length = 0;
  fakeDb.calls.executeRaw.length = 0;
  fakeDb.calls.sessionFindUnique = 0;
  fakeDb.calls.authTokenFindUnique = 0;
  testEnv.APP_ENV = "development";
  testEnv.SESSION_SECRET = TEST_SESSION_SECRET;
  fakeRequest.cookies.clear();
  fakeRequest.setCookies.length = 0;
  fakeRequest.headers = new Headers();
  mailbox.sent.length = 0;
  mailbox.failNext = false;
  afterCallbacks.length = 0;
  revalidatedPaths.length = 0;
}
