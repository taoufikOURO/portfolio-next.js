import { getAllTechnologies } from "@/app/lib/data";
import Image from "next/image";
import Reveal from "./Reveal";

export default function Stack() {
    const technologies = getAllTechnologies();
    const duplicated = [...technologies, ...technologies];

    return (
        <section id="stack" className="section">
            <div className="shell">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="label">Ma stack</span>
                    <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em]">
                        {technologies.length} outils
                    </span>
                </div>
            </div>

            <Reveal delay={0.1} className="marquee mt-5">
                <div className="marquee-track">
                    {duplicated.map((technology, index) => (
                        <div
                            key={`${technology.name}-${index}`}
                            className="flex h-28 w-36 shrink-0 flex-col items-center justify-center gap-3 rounded-[1.25rem] bg-(--surface) sm:w-44"
                            aria-hidden={index >= technologies.length}
                        >
                            <Image
                                src={technology.icon}
                                alt=""
                                width={36}
                                height={36}
                                className="h-9 w-9 object-contain"
                            />
                            <span className="text-xs font-semibold">
                                {technology.name}
                            </span>
                        </div>
                    ))}
                </div>
            </Reveal>
        </section>
    );
}
