/**
 * Pages accessibles sans session (connexion, mot de passe oublié,
 * réinitialisation, validation d'adresse). Pas de barre de navigation ni de
 * logo (E61) : un panneau blanc centré sur le fond gris (étape 18, E60), dont
 * le contenu entre en fondu (`admin-page`, admin.css).
 */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main id="contenu" className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="admin-page w-full max-w-md rounded-[var(--radius-panel)] bg-panel p-6 shadow-menu sm:p-10">
        {children}
      </div>
    </main>
  );
}
