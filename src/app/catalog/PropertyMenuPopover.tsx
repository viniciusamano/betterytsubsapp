"use client";

import { useState, useTransition } from "react";
import { deleteProperty, renameProperty } from "@/app/actions";
import type { Property } from "@/lib/catalog-types";
import { Popover } from "./Popover";
import styles from "./Catalog.module.css";

export function PropertyMenuPopover({
  property,
  anchorEl,
  onClose,
}: {
  property: Property;
  anchorEl: HTMLElement;
  onClose: () => void;
}) {
  const [name, setName] = useState(property.name);
  const [, startTransition] = useTransition();

  function commitRename() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== property.name) {
      startTransition(async () => {
        await renameProperty(property.id, trimmed);
      });
    }
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteProperty(property.id);
    });
    onClose();
  }

  return (
    <Popover anchorEl={anchorEl} onClose={() => { commitRename(); onClose(); }} className={styles.popover}>
      <div className={styles.popoverField}>
        <label>Renomear propriedade</label>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitRename();
              onClose();
            }
          }}
        />
      </div>
      <div className={`${styles.popoverMenuItem} ${styles.popoverMenuItemDanger}`} onClick={handleDelete}>
        Excluir propriedade
      </div>
    </Popover>
  );
}
