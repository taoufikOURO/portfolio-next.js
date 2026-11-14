import { cn } from "@/lib/cn";

/**
 * Squelettes de chargement (étape 18, E60), aux formes du contenu final :
 * titre de page, cartes, tableau ou formulaire. Annoncés une seule fois
 * (« Chargement… »). Balayage lumineux lent de 1,6 s (E61), statique sous
 * « réduire les animations ».
 */
function Block({ className }: { className?: string }) {
    return <div aria-hidden="true" className={cn("admin-skeleton", className)} />;
}

function Loading({ children }: { children: React.ReactNode }) {
    return (
        <div role="status" aria-busy="true" className="flex flex-col gap-8">
            <span className="sr-only">Chargement…</span>
            {children}
        </div>
    );
}

function Header({ action = true }: { action?: boolean }) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex w-full max-w-xl flex-col gap-3">
                <Block className="h-10 w-2/3 rounded-full" />
                <Block className="h-4 w-full rounded-full" />
            </div>
            {action ? <Block className="h-11 w-44 rounded-full" /> : null}
        </div>
    );
}

/** Liste : en-tête de page puis tableau (bande d'en-tête et lignes de 64 px). */
export function ListSkeleton() {
    return (
        <Loading>
            <Header />
            <div aria-hidden="true" className="flex flex-col">
                <Block className="h-11 rounded-2xl" />
                {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="flex h-16 items-center gap-4 border-b border-line px-4 last:border-b-0">
                        <Block className="h-4 flex-1 rounded-full" />
                        <Block className="hidden h-7 w-28 rounded-full md:block" />
                        <Block className="h-11 w-28 rounded-full" />
                    </div>
                ))}
            </div>
        </Loading>
    );
}

/** Formulaire : en-tête de page puis carte de champs. */
export function FormSkeleton() {
    return (
        <Loading>
            <Header action={false} />
            <div aria-hidden="true" className="admin-card flex max-w-3xl flex-col gap-6">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="flex flex-col gap-2">
                        <Block className="h-4 w-32 rounded-full" />
                        <Block className="h-11 rounded-[var(--radius-field)] bg-panel" />
                    </div>
                ))}
                <Block className="h-11 w-40 rounded-full" />
            </div>
        </Loading>
    );
}

/** Tableau de bord : cartes de tête, graphique, anneau, chiffres, tableau. */
export function DashboardSkeleton() {
    return (
        <Loading>
            <Header />
            <div
                aria-hidden="true"
                className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)]"
            >
                <div className="flex flex-col gap-5">
                    <Block className="h-56 rounded-[var(--radius-card)] bg-card" />
                    <Block className="h-56 rounded-[var(--radius-card)] bg-card" />
                </div>
                <Block className="h-[29rem] rounded-[var(--radius-card)] bg-card" />
                <Block className="h-[29rem] rounded-[var(--radius-card)] bg-card lg:col-span-2 xl:col-span-1" />
            </div>
            <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <Block key={index} className="h-48 rounded-[var(--radius-card)] bg-card" />
                ))}
            </div>
            <Block className="h-96 rounded-[var(--radius-card)] bg-card" />
        </Loading>
    );
}
