"use client";

import type { FaqItem } from "@/app/types/data";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";

export default function Faq({ items }: { items: FaqItem[] }) {
    const [open, setOpen] = useState(0);
    const reduceMotion = useReducedMotion();

    return (
        <section id="faq" className="section">
            <div className="shell max-w-5xl">
                <h2 className="heading text-center text-[clamp(2rem,5vw,4rem)]">
                    Questions &amp; réponses
                </h2>

                <div className="mt-10 border-t border-(--line-strong)">
                    {items.map((item, index) => {
                        const isOpen = open === index;
                        return (
                            <div
                                key={item.question}
                                className="border-b border-(--line-strong)"
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpen(isOpen ? -1 : index)
                                    }
                                    aria-expanded={isOpen}
                                    aria-controls={`faq-panel-${index}`}
                                    className="flex w-full items-center justify-between gap-6 py-5 text-left md:py-6"
                                >
                                    <span className="text-sm font-bold uppercase tracking-[0.03em] md:text-base">
                                        {item.question}
                                    </span>
                                    {isOpen ? (
                                        <Minus
                                            className="h-5 w-5 shrink-0"
                                            strokeWidth={1.4}
                                            aria-hidden
                                        />
                                    ) : (
                                        <Plus
                                            className="h-5 w-5 shrink-0"
                                            strokeWidth={1.4}
                                            aria-hidden
                                        />
                                    )}
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            id={`faq-panel-${index}`}
                                            initial={
                                                reduceMotion
                                                    ? false
                                                    : { height: 0, opacity: 0 }
                                            }
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{
                                                duration: 0.3,
                                                ease: [0.22, 1, 0.36, 1],
                                            }}
                                            className="overflow-hidden"
                                        >
                                            <p className="max-w-3xl pb-6 text-sm leading-relaxed text-(--muted) md:text-base">
                                                {item.reponse}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
