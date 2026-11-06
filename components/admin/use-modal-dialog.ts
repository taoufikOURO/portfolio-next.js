import {
    useCallback,
    useEffect,
    useRef,
    type KeyboardEvent,
    type MouseEvent,
    type RefObject,
} from "react";

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.getClientRects().length > 0,
    );
}

/**
 * Comportement commun des dialogues modaux (ConfirmDialog, panneau du menu
 * mobile), construit sur l'élément natif `<dialog>` :
 * - `showModal()` rend le reste de la page inerte ;
 * - Échap ferme le dialogue (événement natif `close`) ;
 * - Tab et Maj+Tab bouclent dans le dialogue ;
 * - un clic sur le fond (hors du contenu) ferme le dialogue ;
 * - le focus revient au déclencheur à la fermeture.
 *
 * Le `<dialog>` ne doit pas avoir de padding : son contenu est dans un
 * élément enfant, pour que `event.target === dialog` désigne le fond.
 */
export function useModalDialog({
    open,
    onClose,
    returnFocusRef,
}: {
    open: boolean;
    onClose: () => void;
    /** Déclencheur à refocaliser. À défaut, l'élément actif à l'ouverture. */
    returnFocusRef?: RefObject<HTMLElement | null>;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const lastActive = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            lastActive.current = document.activeElement as HTMLElement | null;
            dialog.showModal();
            dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        const handleClose = () => {
            onClose();
            (returnFocusRef?.current ?? lastActive.current)?.focus();
        };
        dialog.addEventListener("close", handleClose);
        return () => dialog.removeEventListener("close", handleClose);
    }, [onClose, returnFocusRef]);

    const onKeyDown = useCallback((event: KeyboardEvent<HTMLDialogElement>) => {
        if (event.key !== "Tab") return;
        const elements = focusableElements(event.currentTarget);
        if (elements.length === 0) {
            event.preventDefault();
            return;
        }
        const first = elements[0];
        const last = elements[elements.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === event.currentTarget)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }, []);

    const onMouseDown = useCallback(
        (event: MouseEvent<HTMLDialogElement>) => {
            if (event.target === event.currentTarget) onClose();
        },
        [onClose],
    );

    return { ref, onKeyDown, onMouseDown };
}
