"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { TONES, type Tone } from "./tones";

type ToastData = { id: number; tone: Tone; message: string };

type ToastApi = {
    show: (tone: Tone, message: string) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Durée d'affichage avant fermeture automatique. Les erreurs restent jusqu'à fermeture manuelle. */
const AUTO_DISMISS_MS = 8000;

export function useToast(): ToastApi {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast doit être utilisé dans un <ToastProvider>.");
    }
    return context;
}

function ToastItem({
    toast,
    onDismiss,
}: {
    toast: ToastData;
    onDismiss: (id: number) => void;
}) {
    const [paused, setPaused] = useState(false);
    const { label, icon: Icon, surface } = TONES[toast.tone];
    const autoDismiss = toast.tone !== "error";

    // Le minuteur s'arrête quand la souris ou le focus est sur la notification.
    useEffect(() => {
        if (!autoDismiss || paused) return;
        const timer = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [autoDismiss, paused, onDismiss, toast.id]);

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-md border-2 border-l-8 border-slate-blue p-4 text-slate-blue",
                surface,
            )}
        >
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <p className="min-w-0 flex-1">
                <strong>{label} :</strong> {toast.message}
            </p>
            <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Fermer la notification"
                className="-m-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md"
            >
                <X aria-hidden="true" className="size-5" />
            </button>
        </div>
    );
}

/**
 * Notifications temporaires. Deux zones « live » permanentes : `polite` pour
 * les succès, avertissements et informations ; `role="alert"` pour les erreurs.
 * Les erreurs ne disparaissent pas toutes seules.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const api = useMemo<ToastApi>(() => {
        const show = (tone: Tone, message: string) => {
            const id = nextId.current++;
            setToasts((current) => [...current, { id, tone, message }]);
        };
        return {
            show,
            success: (message) => show("success", message),
            error: (message) => show("error", message),
            warning: (message) => show("warning", message),
            info: (message) => show("info", message),
        };
    }, []);

    const polite = toasts.filter((toast) => toast.tone !== "error");
    const errors = toasts.filter((toast) => toast.tone === "error");

    return (
        <ToastContext.Provider value={api}>
            {children}
            <section
                aria-label="Notifications"
                className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 sm:left-auto sm:w-96"
            >
                <div role="status" aria-live="polite" className="flex flex-col gap-3">
                    {polite.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                    ))}
                </div>
                <div role="alert" className="flex flex-col gap-3">
                    {errors.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                    ))}
                </div>
            </section>
        </ToastContext.Provider>
    );
}
