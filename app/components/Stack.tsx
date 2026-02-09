import { getAllTechnologies } from "@/app/lib/data";
import Image from "next/image";

export default function Stack() {
    const technologies = getAllTechnologies();

    return (
        <section id="stack" className="py-24 bg-gray-50">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header épuré */}
                <div className="text-center mb-16">

                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#14213d] mb-6 leading-tight">
                        Technologies &{" "}
                        <span className="text-[#14213d]">Compétences</span>
                    </h2>

                    <div className="w-16 h-1 bg-[#fca311] mx-auto mb-6"></div>

                    <p className="text-lg text-[#14213d]/70 max-w-2xl mx-auto font-light">
                        L&apos;écosystème qui donne vie à mes créations
                    </p>
                </div>

                {technologies.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                        {technologies.map((tech, index) => (
                            <div
                                key={index}
                                className="group relative flex flex-col items-center justify-center p-6 bg-white border border-[#14213d]/10 hover:border-[#fca311] hover:-translate-y-2 transition-all duration-200"
                            >
                                {/* Icon/Image */}
                                <div className="relative w-12 h-12 mb-4 group-hover:scale-110 transition-transform duration-200">
                                    {tech.icon && (
                                        <Image
                                            src={tech.icon}
                                            alt={tech.name}
                                            fill
                                            className="object-contain"
                                        />
                                    )}
                                </div>

                                {/* Nom de la technologie */}
                                <span className="text-sm font-semibold text-[#14213d] text-center group-hover:text-[#fca311] transition-colors duration-200">
                                    {tech.name}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-24 h-24 border-2 border-[#14213d]/20 mb-6">
                            <i className="fas fa-layer-group text-[#14213d]/40 text-4xl"></i>
                        </div>
                        <p className="text-[#14213d]/60 text-lg">
                            Stack en cours d&apos;ajout...
                        </p>
                    </div>
                )}

                {/* Stats */}
                {technologies.length > 0 && (
                    <div className="mt-16 text-center">
                        <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#fca311] text-white">
                            <i className="fas fa-check-circle"></i>
                            <span className="font-semibold">
                                {technologies.length} technologies maîtrisées
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
