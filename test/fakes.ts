// Doublures pour les tests Vitest de l'authentification (étape 7).
//
// - `fakeDb` : base en mémoire qui imite le sous-ensemble du client Prisma
//   utilisé par `lib/auth/` (sessions, administrateurs, tentatives) ;
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

function comparable(value: unknown): number | string {
  if (value instanceof Date) return value.getTime();
  return value as number | string;
}

function matchesOperator(operator: string, value: unknown, operand: unknown): boolean {
  const a = comparable(value);
  const b = comparable(operand);
  switch (operator) {
    case "lt":
      return a < b;
    case "lte":
      return a <= b;
    case "gt":
      return a > b;
    case "gte":
      return a >= b;
    case "not":
      return a !== b;
    default:
      throw new Error(`Opérateur non pris en charge par la doublure : ${operator}`);
  }
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "OR") return (condition as Row[]).some((clause) => matches(row, clause));
    const value = row[key];
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

function createFakeDb() {
  const admins: FakeAdmin[] = [];
  const sessions: FakeSession[] = [];
  const loginAttempts: FakeLoginAttempt[] = [];

  const withAdmin = (session: FakeSession) => {
    const admin = admins.find((candidate) => candidate.id === session.adminId);
    if (!admin) throw new Error("Doublure : session sans administrateur.");
    return { ...session, admin: { email: admin.email, emailVerifiedAt: admin.emailVerifiedAt } };
  };

  const calls = { executeRaw: [] as string[], sessionFindUnique: 0 };

  const client = {
    admin: {
      async findUnique({ where }: { where: Row }) {
        const admin = admins.find((candidate) => matches(candidate, where));
        return admin ? { ...admin } : null;
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
      async updateMany({ where, data }: { where: Row; data: Partial<FakeSession> }) {
        const targets = sessions.filter((candidate) => matches(candidate, where));
        for (const target of targets) Object.assign(target, data);
        return { count: targets.length };
      },
      async deleteMany({ where }: { where: Row }) {
        return { count: removeWhere(sessions, where) };
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

  return { client, admins, sessions, loginAttempts, calls };
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

export function resetFakes() {
  fakeDb.admins.length = 0;
  fakeDb.sessions.length = 0;
  fakeDb.loginAttempts.length = 0;
  fakeDb.calls.executeRaw.length = 0;
  fakeDb.calls.sessionFindUnique = 0;
  testEnv.APP_ENV = "development";
  testEnv.SESSION_SECRET = TEST_SESSION_SECRET;
  fakeRequest.cookies.clear();
  fakeRequest.setCookies.length = 0;
  fakeRequest.headers = new Headers();
}
