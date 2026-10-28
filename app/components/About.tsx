import { getProfile } from "@/app/lib/data";
import { GraduationCap, MapPin, Wrench } from "lucide-react";
import Reveal from "./Reveal";

export default function About() {
    const profile = getProfile();

    return (
        <section id="about" className="section">
            <Reveal className="shell grid gap-8 md:grid-cols-[11rem_1fr] md:gap-12">
                <div>
                    <h2 className="heading section-heading text-3xl">
                        À propos
                    </h2>
                    <ul className="mt-6 space-y-4 text-sm text-(--muted)">
                        <li className="flex items-start gap-2">
                            <MapPin
                                className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-4)"
                                aria-hidden
                            />
                            Lomé, Togo
                        </li>
                        <li className="flex items-start gap-2">
                            <GraduationCap
                                className="mt-0.5 h-4 w-4 shrink-0 text-(--accent)"
                                aria-hidden
                            />
                            Master IA &amp; Big Data
                        </li>
                        <li className="flex items-start gap-2">
                            <Wrench
                                className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-2)"
                                aria-hidden
                            />
                            Data · ML · Interfaces
                        </li>
                    </ul>
                </div>
                <p className="max-w-2xl text-lg leading-relaxed text-(--muted) md:text-xl text-justify">
                    {profile.aPropos}
                </p>
            </Reveal>
        </section>
    );
}
