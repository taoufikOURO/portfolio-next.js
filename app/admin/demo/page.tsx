// PAGE DE DÉMONSTRATION TEMPORAIRE (étape 5) : à supprimer avec `app/admin/demo/`.
// Données factices : aucun appel à la base ni à Supabase.
// Les sections statiques ci-dessous sont rendues côté serveur, pour vérifier
// que Button, Alert, StatusBadge, Field, DataTable et EmptyState s'utilisent
// depuis un composant serveur.
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Alert } from "@/components/admin/Alert";
import { Button, ButtonLink } from "@/components/admin/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { Field } from "@/components/admin/Field";
import { StatusBadge, type Status } from "@/components/admin/StatusBadge";
import { DemoInteractive } from "./demo-interactive";

export const metadata: Metadata = {
    title: "Démonstration des composants",
};

type Row = {
    id: string;
    title: string;
    institution: string;
    period: string;
    status: Status;
};

const ROWS: Row[] = [
    {
        id: "1",
        title: "Master Informatique",
        institution: "Université de démonstration",
        period: "2023 – 2025",
        status: "published",
    },
    {
        id: "2",
        title: "Licence Mathématiques et Informatique",
        institution: "Établissement fictif",
        period: "2020 – 2023",
        status: "pending",
    },
    {
        id: "3",
        title: "Certification accessibilité web",
        institution: "Organisme d’exemple",
        period: "2025",
        status: "draft",
    },
];

const COLUMNS: DataTableColumn<Row>[] = [
    { key: "title", header: "Intitulé", isRowHeader: true, cell: (row) => row.title },
    { key: "institution", header: "Établissement", hideBelow: "md", cell: (row) => row.institution },
    { key: "period", header: "Période", hideBelow: "sm", cell: (row) => row.period },
    { key: "status", header: "Statut", cell: (row) => <StatusBadge status={row.status} /> },
];

export default function DemoPage() {
    return (
        <div className="flex flex-col gap-12">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Démonstration des composants</h1>
                <Alert tone="warning">
                    Page temporaire de l’étape 5, retirée à l’étape 15. Les données sont
                    factices.
                </Alert>
            </header>

            <section aria-labelledby="demo-buttons" className="flex flex-col gap-4">
                <h2 id="demo-buttons" className="text-2xl font-bold">
                    Boutons
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Button>Principal</Button>
                    <Button variant="secondary">Secondaire</Button>
                    <Button variant="destructive">Destructif</Button>
                    <Button disabled>Désactivé</Button>
                    <ButtonLink href="/admin/demo" icon={Plus}>
                        Lien en bouton
                    </ButtonLink>
                </div>
            </section>

            <section aria-labelledby="demo-badges" className="flex flex-col gap-4">
                <h2 id="demo-badges" className="text-2xl font-bold">
                    Statuts
                </h2>
                <div className="flex flex-wrap gap-3">
                    <StatusBadge status="draft" />
                    <StatusBadge status="pending" />
                    <StatusBadge status="published" />
                </div>
            </section>

            <section aria-labelledby="demo-alerts" className="flex max-w-2xl flex-col gap-4">
                <h2 id="demo-alerts" className="text-2xl font-bold">
                    Messages
                </h2>
                <Alert tone="success">La formation a été enregistrée.</Alert>
                <Alert tone="error">Le mot de passe actuel est incorrect.</Alert>
                <Alert tone="warning">Votre adresse e-mail n’est pas encore validée.</Alert>
                <Alert tone="info">Les modifications sont enregistrées dans un brouillon.</Alert>
            </section>

            <section aria-labelledby="demo-fields" className="flex max-w-2xl flex-col gap-4">
                <h2 id="demo-fields" className="text-2xl font-bold">
                    Champs (rendus côté serveur)
                </h2>
                <Field label="Établissement" name="institution" defaultValue="Université de démonstration" />
                <Field
                    label="Adresse du site"
                    name="url"
                    type="url"
                    defaultValue="adresse invalide"
                    hint="Exemple : https://exemple.fr"
                    error="L’adresse doit commencer par https://."
                />
                <Field label="Champ désactivé" name="locked" defaultValue="Non modifiable" disabled />
            </section>

            <section aria-labelledby="demo-table" className="flex flex-col gap-4">
                <h2 id="demo-table" className="text-2xl font-bold">
                    Tableau et état vide
                </h2>
                <DataTable
                    caption="Formations (données factices)"
                    columns={COLUMNS}
                    rows={ROWS}
                    getRowKey={(row) => row.id}
                />
                <DataTable
                    caption="Liste vide"
                    captionHidden
                    columns={COLUMNS}
                    rows={[]}
                    getRowKey={(row: Row) => row.id}
                    empty={
                        <EmptyState
                            title="Aucune formation"
                            description="Ajoutez votre première formation pour la voir apparaître ici."
                            headingLevel={3}
                        >
                            <ButtonLink href="/admin/demo" icon={Plus}>
                                Ajouter une formation
                            </ButtonLink>
                        </EmptyState>
                    }
                />
            </section>

            <DemoInteractive />
        </div>
    );
}
