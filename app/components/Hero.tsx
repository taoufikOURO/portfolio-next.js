import { getProfile } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Motion";

export default function Hero() {
    const profile = getProfile();
    return (
        <section className="data-grid noise relative flex min-h-[calc(100vh-1rem)] items-center overflow-hidden px-6 pb-20 pt-28 md:px-12 lg:px-20">
            <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
                <Reveal className="relative z-10">
                    <p className="eyebrow mb-7">01 / Profil actif</p>
                    <h1 className="display max-w-4xl text-6xl leading-[.92] md:text-8xl lg:text-[9.4rem]">
                        DATA
                        <br />
                        <span className="text-[#668b26]">SCIENTIST</span>
                    </h1>
                    <div className="mt-8 flex items-center gap-3">
                        <span className="h-2 w-2 bg-(--coral)" />
                        <p className="font-mono text-sm font-bold uppercase tracking-[.14em]">
                            {profile.prenom}
                        </p>
                        <p className="font-mono text-sm font-bold uppercase tracking-[.14em]">
                            {profile.nom}
                        </p>
                    </div>
                    <p className="mt-8 max-w-xl text-lg leading-relaxed text-(--muted) md:text-xl">
                        {profile.bio}
                    </p>
                    <div className="mt-9 flex flex-wrap gap-3">
                        <a href="#projets" className="lime-button">
                            Explorer les projets
                        </a>
                        <Link href="/articles" className="outline-button">
                            Lire le blog
                        </Link>
                        <a
                            href={profile.cv}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="outline-button"
                        >
                            Lire le CV
                        </a>
                    </div>
                </Reveal>
                <Reveal
                    delay={0.16}
                    className="relative mx-auto w-full max-w-md"
                >
                    <div className="absolute -right-3 -top-3 z-20 bg-(--coral) px-3 py-2 font-mono text-xs font-bold text-white">
                        DATA_PERSON_001
                    </div>
                    <div className="hero-image-shell">
                        <div className="hero-image-frame">
                            <Image
                                src={profile.photo}
                                alt={`${profile.prenom} ${profile.nom}`}
                                fill
                                priority
                                className="hero-image"
                            />
                            <span className="hero-image-index">01</span>
                        </div>
                    </div>
                    <div className="mt-7 grid grid-cols-3 border-y border-(--line) py-4 font-mono text-xs">
                        <span>
                            <b className="block text-xl">ML</b> focus
                        </span>
                        <span>
                            <b className="block text-xl">UX</b> craft
                        </span>
                        <span>
                            <b className="block text-xl">∞</b> curious
                        </span>
                    </div>
                    </Reveal>
                </div>
            <div className="absolute right-8 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border border-(--coral)/50 lg:block">
                <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-(--coral)" />
            </div>
        </section>
    );
}
