import { getAllTechnologies } from "@/app/lib/data";
import Image from "next/image";

export default function Stack() {
    const technologies = getAllTechnologies();

    return (
        <section
            id="stack"
            className="py-24 md:py-32 bg-linear-to-b from-white to-[#f8fafc] relative overflow-hidden"
        >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-80 h-80 blob blob-primary rounded-full opacity-10" />
            <div className="absolute bottom-20 left-10 w-72 h-72 blob blob-accent rounded-full opacity-10" />

            <div className="max-w-6xl mx-auto px-6 relative z-10">
                {/* Header avec animations */}
                <div className="text-center mb-20 animate-fade-in-up">
                    <span className="inline-block text-sm font-bold text-[#fca311] uppercase tracking-widest mb-4">
                        Mon Écosystème
                    </span>

                    <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-[#14213d] mb-6 leading-tight">
                        Technologies &{" "}
                        <span className="text-transparent bg-linear-to-r from-[#fca311] to-[#fdb84d] bg-clip-text">
                            Compétences
                        </span>
                    </h2>

                    <div className="flex justify-center gap-3 mb-8">
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                        <div className="w-16 h-1 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full animate-gradient-shift"></div>
                        <div className="w-8 h-1 bg-[#fca311] rounded-full"></div>
                    </div>

                    <p className="text-lg text-[#14213d]/70 max-w-2xl mx-auto font-light">
                        L&apos;écosystème tech qui donne vie à mes données et
                        mes créations
                    </p>
                </div>

                {technologies.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-16 animate-fade-in-up animation-delay-200">
                            {technologies.map((tech, index) => (
                                <div
                                    key={index}
                                    className="group relative"
                                    style={{
                                        animation: `fadeInUp 0.8s ease-out forwards`,
                                        animationDelay: `${300 + index * 50}ms`,
                                    }}
                                >
                                    <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center h-full hover-lift hover:shadow-[0_0_30px_rgba(252,163,17,0.2)] hover:border-[#fca311]/60 border-[#fca311]/20 transition-all">
                                        {/* Icon/Image container */}
                                        <div className="relative w-14 h-14 mb-4 group-hover:scale-110 transition-transform duration-300">
                                            {tech.icon && (
                                                <Image
                                                    src={tech.icon}
                                                    alt={tech.name}
                                                    fill
                                                    className="object-contain filter group-hover:drop-shadow-[0_0_15px_rgba(252,163,17,0.5)]"
                                                />
                                            )}
                                        </div>

                                        {/* Tech name */}
                                        <span className="text-sm font-bold text-[#14213d] text-center group-hover:text-[#fca311] transition-colors line-clamp-2">
                                            {tech.name}
                                        </span>

                                        {/* Glow effect on hover */}
                                        <div className="absolute inset-0 rounded-2xl bg-[#fca311]/5 opacity-0 group-hover:opacity-100 transition-opacity -z-10 blur-xl"></div>

                                        {/* Bottom accent line */}
                                        <div className="absolute bottom-0 left-0 right-0 h-1 w-0 bg-linear-to-r from-[#fca311] to-[#fdb84d] rounded-full group-hover:w-full transition-all duration-300"></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Stats section */}
                        <div className="mt-20 animate-spring-in animation-delay-500">
                            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                                <div className="text-center sm:text-left">
                                    <p className="text-2xl font-bold text-[#14213d] mb-2">
                                        Technologies Maîtrisées
                                    </p>
                                    <p className="text-[#14213d]/60">
                                        Avec une expertise solide et une passion
                                        pour l&apos;apprentissage continu
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-24 animate-fade-in-up">
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl border-4 border-[#fca311]/20 bg-linear-to-br from-[#fca311]/10 to-transparent mb-8">
                            <i className="fas fa-layer-group text-[#fca311]/40 text-5xl animate-float"></i>
                        </div>
                        <p className="text-[#14213d]/60 text-xl font-light">
                            Stack en cours d&apos;ajout...
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
