"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/components/admin/Button";
import { Field } from "@/components/admin/Field";
import { FieldError } from "@/components/admin/field-parts";
import { useHydrated } from "@/components/admin/use-hydrated";
import {
  EMPTY_LINK_ROWS_WITHOUT_JS,
  linkErrorRow,
  PROJECT_LIMITS,
  type ProjectLinkInput,
} from "@/lib/validation/project";

type Row = ProjectLinkInput & { key: number };

/** Identifiant du champ « Libellé » de la ligne `index` (à partir de 0), cible du focus après une erreur. */
export function linkLabelId(index: number): string {
  return `projet-lien-${index}-libelle`;
}

function linkUrlId(index: number): string {
  return `projet-lien-${index}-adresse`;
}

const GROUP_ERROR_ID = "projet-liens-erreur";

/**
 * Liens ordonnés d'un projet (libellé + adresse en https://). L'ordre envoyé
 * est celui des lignes. Sans JavaScript : les liens enregistrés, suivis de
 * lignes libres ; une ligne laissée vide est ignorée. Avec JavaScript :
 * « Ajouter un lien », « Monter », « Descendre » et « Retirer » sur chaque ligne.
 */
export function LinksField({ initialLinks, error }: { initialLinks: ProjectLinkInput[]; error?: string }) {
  const hydrated = useHydrated();
  // Clés stables des lignes (React) : les lignes initiales prennent 0, 1, 2…, les suivantes continuent.
  const [rows, setRows] = useState<Row[]>(() =>
    (initialLinks.length > 0 ? initialLinks : [{ label: "", url: "" }]).map((link, key) => ({ ...link, key })),
  );
  const nextKey = useRef(Math.max(initialLinks.length, 1));
  const [announcement, setAnnouncement] = useState("");
  // Élément à focaliser après le prochain rendu (ligne déplacée, ajoutée ou retirée).
  const focusTarget = useRef<string | null>(null);
  const setFocusTarget = (id: string) => {
    focusTarget.current = id;
  };

  useEffect(() => {
    if (!focusTarget.current) return;
    document.getElementById(focusTarget.current)?.focus();
    focusTarget.current = null;
  });

  const errorRow = linkErrorRow(error);

  // Sans JavaScript (et au premier rendu) : lignes enregistrées + lignes libres, champs non contrôlés.
  if (!hydrated) {
    const count = Math.min(initialLinks.length + EMPTY_LINK_ROWS_WITHOUT_JS, PROJECT_LIMITS.links + EMPTY_LINK_ROWS_WITHOUT_JS);
    const staticRows = Array.from({ length: count }, (_, index) => initialLinks[index] ?? { label: "", url: "" });
    return (
      <LinksGroup error={error} errorRow={errorRow}>
        <p className="text-sm">
          Les lignes laissées vides sont ignorées. L’ordre d’affichage est celui des lignes : pour le modifier, changez le
          contenu des lignes.
        </p>
        {staticRows.map((link, index) => (
          <LinkRow
            key={index}
            index={index}
            label={link.label}
            url={link.url}
            error={errorRow === index + 1 ? error : undefined}
          />
        ))}
      </LinksGroup>
    );
  }

  function update(index: number, patch: Partial<ProjectLinkInput>) {
    setRows((current) => current.map((row, other) => (other === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return;
    setRows((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setAnnouncement(`Lien déplacé en position ${target + 1} sur ${rows.length}.`);
    // Le focus suit la ligne déplacée (bouton opposé s'il arrive en bout de liste, où le sien est désactivé).
    const atEdge = direction === "up" ? target === 0 : target === rows.length - 1;
    setFocusTarget(`projet-lien-${target}-${atEdge ? (direction === "up" ? "descendre" : "monter") : direction === "up" ? "monter" : "descendre"}`);
  }

  function remove(index: number) {
    setRows((current) => current.filter((_, other) => other !== index));
    setAnnouncement(`Lien ${index + 1} retiré.`);
    const remaining = rows.length - 1;
    setFocusTarget(remaining === 0 ? "projet-lien-ajouter" : linkLabelId(Math.min(index, remaining - 1)));
  }

  function add() {
    const key = nextKey.current;
    nextKey.current += 1;
    setRows((current) => [...current, { label: "", url: "", key }]);
    setAnnouncement(`Lien ${rows.length + 1} ajouté.`);
    setFocusTarget(linkLabelId(rows.length));
  }

  return (
    <LinksGroup error={error} errorRow={errorRow}>
      {rows.length === 0 ? <p>Aucun lien.</p> : null}
      {rows.map((row, index) => (
        <LinkRow
          key={row.key}
          index={index}
          label={row.label}
          url={row.url}
          error={errorRow === index + 1 ? error : undefined}
          onChange={(patch) => update(index, patch)}
          controls={
            <div className="flex flex-wrap gap-2">
              <Button
                id={`projet-lien-${index}-monter`}
                variant="secondary"
                icon={ArrowUp}
                disabled={index === 0}
                onClick={() => move(index, "up")}
              >
                Monter<span className="sr-only"> le lien {index + 1}</span>
              </Button>
              <Button
                id={`projet-lien-${index}-descendre`}
                variant="secondary"
                icon={ArrowDown}
                disabled={index === rows.length - 1}
                onClick={() => move(index, "down")}
              >
                Descendre<span className="sr-only"> le lien {index + 1}</span>
              </Button>
              <Button variant="secondary" icon={X} onClick={() => remove(index)}>
                Retirer<span className="sr-only"> le lien {index + 1}</span>
              </Button>
            </div>
          }
        />
      ))}
      <div>
        <Button
          id="projet-lien-ajouter"
          variant="secondary"
          icon={Plus}
          disabled={rows.length >= PROJECT_LIMITS.links}
          onClick={add}
        >
          Ajouter un lien
        </Button>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </LinksGroup>
  );
}

function LinksGroup({
  error,
  errorRow,
  children,
}: {
  error?: string;
  errorRow: number | null;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4" aria-describedby={error && errorRow === null ? GROUP_ERROR_ID : undefined}>
      <legend className="mb-2 p-0 font-semibold">Liens (facultatifs)</legend>
      <p className="text-sm">
        Par exemple « Code source » vers GitHub ou « Démo » vers un site. L’adresse doit commencer par https://.{" "}
        {PROJECT_LIMITS.links} liens au plus.
      </p>
      {/* Erreur qui ne vise pas une ligne précise (trop de liens, liste mal formée). */}
      {error && errorRow === null ? <FieldError id={GROUP_ERROR_ID}>{error}</FieldError> : null}
      {children}
    </fieldset>
  );
}

function LinkRow({
  index,
  label,
  url,
  error,
  onChange,
  controls,
}: {
  index: number;
  label: string;
  url: string;
  error?: string;
  onChange?: (patch: Partial<ProjectLinkInput>) => void;
  controls?: ReactNode;
}) {
  const controlled = onChange !== undefined;
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 rounded-md border border-slate-blue/25 p-4">
      <legend className="px-1 font-semibold">Lien {index + 1}</legend>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field
          id={linkLabelId(index)}
          name="linkLabel"
          label="Libellé"
          autoComplete="off"
          maxLength={PROJECT_LIMITS.linkLabel}
          error={error}
          {...(controlled ? { value: label, onChange: (event) => onChange({ label: event.target.value }) } : { defaultValue: label })}
        />
        <Field
          id={linkUrlId(index)}
          name="linkUrl"
          type="url"
          label="Adresse (https://)"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          maxLength={PROJECT_LIMITS.linkUrl}
          {...(controlled ? { value: url, onChange: (event) => onChange({ url: event.target.value }) } : { defaultValue: url })}
        />
      </div>
      {controls}
    </fieldset>
  );
}
