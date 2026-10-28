import { getProfile } from "@/app/lib/data";
import { Briefcase, Circle, Code2, FileText, Mail, MapPin } from "lucide-react";
import Image from "next/image";
import Reveal from "./Reveal";

export default function Hero() {
    const profile = getProfile();
    const linkedin = profile.liens.linkedin.startsWith("http")
        ? profile.liens.linkedin
        : `https://${profile.liens.linkedin}`;

    return (
        <section className="section border-t-0">
            <Reveal className="shell">
                <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-3xl">
                        <p className="eyebrow">
                            {profile.prenom} {profile.nom}
                        </p>
                        <h1 className="heading mt-4 text-[clamp(2.6rem,6vw,5rem)] uppercase leading-[0.95]">
                            {profile.titreProfessionnel}
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-(--muted) md:text-xl text-justify">
                            {profile.bio}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-2">
                            <a
                                href={`mailto:${profile.email}`}
                                className="btn btn-primary"
                            >
                                <Mail className="h-4 w-4" aria-hidden />
                                Me contacter
                            </a>
                            <a
                                href={profile.cv}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost"
                            >
                                <FileText className="h-4 w-4" aria-hidden />
                                Télécharger le CV
                            </a>
                        </div>
                    </div>

                    <Image
                        src={profile.photo}
                        alt={`${profile.prenom} ${profile.nom}`}
                        width={144}
                        height={144}
                        priority
                        className="h-40 w-40 shrink-0 rounded-full object-cover ring-2 ring-[#ffcb77] ring-offset-4 ring-offset-[#fef9ef] sm:h-60 sm:w-60"
                    />
                </div>

                <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-(--line) pt-5 text-sm text-(--muted)">
                    <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" aria-hidden />
                        Lomé, Togo
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Circle
                            className="h-2.5 w-2.5 fill-[#17c3b2] text-[#17c3b2]"
                            aria-hidden
                        />
                        Disponible pour des missions
                    </span>
                    <a
                        href={`mailto:${profile.email}`}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-(--accent)"
                    >
                        <Mail className="h-4 w-4" aria-hidden />
                        {profile.email}
                    </a>
                    <a
                        href={profile.liens.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-(--accent)"
                    >
                        <Code2 className="h-4 w-4" aria-hidden />
                        GitHub
                    </a>
                    <a
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-(--accent)"
                    >
                        <Briefcase className="h-4 w-4" aria-hidden />
                        LinkedIn
                    </a>
                </div>
            </Reveal>
        </section>
    );
}
