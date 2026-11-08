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

/** Projet minimal : l'étape 11 ne lit que son titre et sa position (rattachement des technologies). */
export type FakeProject = { id: string; title: string; position: number };

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
    technology: {
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
