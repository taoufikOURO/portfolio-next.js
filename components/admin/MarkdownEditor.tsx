"use client";

import {
  useDeferredValue,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { Bold, Code, Heading2, Italic, Link2, List, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

import { FOCUS_FADE, FieldError, FieldHint, FieldLabel, controlClasses, describedBy } from "./field-parts";
import { applyFormat, type FormatAction } from "./markdown-format";
import { MarkdownPreview } from "./MarkdownPreview";
import { createScrollSync, scrollRatio, scrollTopForRatio } from "./scroll-sync";
import { useHydrated } from "./use-hydrated";

const TOOLS: { action: FormatAction; label: string; shortcut?: string; icon: LucideIcon }[] = [
  { action: "bold", label: "Gras", shortcut: "Ctrl+B", icon: Bold },
  { action: "italic", label: "Italique", shortcut: "Ctrl+I", icon: Italic },
  { action: "heading", label: "Titre de section", icon: Heading2 },
  { action: "link", label: "Lien", icon: Link2 },
  { action: "code", label: "Code", icon: Code },
  { action: "list", label: "Liste à puces", icon: List },
];

/** Côte à côte à partir de 1024 px ; en dessous, onglets « Écrire » et « Aperçu ». */
const WIDE_QUERY = "(min-width: 1024px)";

/**
 * Hauteur commune de la zone d'écriture et de l'aperçu : 60 % de la fenêtre,
 * entre 18 rem (288 px) et 40 rem (640 px). Chacune défile dans son cadre : la
 * page ne s'allonge plus avec l'article.
 */
const PANE_HEIGHT = "h-[clamp(18rem,60vh,40rem)]";

function subscribeWide(callback: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

export type MarkdownEditorProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Sortie de la zone de texte (l'autosave s'en sert). */
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
  rows?: number;
};

/**
 * Éditeur Markdown : zone de texte native, petite barre d'outils (gras,
 * italique, titre, lien, code, liste) et aperçu (`MarkdownPreview`). Aperçu
 * côte à côte à partir de 1024 px ; en dessous, onglets « Écrire » et
 * « Aperçu ». Les deux zones ont la même hauteur fixe (`PANE_HEIGHT`) et
 * défilent chacune dans leur cadre, à la même proportion (`scroll-sync.ts`) :
 * côte à côte, l'une suit l'autre ; en onglets, la zone affichée reprend la
 * proportion de la précédente. Sans JavaScript : la zone de texte seule (envoyée avec le
 * formulaire), puis l'aperçu du texte enregistré, sans barre d'outils ni onglets.
 *
 * Clavier : la barre d'outils est un seul arrêt de tabulation (flèches gauche
 * et droite, Début, Fin) ; Ctrl+B et Ctrl+I dans la zone de texte ; flèches
 * gauche et droite entre les onglets.
 */
export function MarkdownEditor({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  required,
  maxLength,
  rows = 18,
}: MarkdownEditorProps) {
  const hydrated = useHydrated();
  // L'aperçu suit la frappe sans la ralentir (rendu différé sur les longs articles).
  const previewValue = useDeferredValue(value);
  const wide = useWide();
  const tabs = hydrated && !wide;
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [activeTool, setActiveTool] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  // Défilement synchronisé (proportion commune, écho ignoré : pas de boucle).
  const [scrollSync] = useState(() => createScrollSync<HTMLElement>());
  // Dernière proportion de défilement, reprise par la zone affichée au changement d'onglet.
  const scrollRatioRef = useRef(0);
  const toolRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const ids = describedBy(id, hint, error);
  const writeTabId = `${baseId}-onglet-ecrire`;
  const previewTabId = `${baseId}-onglet-apercu`;
  const writePanelId = `${baseId}-ecrire`;
  const previewPanelId = `${baseId}-apercu`;
  const previewLabelId = `${baseId}-apercu-libelle`;

  function onPaneScroll(source: HTMLElement | null, target: HTMLElement | null) {
    if (!source) return;
    scrollRatioRef.current = scrollRatio(source);
    // En onglets, l'autre zone est masquée : elle reprendra la proportion à l'affichage.
    if (!tabs && target) scrollSync.sync(source, target);
  }

  // Changement d'onglet ou de disposition : la zone affichée reprend la dernière proportion.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;
    if (!tabs) {
      scrollSync.sync(textarea, preview);
      return;
    }
    const visible = tab === "write" ? textarea : preview;
    visible.scrollTop = scrollTopForRatio(scrollRatioRef.current, visible);
  }, [tabs, tab, scrollSync]);

  function format(action: FormatAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = applyFormat(action, { value, start: textarea.selectionStart, end: textarea.selectionEnd });
    if (maxLength !== undefined && next.value.length > maxLength) return;
    onChange(next.value);
    // Sélection rétablie après le rendu de la nouvelle valeur.
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.start, next.end);
    });
  }

  function onTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === "b" || key === "i") {
      event.preventDefault();
      format(key === "b" ? "bold" : "italic");
    }
  }

  function onToolbarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = TOOLS.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: activeTool === last ? 0 : activeTool + 1,
      ArrowLeft: activeTool === 0 ? last : activeTool - 1,
      Home: 0,
      End: last,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    setActiveTool(target);
    toolRefs.current[target]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const next = event.key === "Home" ? "write" : event.key === "End" ? "preview" : tab === "write" ? "preview" : "write";
    setTab(next);
    document.getElementById(next === "write" ? writeTabId : previewTabId)?.focus();
  }

  const showWrite = !tabs || tab === "write";
  const showPreview = !tabs || tab === "preview";

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {hint ? <FieldHint id={ids.hintId!}>{hint}</FieldHint> : null}

      {tabs ? (
        <div role="tablist" aria-label={`${label} : affichage`} className="mt-1 inline-flex gap-1 self-start rounded-full bg-card p-1">
          {(
            [
              ["write", writeTabId, writePanelId, "Écrire"],
              ["preview", previewTabId, previewPanelId, "Aperçu"],
            ] as const
          ).map(([key, tabId, panelId, text]) => (
            <button
              key={key}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-controls={panelId}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={onTabKeyDown}
              className={cn(
                "min-h-11 cursor-pointer rounded-full px-5 font-medium transition-colors duration-150",
                tab === key ? "bg-ink text-panel" : "text-ink hover:bg-panel",
              )}
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div
          id={writePanelId}
          role={tabs ? "tabpanel" : undefined}
          aria-labelledby={tabs ? writeTabId : undefined}
          hidden={!showWrite}
          className="flex min-w-0 flex-col gap-2"
        >
          {hydrated ? (
            <div
              role="toolbar"
              aria-label="Mise en forme du contenu"
              aria-controls={id}
              onKeyDown={onToolbarKeyDown}
              className="flex flex-wrap gap-1"
            >
              {TOOLS.map(({ action, label: toolLabel, shortcut, icon: Icon }, index) => (
                <button
                  key={action}
                  ref={(element) => {
                    toolRefs.current[index] = element;
                  }}
                  type="button"
                  tabIndex={index === activeTool ? 0 : -1}
                  aria-label={shortcut ? `${toolLabel} (${shortcut})` : toolLabel}
                  title={shortcut ? `${toolLabel} (${shortcut})` : toolLabel}
                  onClick={() => {
                    setActiveTool(index);
                    format(action);
                  }}
                  className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-panel text-ink transition-colors duration-150 hover:border-ink"
                >
                  <Icon aria-hidden="true" className="size-5" />
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            id={id}
            name={name}
            rows={rows}
            value={value}
            required={required}
            maxLength={maxLength}
            spellCheck
            aria-invalid={error ? true : undefined}
            aria-describedby={ids.value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            onKeyDown={onTextareaKeyDown}
            onScroll={() => onPaneScroll(textareaRef.current, previewRef.current)}
            className={cn(
              controlClasses(Boolean(error)),
              PANE_HEIGHT,
              "resize-none overflow-y-auto font-mono text-sm leading-relaxed",
            )}
          />
        </div>

        <div
          id={previewPanelId}
          role={tabs ? "tabpanel" : undefined}
          aria-labelledby={tabs ? previewTabId : undefined}
          hidden={!showPreview}
          className="flex min-w-0 flex-col gap-2"
        >
          {tabs ? null : (
            // Hauteur de la barre d'outils : les deux cadres commencent à la même ligne.
            <p
              id={previewLabelId}
              className={cn("text-sm font-medium text-muted", hydrated && "flex min-h-11 items-center")}
            >
              {hydrated ? "Aperçu" : "Aperçu du contenu enregistré"}
            </p>
          )}
          {/* Région focalisable : défilement au clavier (flèches, Page suivante), nom « Aperçu ». */}
          <section
            ref={previewRef}
            aria-labelledby={tabs ? previewTabId : previewLabelId}
            tabIndex={0}
            onScroll={() => onPaneScroll(previewRef.current, textareaRef.current)}
            className={cn(
              PANE_HEIGHT,
              FOCUS_FADE,
              "min-w-0 overflow-y-auto rounded-[var(--radius-field)] border border-line bg-panel p-4",
            )}
          >
            {previewValue.trim() === "" ? (
              <p className="text-sm text-muted">Rien à afficher pour l’instant.</p>
            ) : (
              <MarkdownPreview content={previewValue} />
            )}
          </section>
        </div>
      </div>
      {error ? <FieldError id={ids.errorId!}>{error}</FieldError> : null}
    </div>
  );
}
