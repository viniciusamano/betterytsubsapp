"use client";

import { useState, useTransition } from "react";
import { createProperty } from "@/app/actions";
import type { PropertyType } from "@/lib/catalog-types";
import { Popover } from "./Popover";
import styles from "./Catalog.module.css";

const PROP_TYPES: { id: PropertyType; label: string; desc: string }[] = [
  { id: "multi_select", label: "Múltipla seleção", desc: "Várias tags por canal" },
  { id: "select", label: "Seleção única", desc: "Uma opção por canal" },
  { id: "text", label: "Texto", desc: "Anotação livre" },
  { id: "number", label: "Número", desc: "Valor numérico" },
  { id: "checkbox", label: "Checkbox", desc: "Sim ou não" },
  { id: "link", label: "Link", desc: "URL externa" },
];

export function NewPropertyPopover({
  anchorEl,
  onClose,
}: {
  anchorEl: HTMLElement;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("multi_select");
  const [, startTransition] = useTransition();

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createProperty(trimmed, type);
    });
    onClose();
  }

  return (
    <Popover anchorEl={anchorEl} onClose={onClose} className={`${styles.popover} ${styles.popoverWide}`}>
      <div className={styles.popoverTitle}>Nova propriedade</div>
      <div className={styles.popoverField}>
        <label>Nome</label>
        <input
          type="text"
          autoFocus
          placeholder="ex: Idioma, Prioridade, Formato…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
        />
      </div>
      <div className={styles.popoverField}>
        <label>Tipo</label>
        {PROP_TYPES.map((t) => (
          <div
            key={t.id}
            className={`${styles.typeOption} ${type === t.id ? styles.typeOptionSelected : ""}`}
            onClick={() => setType(t.id)}
          >
            <div>
              <div className={styles.typeOptionName}>{t.label}</div>
              <div className={styles.typeOptionDesc}>{t.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.popoverFoot}>
        <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnGhost}`} onClick={onClose}>
          Cancelar
        </button>
        <button className={`${styles.btn} ${styles.btnSmall} ${styles.btnPrimary}`} onClick={create}>
          Criar
        </button>
      </div>
    </Popover>
  );
}
