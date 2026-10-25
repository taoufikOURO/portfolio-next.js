"use client";

import {
    AnimatePresence,
    motion,
    type HTMLMotionProps,
    type Variants,
} from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

const revealVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.72, ease },
    },
};

const horizontalSlideVariants: Variants = {
    hidden: { opacity: 0, x: 90 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.8, ease },
    },
};

export function Reveal({
    children,
    delay = 0,
    className,
    ...props
}: HTMLMotionProps<"div"> & { delay?: number }) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={shouldReduceMotion ? false : "hidden"}
            whileInView={shouldReduceMotion ? undefined : "visible"}
            viewport={{ once: true, amount: 0.18 }}
            variants={revealVariants}
            transition={{ delay }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}

export function Stagger({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <motion.div
            initial={shouldReduceMotion ? false : "hidden"}
            whileInView={shouldReduceMotion ? undefined : "visible"}
            viewport={{ once: true, amount: 0.14 }}
            variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1 } },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div variants={revealVariants} className={className}>
            {children}
        </motion.div>
    );
}

export function HorizontalSlideItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={horizontalSlideVariants}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export function MenuPanel({
    open,
    children,
}: {
    open: boolean;
    children: ReactNode;
}) {
    return (
        <AnimatePresence initial={false}>
            {open && (
                <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.28, ease }}
                    className="overflow-hidden"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export { motion };
