"use client";

import { useEffect, useRef } from "react";

import { Alert } from "./Alert";
import type { Tone } from "./tones";

/**
 * Message affiché après une redirection (`?resultat=…`, ex. « La formation a
 * été enregistrée »). Il reçoit le focus à son apparition : après une
 * navigation côté client, une zone `role="status"` créée avec son texte n'est
 * pas toujours annoncée, et le focus resterait sinon sur un élément disparu
 * (bouton du dialogue de suppression). Sans JavaScript, c'est un simple Alert.
 */
export function ResultAlert({ tone = "success", children }: { tone?: Tone; children: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [children]);

  return (
    <div ref={ref} tabIndex={-1} className="rounded-md">
      <Alert tone={tone}>{children}</Alert>
    </div>
  );
}
