import { getProfile } from "@/app/lib/data";
import Image from "next/image";
import Link from "next/link";

export default function Hero() {
    const profile = getProfile();
    return (
        <section className="data-grid noise relative flex min-h-[calc(100vh-1rem)] items-center overflow-hidden px-6 pb-20 pt-28 md:px-12 lg:px-20">
            <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
                <div className="reveal">
                    <p className="eyebrow mb-7">01 / Profil actif</p>
                    <h1 className="display max-w-4xl text-6xl leading-[.92] md:text-8xl lg:text-[9.4rem]">
                        {profile.prenom}
                        <br />
                        <span className="text-[#668b26]">{profile.nom}</span>
                    </h1>
                    <div className="mt-8 flex items-center gap-3">
                        <span className="h-2 w-2 bg-(--coral)" />
                        <p className="font-mono text-sm font-bold uppercase tracking-[.14em]">
                            {profile.titreProfessionnel}
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
                </div>
                <div className="reveal reveal-delay-2 relative mx-auto w-full max-w-md">
                    <div className="absolute -right-3 -top-3 z-20 bg-(--coral) px-3 py-2 font-mono text-xs font-bold text-white">
                        DATA_PERSON_001
                    </div>
                    <div className="scanline relative aspect-4/5 overflow-hidden border-8 border-(--ink) bg-(--blue) shadow-[18px_18px_0_var(--lime)]">
                        <Image
                            src={profile.photo}
                            alt={`${profile.prenom} ${profile.nom}`}
                            fill
                            priority
                            className="object-cover object-top mix-blend-multiply grayscale transition-all duration-700 hover:grayscale-0"
                        />
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
                </div>
            </div>
            <div className="absolute bottom-6 left-6 font-mono text-[10px] text-(--muted) md:left-12">
                48.8566° N / 2.3522° E
            </div>
            <div className="absolute right-8 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border border-(--coral)/50 lg:block">
                <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 bg-(--coral)" />
            </div>
        </section>
    );
}
