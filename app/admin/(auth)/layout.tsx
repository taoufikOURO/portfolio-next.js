/**
 * Pages accessibles sans session (connexion, mot de passe oublié,
 * réinitialisation, validation d'adresse). Pas de barre latérale.
 */
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main id="contenu" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-md border-2 border-slate-blue bg-cream p-6 sm:p-8">
        {children}
      </div>
    </main>
  );
}
