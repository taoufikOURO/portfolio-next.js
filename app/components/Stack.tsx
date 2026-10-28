import { getAllTechnologies } from "@/app/lib/data";
import Image from "next/image";
import Reveal from "./Reveal";

export default function Stack() {
    const technologies = getAllTechnologies();

    return (
        <section id="stack" className="section">
            <Reveal className="shell">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="heading section-heading text-3xl">
                        Compétences
                    </h2>
                    <p className="text-sm text-(--muted)">
                        {technologies.length} outils utilisés au quotidien
                    </p>
                </div>

                <ul className="mt-8 grid gap-x-10 gap-y-1 sm:grid-cols-2">
                    {technologies.map((technology) => (
                        <li
                            key={technology.name}
                            className="group flex items-center gap-3 border-b border-(--line) py-3.5"
                        >
                            <Image
                                src={technology.icon}
                                alt=""
                                width={24}
                                height={24}
                                className="h-20 w-6 object-contain"
                            />
                            <span className="text-sm font-medium transition-colors group-hover:text-(--accent)">
                                {technology.name}
                            </span>
                        </li>
                    ))}
                </ul>
            </Reveal>
        </section>
    );
}
