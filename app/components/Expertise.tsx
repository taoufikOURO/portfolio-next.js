"use client";

import type { Service } from "@/app/types/data";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const entrance = {
    hidden: { opacity: 0, y: 24 },
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            delay: index * 0.1,
            ease: [0.22, 1, 0.36, 1] as const,
        },
    }),
};

export default function Expertise({ services }: { services: Service[] }) {
    const [open, setOpen] = useState(1);
    const reduceMotion = useReducedMotion();

    return (
        <section id="expertise" className="section">
            <div className="shell relative">
                <div className="relative overflow-hidden">
                    <span className="ghost-text absolute -left-1 -top-4 hidden sm:block">
                        Expertise
                    </span>
                    <motion.div
                        initial={reduceMotion ? false : "hidden"}
                        whileInView={reduceMotion ? undefined : "visible"}
                        viewport={{ once: true, amount: 0.5 }}
                        variants={entrance}
                        custom={0}
                        className="relative flex items-end justify-between gap-4 pt-6 sm:pt-12"
                    >
                        <h2 className="heading text-[clamp(2.2rem,5.2vw,4rem)] sm:sr-only">
                            Expertise
                        </h2>
                        <span className="label label-dot ml-auto">
                            Services
                        </span>
                    </motion.div>
                </div>

                <div className="mt-8 space-y-3">
                    {services.map((service, index) => {
                        const isOpen = open === index;
                        return (
                            <motion.div
                                key={service.titre}
                                custom={index + 1}
                                initial={reduceMotion ? false : "hidden"}
                                whileInView={
                                    reduceMotion ? undefined : "visible"
                                }
                                viewport={{ once: true, amount: 0.25 }}
                                variants={entrance}
                                className="overflow-hidden rounded-3xl bg-(--surface)"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpen(isOpen ? -1 : index)
                                    }
                                    aria-expanded={isOpen}
                                    aria-controls={`service-panel-${index}`}
                                    className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left md:px-10 md:py-7"
                                >
                                    <span className="heading text-[clamp(1.7rem,4vw,3.2rem)]">
                                        {service.titre}
                                    </span>
                                    <span className="shrink-0 text-(--ink)">
                                        {isOpen ? (
                                            <Minus
                                                className="h-6 w-6 md:h-8 md:w-8"
                                                strokeWidth={1.4}
                                                aria-hidden
                                            />
                                        ) : (
                                            <Plus
                                                className="h-6 w-6 md:h-8 md:w-8"
                                                strokeWidth={1.4}
                                                aria-hidden
                                            />
                                        )}
                                    </span>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            id={`service-panel-${index}`}
                                            initial={
                                                reduceMotion
                                                    ? false
                                                    : { height: 0, opacity: 0 }
                                            }
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{
                                                height: 0,
                                                opacity: 0,
                                            }}
                                            transition={{
                                                duration: 0.35,
                                                ease: [0.22, 1, 0.36, 1],
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <p className="max-w-3xl px-6 pb-7 text-sm leading-relaxed text-(--muted) md:px-10 md:text-base">
                                                {service.description}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
