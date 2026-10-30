import { getProfile } from "@/app/lib/data";
import { ArrowUpRight, Briefcase, Code2, FileUser, Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Reveal from "./Reveal";

export default function Hero() {
    const profile = getProfile();
    const linkedin = profile.liens.linkedin.startsWith("http")
        ? profile.liens.linkedin
        : `https://${profile.liens.linkedin}`;

    return (
        <section className="relative overflow-hidden pb-16 pt-6 md:pb-24">
            <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center md:top-24">
                <span className="ghost-text hero-word">DATA&nbsp;SCIENTIST</span>
            </div>

            <div className="shell relative min-h-[calc(100svh-6rem)] mt-20">
                <Reveal className="relative z-10 mx-auto flex justify-center md:absolute md:inset-x-0 md:bottom-0">
                    <div className="relative w-[min(78vw,27rem)] md:w-136">
                        <div className="hero-photo relative aspect-3/4">
                            <Image
                                src={profile.transparentPhoto}
                                alt={`${profile.prenom} ${profile.nom}`}
                                fill
                                priority
                                loading="eager"
                                sizes="(min-width: 768px) 432px, 80vw"
                                className="object-contain object-bottom mix-blend-multiply"
                            />
                        </div>

                        <span className="hero-badge absolute -left-5 top-[34%] z-40 -rotate-10 rounded-full bg-(--ink) px-4 py-2 text-xs font-semibold text-white shadow-lg md:-left-12 md:text-sm">
                            Machine Learning
                        </span>
                        <span className="hero-badge hero-badge-delay absolute -right-3 top-[9%] z-40 rotate-[7deg] rounded-full bg-(--ink) px-4 py-2 text-xs font-semibold text-white shadow-lg md:-right-10 md:text-sm">
                            Data Science
                        </span>
                        <span className="hero-orbit absolute -bottom-2 -left-8 h-20 w-20 rounded-full border border-(--accent) md:-left-16 md:h-28 md:w-28" />
                    </div>
                </Reveal>

                <Reveal
                    delay={0.15}
                    className="relative z-20 mt-6 max-w-sm md:absolute md:bottom-[13%] md:left-6 lg:left-10 md:mt-0"
                >
                    <div className="hero-contact-panel">
                        <div className="mt-5 space-y-2">
                            <a
                                href={`mailto:${profile.email}`}
                                className="hero-contact-link group"
                            >
                                <span className="hero-contact-number">01</span>
                                <span className="hero-contact-icon">
                                    <Mail className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                    {profile.email}
                                </span>
                                <ArrowUpRight
                                    className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                    aria-hidden
                                />
                            </a>
                            <a
                                href={profile.liens.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hero-contact-link group"
                            >
                                <span className="hero-contact-number">02</span>
                                <span className="hero-contact-icon">
                                    <Code2 className="h-4 w-4" aria-hidden />
                                </span>
                                <span className="flex-1">
                                    GitHub / taoufikOURO
                                </span>
                                <ArrowUpRight
                                    className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                    aria-hidden
                                />
                            </a>
                            <a
                                href={linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hero-contact-link group"
                            >
                                <span className="hero-contact-number">03</span>
                                <span className="hero-contact-icon">
                                    <Briefcase
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                </span>
                                <span className="flex-1">LinkedIn</span>
                                <ArrowUpRight
                                    className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                    aria-hidden
                                />
                            </a>
                            <a
                                href={profile.cv}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hero-contact-link group"
                            >
                                <span className="hero-contact-number">04</span>
                                <span className="hero-contact-icon">
                                    <FileUser
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                </span>
                                <span className="flex-1">Mon CV</span>
                                <ArrowUpRight
                                    className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                    aria-hidden
                                />
                            </a>
                        </div>
                    </div>
                </Reveal>

                <Reveal
                    delay={0.3}
                    className="relative z-20 mt-8 ml-auto max-w-xs md:absolute md:right-6 lg:right-10 md:bottom-[13%] md:mt-0"
                >
                    <div className="relative rounded-[1.75rem] bg-(--surface) p-6 md:p-8">
                        <p className="text-base leading-relaxed md:text-lg text-justify">
                            Master IA &amp; Big Data, Data Scientist basé à
                            Lomé, Togo. Je transforme la donnée brute en
                            décisions concrètes.
                        </p>
                        <a
                            href={`mailto:${profile.email}`}
                            className="mt-5 inline-block border-b border-(--ink) pb-0.5 text-sm font-semibold transition-colors hover:border-(--accent) hover:text-(--accent)"
                        >
                            {profile.email}
                        </a>
                        <span className="mt-4 flex items-center gap-1.5 text-xs font-medium text-(--muted)">
                            <MapPin className="h-3.5 w-3.5" aria-hidden />
                            Lomé, Togo · Disponible pour collaborations
                        </span>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
