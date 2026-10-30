"use client";

import { useState, type FormEvent } from "react";

const STATUS_ID = "contact-form-status";

export default function ContactForm({ email }: { email: string }) {
    const [status, setStatus] = useState<"idle" | "opening">("idle");

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const form = event.currentTarget;
        const data = new FormData(form);

        if (String(data.get("entreprise") || "").trim()) {
            return;
        }

        if (!form.reportValidity()) return;

        const name = String(data.get("nom") || "");
        const sender = String(data.get("email") || "");
        const subject = String(data.get("sujet") || "");
        const message = String(data.get("message") || "");

        const body = [
            `Nom : ${name}`,
            `Email : ${sender}`,
            "",
            message,
        ].join("\n");

        setStatus("opening");

        window.location.href = `mailto:${email}?subject=${encodeURIComponent(
            subject || "Contact depuis le portfolio",
        )}&body=${encodeURIComponent(body)}`;

        window.setTimeout(() => setStatus("idle"), 4000);
    };

    return (
        <form onSubmit={handleSubmit} className="mt-8">
            <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                    <span className="text-xs font-bold">Nom complet*</span>
                    <input
                        required
                        name="nom"
                        type="text"
                        autoComplete="name"
                        placeholder="Votre nom"
                        className="field mt-1"
                    />
                </label>
                <label className="block">
                    <span className="text-xs font-bold">Email*</span>
                    <input
                        required
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="votre@email.com"
                        className="field mt-1"
                    />
                </label>
            </div>

            <label className="mt-6 block">
                <span className="text-xs font-bold">Sujet*</span>
                <input
                    required
                    name="sujet"
                    type="text"
                    autoComplete="off"
                    placeholder="L'objet de votre message"
                    className="field mt-1"
                />
            </label>

            <label className="mt-6 block">
                <span className="text-xs font-bold">Message*</span>
                <textarea
                    required
                    name="message"
                    rows={4}
                    minLength={10}
                    placeholder="Parlez-moi de votre projet..."
                    className="field mt-1 resize-none"
                    aria-describedby={STATUS_ID}
                />
            </label>

            <div className="absolute -left-2499.75" aria-hidden="true">
                <label>
                    Entreprise
                    <input
                        type="text"
                        name="entreprise"
                        tabIndex={-1}
                        autoComplete="off"
                    />
                </label>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                    type="submit"
                    className="pill pill-dark"
                    aria-describedby={STATUS_ID}
                >
                    Envoyer le message
                </button>
                <p
                    id={STATUS_ID}
                    role="status"
                    aria-live="polite"
                    className="text-xs text-(--muted)"
                >
                    {status === "opening"
                        ? "Ouverture de votre messagerie… Si rien ne se passe, écrivez directement à l’adresse ci-dessous."
                        : "Ce formulaire ouvre votre application de messagerie, rien n’est envoyé automatiquement."}
                </p>
            </div>
        </form>
    );
}
