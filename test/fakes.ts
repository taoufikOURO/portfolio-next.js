// Doublures pour les tests Vitest de l'authentification (étapes 7 et 8).
//
// - `fakeDb` : base en mémoire qui imite le sous-ensemble du client Prisma
//   utilisé par `lib/auth/` (administrateurs, sessions, tentatives, jetons des
//   liens) ;
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

function createFakeDb() {
  const admins: FakeAdmin[] = [];
  const sessions: FakeSession[] = [];
  const loginAttempts: FakeLoginAttempt[] = [];
  const authTokens: FakeAuthToken[] = [];

  const withAdmin = (session: FakeSession) => {
    const admin = admins.find((candidate) => candidate.id === session.adminId);
    if (!admin) throw new Error("Doublure : session sans administrateur.");
    return { ...session, admin: { email: admin.email, emailVerifiedAt: admin.emailVerifiedAt } };
  };

  const calls = { executeRaw: [] as string[], sessionFindUnique: 0, authTokenFindUnique: 0 };

  const client = {
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
    async $executeRaw(strings: TemplateStringsArray) {
      calls.executeRaw.push(strings.join("?"));
      return 0;
    },
    async $transaction<T>(callback: (tx: unknown) => Promise<T>) {
      return callback(client);
    },
  };

  return { client, admins, sessions, loginAttempts, authTokens, calls };
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

export function resetFakes() {
  fakeDb.admins.length = 0;
  fakeDb.sessions.length = 0;
  fakeDb.loginAttempts.length = 0;
  fakeDb.authTokens.length = 0;
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
