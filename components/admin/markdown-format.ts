// Actions de la barre d'outils de l'éditeur Markdown (gras, italique, titre,
// lien, code, liste). Module pur : prend le texte et la sélection, renvoie le
// nouveau texte et la sélection à rétablir. Testé seul.

export type TextSelection = { value: string; start: number; end: number };

export type FormatAction = "bold" | "italic" | "heading" | "link" | "code" | "list";

/** Texte proposé quand rien n'est sélectionné (sélectionné ensuite, prêt à être remplacé). */
export const FORMAT_PLACEHOLDERS: Record<FormatAction, string> = {
  bold: "texte en gras",
  italic: "texte en italique",
  heading: "Titre de section",
  link: "texte du lien",
  code: "code",
  list: "élément de liste",
};

function wrap(selection: TextSelection, marker: string, placeholder: string): TextSelection {
  const { value, start, end } = selection;
  const inner = value.slice(start, end) || placeholder;
  const next = `${value.slice(0, start)}${marker}${inner}${marker}${value.slice(end)}`;
  return { value: next, start: start + marker.length, end: start + marker.length + inner.length };
}

/** Début de la première ligne et fin de la dernière ligne touchées par la sélection. */
function lineBounds(value: string, start: number, end: number): { from: number; to: number } {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const newline = value.indexOf("\n", end > start && value[end - 1] === "\n" ? end - 1 : end);
  return { from, to: newline === -1 ? value.length : newline };
}

/** Préfixe chaque ligne de la sélection (titre, liste), sans doubler un préfixe déjà présent. */
function prefixLines(selection: TextSelection, prefix: string, already: RegExp, placeholder: string): TextSelection {
  const { value, start, end } = selection;
  if (start === end && (value.length === 0 || lineIsEmpty(value, start))) {
    const insert = `${prefix}${placeholder}`;
    const next = `${value.slice(0, start)}${insert}${value.slice(end)}`;
    return { value: next, start: start + prefix.length, end: start + insert.length };
  }
  const { from, to } = lineBounds(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const prefixed = lines.map((line) => (line.trim() === "" || already.test(line) ? line : `${prefix}${line}`)).join("\n");
  return { value: `${value.slice(0, from)}${prefixed}${value.slice(to)}`, start: from, end: from + prefixed.length };
}

function lineIsEmpty(value: string, position: number): boolean {
  const { from, to } = lineBounds(value, position, position);
  return value.slice(from, to).trim() === "";
}

export function applyFormat(action: FormatAction, selection: TextSelection): TextSelection {
  const placeholder = FORMAT_PLACEHOLDERS[action];
  switch (action) {
    case "bold":
      return wrap(selection, "**", placeholder);
    case "italic":
      return wrap(selection, "_", placeholder);
    case "heading":
      return prefixLines(selection, "## ", /^#{1,6}\s/, placeholder);
    case "list":
      return prefixLines(selection, "- ", /^\s*(?:[-*+]|\d+[.)])\s/, placeholder);
    case "code": {
      const { value, start, end } = selection;
      const selected = value.slice(start, end);
      if (!selected.includes("\n")) return wrap(selection, "`", placeholder);
      // Plusieurs lignes : bloc de code, sur ses propres lignes.
      const before = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
      const after = end < value.length && value[end] !== "\n" ? "\n" : "";
      const block = `${before}\`\`\`\n${selected.replace(/\n$/, "")}\n\`\`\`${after}`;
      const innerStart = start + before.length + 4;
      return {
        value: `${value.slice(0, start)}${block}${value.slice(end)}`,
        start: innerStart,
        end: innerStart + selected.replace(/\n$/, "").length,
      };
    }
    case "link": {
      const { value, start, end } = selection;
      const text = value.slice(start, end) || placeholder;
      const url = "https://";
      const insert = `[${text}](${url})`;
      const urlStart = start + text.length + 3;
      return { value: `${value.slice(0, start)}${insert}${value.slice(end)}`, start: urlStart, end: urlStart + url.length };
    }
  }
}
