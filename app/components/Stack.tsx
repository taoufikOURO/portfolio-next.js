import { getAllTechnologies } from "@/app/lib/data";
import Image from "next/image";
import { Reveal, Stagger, StaggerItem } from "./Motion";

export default function Stack() {
    const technologies = getAllTechnologies();
    return (
        <section
            id="stack"
            className="poster-section dark-section px-6 py-24 md:px-12 md:py-36 lg:px-20"
        >
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
                    <Reveal>
                        <span className="poster-kicker text-(--blue)">
                            02 / Stack technique
                        </span>
                        <h2 className="display poster-heading mt-7">
                            Les outils
                            <br />
                            <span className="text-(--lime)">
                                du raisonnement.
                            </span>
                        </h2>
                    </Reveal>
                    <Reveal delay={0.08} className="max-w-sm font-mono text-xs leading-relaxed text-white/55">
                        {String(technologies.length).padStart(2, "0")} MODULES
                        CHARGÉS
                        <br />
                        DATA · ENGINEERING · INTERFACE
                    </Reveal>
                </div>
                <Stagger className="mt-16 grid grid-cols-2 border-l border-t border-white/15 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {technologies.map((tech, index) => (
                        <StaggerItem
                            key={tech.name}
                            className="group relative flex min-h-36 flex-col justify-between border-b border-r border-white/15 p-5 transition-colors hover:bg-white/[.04]"
                        >
                            <span className="font-mono text-[10px] text-white/40">
                                0{index + 1}
                            </span>
                            {tech.icon && (
                                <div className="relative h-10 w-10">
                                    <Image
                                        src={tech.icon}
                                        alt={tech.name}
                                        fill
                                        className="object-contain  transition-opacity"
                                    />
                                </div>
                            )}
                            <span className="text-sm font-bold text-(--lime)">
                                {tech.name}
                            </span>
                        </StaggerItem>
                    ))}
                </Stagger>
            </div>
        </section>
    );
}
