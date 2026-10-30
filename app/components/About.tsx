import {
    getAllFormations,
    getAllProjects,
    getAllTechnologies,
    getProfile,
} from "@/app/lib/data";
import Image from "next/image";
import Reveal from "./Reveal";

function Stat({
    value,
    label,
    align = "left",
}: {
    value: string;
    label: string;
    align?: "left" | "right";
}) {
    return (
        <div className={align === "right" ? "md:text-right" : ""}>
            <p className="heading text-[clamp(2.6rem,6vw,4.5rem)]">{value}</p>
            <p className="mt-1 text-xs font-medium text-(--muted) md:text-sm">
                {label}
            </p>
        </div>
    );
}

export default function About() {
    const profile = getProfile();
    const projectCount = String(getAllProjects().length).padStart(2, "0");
    const technologyCount = String(getAllTechnologies().length).padStart(
        2,
        "0",
    );
    const formationCount = String(getAllFormations().length).padStart(2, "0");

    return (
        <section id="about" className="section">
            <div className="shell">
                <Reveal className="text-center">
                    <span className="eyebrow">À propos</span>
                    <h2 className="heading mx-auto mt-5 max-w-5xl text-[clamp(1.7rem,4.4vw,3.7rem)]">
                        Étudiant en Master IA &amp; Big Data, je conçois des
                        systèmes qui transforment la donnée brute en décisions
                        concrètes.
                    </h2>
                </Reveal>

                <Reveal
                    delay={0.1}
                    className="relative mt-14 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-10"
                >
                    <div className="absolute inset-x-0 top-1/2 hidden h-px bg-(--line-strong) md:block" />

                    <div className="relative z-10 space-y-12 md:space-y-16">
                        <Stat value="04" label="Années d'études" />
                        <Stat
                            value={`${projectCount}+`}
                            label="Projets réalisés"
                        />
                    </div>

                    <div className="relative z-10 order-first col-span-2 mx-auto w-56 sm:w-64 md:order-0 md:col-span-1 md:w-72 lg:w-80">
                        <div className="relative aspect-square overflow-hidden rounded-full bg-(--accent-2)">
                            <Image
                                src={profile.photo}
                                alt={`${profile.prenom} ${profile.nom}`}
                                fill
                                sizes="(min-width: 1024px) 320px, 256px"
                                className="object-cover object-top grayscale mix-blend-multiply"
                            />
                        </div>
                    </div>

                    <div className="relative z-10 space-y-12 md:space-y-16 md:text-right">
                        <Stat
                            value={technologyCount}
                            label="Technologies"
                            align="right"
                        />
                        <Stat
                            value={formationCount}
                            label="Formations"
                            align="right"
                        />
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
