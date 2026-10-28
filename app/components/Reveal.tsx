"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export default function Reveal({
    children,
    className,
    delay = 0,
    y = 24,
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
    y?: number;
}) {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={
                reduceMotion ? false : { opacity: 0, y, scale: 0.985 }
            }
            whileInView={
                reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }
            }
            viewport={{ once: true, amount: 0.3 }}
            transition={{
                duration: 0.7,
                delay,
                ease: [0.22, 1, 0.36, 1],
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
