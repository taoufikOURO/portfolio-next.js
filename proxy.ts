import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_LOGIN_PATH, isPublicAdminPath } from "@/lib/auth/routes";
import { readSignedSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

/**
 * Contrôle rapide des routes `/admin` (Next.js 16 : `proxy.ts`, ancien
 * `middleware.ts`, toujours exécuté sur le runtime Node.js).
 *
 * Redirige vers la connexion si le cookie de session est absent ou mal signé.
 * Il ne consulte PAS la base : une session expirée ou révoquée passe ce
 * contrôle. La vérification réelle est faite par `requireSession()` dans
 * chaque layout, page et action serveur ; ce fichier ne la remplace jamais.
 */
export function proxy(request: NextRequest) {
    if (isPublicAdminPath(request.nextUrl.pathname)) return NextResponse.next();

    // Rogné comme dans `lib/env` (sinon les signatures ne concorderaient pas).
    // `SESSION_SECRET` absent : tout est refusé (lib/env empêche de toute façon le démarrage).
    const token = readSignedSessionToken(
        request.cookies.get(SESSION_COOKIE_NAME)?.value,
        process.env.SESSION_SECRET?.trim(),
    );
    if (token) return NextResponse.next();

    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
}

export const config = {
    matcher: ["/admin", "/admin/:path*"],
};
