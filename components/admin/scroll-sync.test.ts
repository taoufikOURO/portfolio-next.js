import { describe, expect, it } from "vitest";

import {
  createScrollSync,
  scrollRatio,
  scrollTopForRatio,
  syncedScrollTop,
  type ScrollBox,
} from "./scroll-sync";

/** Zone factice : la position posée est bornée comme dans un navigateur, et chaque déplacement est compté. */
function box(scrollHeight: number, clientHeight: number, scrollTop = 0) {
  let top = scrollTop;
  const zone = {
    scrollHeight,
    clientHeight,
    writes: 0,
    get scrollTop() {
      return top;
    },
    set scrollTop(value: number) {
      zone.writes += 1;
      top = Math.min(Math.max(0, value), Math.max(0, scrollHeight - clientHeight));
    },
  };
  return zone;
}

describe("scrollRatio", () => {
  it("donne la proportion de défilement entre 0 et 1", () => {
    expect(scrollRatio({ scrollTop: 0, scrollHeight: 1000, clientHeight: 200 })).toBe(0);
    expect(scrollRatio({ scrollTop: 400, scrollHeight: 1000, clientHeight: 200 })).toBe(0.5);
    expect(scrollRatio({ scrollTop: 800, scrollHeight: 1000, clientHeight: 200 })).toBe(1);
  });

  it("borne les positions hors limites (rebond élastique)", () => {
    expect(scrollRatio({ scrollTop: -30, scrollHeight: 1000, clientHeight: 200 })).toBe(0);
    expect(scrollRatio({ scrollTop: 900, scrollHeight: 1000, clientHeight: 200 })).toBe(1);
  });

  it("vaut 0 quand le contenu ne défile pas", () => {
    expect(scrollRatio({ scrollTop: 0, scrollHeight: 200, clientHeight: 200 })).toBe(0);
    expect(scrollRatio({ scrollTop: 0, scrollHeight: 100, clientHeight: 200 })).toBe(0);
    expect(scrollRatio({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 })).toBe(0);
  });
});

describe("scrollTopForRatio", () => {
  it("applique la proportion au défilement maximal de la cible, arrondie", () => {
    expect(scrollTopForRatio(0.5, { scrollHeight: 2200, clientHeight: 200 })).toBe(1000);
    expect(scrollTopForRatio(1 / 3, { scrollHeight: 300, clientHeight: 200 })).toBe(33);
  });

  it("reste dans les bornes", () => {
    expect(scrollTopForRatio(-1, { scrollHeight: 1000, clientHeight: 200 })).toBe(0);
    expect(scrollTopForRatio(2, { scrollHeight: 1000, clientHeight: 200 })).toBe(800);
    expect(scrollTopForRatio(Number.NaN, { scrollHeight: 1000, clientHeight: 200 })).toBe(0);
    expect(scrollTopForRatio(0.5, { scrollHeight: 150, clientHeight: 200 })).toBe(0);
  });
});

describe("syncedScrollTop", () => {
  it("place la cible à la même proportion que la source", () => {
    const source: ScrollBox = { scrollTop: 300, scrollHeight: 1400, clientHeight: 200 };
    expect(syncedScrollTop(source, { scrollHeight: 600, clientHeight: 200 })).toBe(100);
    expect(syncedScrollTop({ ...source, scrollTop: 1200 }, { scrollHeight: 600, clientHeight: 200 })).toBe(400);
  });
});

describe("createScrollSync", () => {
  it("fait suivre la cible, dans les deux sens", () => {
    const editor = box(2000, 500);
    const preview = box(1000, 500);
    const sync = createScrollSync<typeof editor>();

    editor.scrollTop = 750;
    expect(sync.sync(editor, preview)).toBe(true);
    expect(preview.scrollTop).toBe(250);

    // L'écho du déplacement de l'aperçu est consommé, puis l'utilisateur fait défiler l'aperçu.
    sync.sync(preview, editor);
    preview.scrollTop = 500;
    expect(sync.sync(preview, editor)).toBe(true);
    expect(editor.scrollTop).toBe(1500);
  });

  it("ignore l'écho : le défilement posé ne redéplace pas la source (pas de boucle)", () => {
    const editor = box(2000, 500, 300);
    const preview = box(1000, 500);
    const sync = createScrollSync<typeof editor>();

    sync.sync(editor, preview);
    const editorWrites = editor.writes;
    // Événement « scroll » de l'aperçu provoqué par la synchronisation.
    expect(sync.sync(preview, editor)).toBe(false);
    expect(editor.writes).toBe(editorWrites);
    expect(editor.scrollTop).toBe(300);
  });

  it("ne touche pas une cible déjà à la bonne position", () => {
    const editor = box(2000, 500, 750);
    const preview = box(1000, 500, 250);
    const sync = createScrollSync<typeof editor>();

    expect(sync.sync(editor, preview)).toBe(false);
    expect(preview.writes).toBe(0);
  });

  it("ne déplace rien quand la cible ne défile pas", () => {
    const editor = box(2000, 500, 900);
    const preview = box(300, 500);
    const sync = createScrollSync<typeof editor>();

    expect(sync.sync(editor, preview)).toBe(false);
    expect(preview.scrollTop).toBe(0);
  });

  it("traite comme un vrai défilement un mouvement de la cible qui n'est pas l'écho", () => {
    const editor = box(2000, 500);
    const preview = box(1000, 500);
    const sync = createScrollSync<typeof editor>();

    editor.scrollTop = 750;
    sync.sync(editor, preview);
    // L'utilisateur fait défiler l'aperçu avant l'écho : la position diffère, l'éditeur suit.
    preview.scrollTop = 0;
    expect(sync.sync(preview, editor)).toBe(true);
    expect(editor.scrollTop).toBe(0);
  });
});
