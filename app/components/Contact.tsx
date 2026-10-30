import { getProfile } from "@/app/lib/data";
import { Mail, MapPin } from "lucide-react";
import Image from "next/image";
import ContactForm from "./ContactForm";
import Reveal from "./Reveal";

export default function Contact() {
    const profile = getProfile();

    return (
        <section id="contact" className="section overflow-hidden">
            <div className="shell relative">
                <span className="ghost-text absolute inset-x-0 top-0 text-center text-[clamp(4.2rem,17vw,16rem)]">
                    Contact
                </span>

                <Reveal className="relative z-10 pt-28 md:pt-56">
                    <div className="grid overflow-hidden rounded-4xl bg-(--surface) lg:grid-cols-[0.85fr_1.15fr]">
                        <div className="relative min-h-80 overflow-hidden bg-(--surface-2) lg:min-h-full">
                            <Image
                                src={profile.photo}
                                alt={`${profile.prenom} ${profile.nom}`}
                                fill
                                sizes="(min-width: 1024px) 40vw, 100vw"
                                className="object-cover object-top"
                            />
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-5 text-white">
                                <span className="text-xs font-bold uppercase tracking-[0.08em]">
                                    {profile.prenom} {profile.nom}
                                </span>
                                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em]">
                                    Portfolio 2026
                                </span>
                            </div>
                        </div>

                        <div className="p-6 md:p-10 lg:p-12">
                            <h2 className="heading text-[clamp(2.2rem,4.5vw,3.8rem)]">
                                Discutons
                            </h2>
                            <p className="mt-3 max-w-md text-sm leading-relaxed text-(--muted) md:text-base">
                                Un projet, une idée ou une collaboration à
                                proposer ? Écrivez-moi, je réponds généralement
                                sous 24 à 48 heures.
                            </p>

                            <ContactForm email={profile.email} />

                            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-(--line) pt-5 text-xs text-(--muted)">
                                <a
                                    href={`mailto:${profile.email}`}
                                    className="inline-flex items-center gap-1.5 transition-colors hover:text-(--accent)"
                                >
                                    <Mail className="h-3.5 w-3.5" aria-hidden />
                                    {profile.email}
                                </a>
                                <span className="inline-flex items-center gap-1.5">
                                    <MapPin
                                        className="h-3.5 w-3.5"
                                        aria-hidden
                                    />
                                    Lomé, Togo
                                </span>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
