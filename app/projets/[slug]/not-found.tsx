import Link from "next/link";

export default function NotFound() {
    return (
        <section className="min-h-screen flex items-center justify-center bg-white py-24">
            <div className="max-w-md mx-auto px-6 text-center">
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 border-2 border-[#14213d]/20 mb-6">
                        <i className="fas fa-search text-4xl text-[#14213d]/40"></i>
                    </div>

                    <h1 className="text-4xl font-bold text-[#14213d] mb-4">
                        Projet introuvable
                    </h1>

                    <div className="w-16 h-1 bg-[#fca311] mx-auto mb-4"></div>

                    <p className="text-[#14213d]/70 mb-8 leading-relaxed">
                        Le projet que vous recherchez n&apos;existe pas ou a été
                        supprimé.
                    </p>
                </div>

                <Link
                    href="/projets"
                    className="inline-flex items-center gap-2 bg-[#fca311] hover:bg-[#e09200] text-white px-6 py-3 font-semibold transition-colors duration-200"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                    Retour aux projets
                </Link>
            </div>
        </section>
    );
}
