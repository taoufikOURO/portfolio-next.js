"use client";

// PAGE DE DÉMONSTRATION TEMPORAIRE (étape 5) : à supprimer avec `app/admin/demo/`.
// Données factices : aucun appel à la base ni à Supabase.
import { useState, useTransition, type FormEvent } from "react";
import { Save, Trash } from "lucide-react";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Field } from "@/components/admin/Field";
import { FileField } from "@/components/admin/FileField";
import { MultiSelect } from "@/components/admin/MultiSelect";
import { Select } from "@/components/admin/Select";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { TextArea } from "@/components/admin/TextArea";
import { useToast } from "@/components/admin/Toast";

const SKILLS = [
    "TypeScript",
    "React",
    "Next.js",
    "Tailwind CSS",
    "PostgreSQL",
    "Prisma",
    "Node.js",
    "Accessibilité",
    "Tests automatisés",
    "Conception d’API",
].map((name) => ({ value: name.toLowerCase().replace(/\W+/g, "-"), label: name }));

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function DemoInteractive() {
    const toast = useToast();
    const [isPending, startTransition] = useTransition();
    const [errors, setErrors] = useState<{ title?: string; category?: string }>({});
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const nextErrors: typeof errors = {};
        if (!String(data.get("title") ?? "").trim()) {
            nextErrors.title = "Le titre est obligatoire.";
        }
        if (!data.get("category")) {
            nextErrors.category = "Choisissez une catégorie.";
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            toast.error("Le formulaire contient des erreurs.");
            return;
        }
        startTransition(async () => {
            await wait(1200);
            toast.success(
                `Enregistré : ${data.getAll("skills").length} compétence(s) sélectionnée(s).`,
            );
        });
    }

    return (
        <>
            <section aria-labelledby="demo-form" className="flex flex-col gap-6">
                <h2 id="demo-form" className="text-2xl font-bold">
                    Formulaire
                </h2>
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="flex max-w-2xl flex-col gap-6"
                >
                    <p className="text-sm">
                        <span aria-hidden="true">* </span>Les champs marqués d’un astérisque
                        sont obligatoires.
                    </p>
                    <Field
                        label="Titre"
                        name="title"
                        required
                        hint="Laissez vide puis enregistrez pour voir l’erreur."
                        error={errors.title}
                        autoComplete="off"
                    />
                    <Select
                        label="Catégorie"
                        name="category"
                        required
                        placeholder="Choisir une catégorie"
                        error={errors.category}
                        options={[
                            { value: "web", label: "Développement web" },
                            { value: "data", label: "Données" },
                            { value: "ux", label: "Conception et accessibilité" },
                        ]}
                    />
                    <TextArea
                        label="Description"
                        name="description"
                        hint="Texte libre, sur plusieurs lignes."
                    />
                    <MultiSelect
                        label="Compétences"
                        name="skills"
                        options={SKILLS}
                        defaultValue={["react"]}
                        hint="Filtrez la liste, cochez au clavier avec la barre d’espace."
                    />
                    <FileField
                        label="Image de couverture"
                        name="cover"
                        accept="image/png,image/jpeg,image/webp"
                        maxSizeMB={5}
                        preview
                        hint="PNG, JPG ou WebP, 5 Mo au maximum."
                    />
                    <div className="flex flex-wrap gap-3">
                        <SubmitButton icon={Save} pending={isPending}>
                            Enregistrer
                        </SubmitButton>
                        <Button type="reset" variant="secondary">
                            Réinitialiser
                        </Button>
                    </div>
                </form>
            </section>

            <section aria-labelledby="demo-feedback" className="flex flex-col gap-4">
                <h2 id="demo-feedback" className="text-2xl font-bold">
                    Notifications
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={() => toast.success("Formation enregistrée.")}>
                        Succès
                    </Button>
                    <Button variant="secondary" onClick={() => toast.error("L’enregistrement a échoué.")}>
                        Erreur
                    </Button>
                    <Button variant="secondary" onClick={() => toast.warning("Adresse e-mail non validée.")}>
                        Avertissement
                    </Button>
                    <Button variant="secondary" onClick={() => toast.info("Brouillon enregistré.")}>
                        Information
                    </Button>
                </div>
            </section>

            <section aria-labelledby="demo-dialogs" className="flex flex-col gap-4">
                <h2 id="demo-dialogs" className="text-2xl font-bold">
                    Dialogues de confirmation
                </h2>
                <div className="flex flex-wrap gap-3">
                    <Button variant="destructive" icon={Trash} onClick={() => setDeleteOpen(true)}>
                        Supprimer…
                    </Button>
                    <Button onClick={() => setPublishOpen(true)}>Publier…</Button>
                </div>
            </section>

            <ConfirmDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={async () => {
                    await wait(800);
                    setDeleteOpen(false);
                    toast.success("Élément supprimé (démonstration).");
                }}
                tone="destructive"
                title="Supprimer cet élément ?"
                description={<p>Cette action est définitive. Les images associées seront aussi supprimées.</p>}
                confirmLabel="Supprimer"
                pendingLabel="Suppression…"
            />
            <ConfirmDialog
                open={publishOpen}
                onClose={() => setPublishOpen(false)}
                onConfirm={async () => {
                    await wait(800);
                    setPublishOpen(false);
                    toast.success("Article publié (démonstration).");
                }}
                title="Publier cet article ?"
                description={<p>La version en ligne sera remplacée par votre brouillon.</p>}
                confirmLabel="Publier"
                pendingLabel="Publication…"
            />
        </>
    );
}
