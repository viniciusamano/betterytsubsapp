"use client";

import { useState, useTransition } from "react";
import { createAndAssignOption, deletePropertyOption, toggleTagValue } from "@/app/actions";
import type { Channel, Property } from "@/lib/catalog-types";
import { Popover } from "./Popover";
import styles from "./Catalog.module.css";

export function TagPopover({
  channel,
  property,
  anchorEl,
  onClose,
}: {
  channel: Channel;
  property: Property;
  anchorEl: HTMLElement;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const selected = channel.values[property.id]?.optionIds ?? [];
  const q = query.trim().toLowerCase();
  const matches = property.options.filter((o) => o.label.toLowerCase().includes(q));
  const exact = property.options.some((o) => o.label.toLowerCase() === q);

  function toggle(optionId: string) {
    startTransition(async () => {
      await toggleTagValue(channel.id, property.id, optionId);
    });
    if (property.type === "select") onClose();
  }

  function createTag() {
    const label = query.trim();
    if (!label) return;
    startTransition(async () => {
      await createAndAssignOption(channel.id, property.id, label);
    });
    setQuery("");
    if (property.type === "select") onClose();
  }

  function removeOption(optionId: string) {
    startTransition(async () => {
      await deletePropertyOption(optionId, property.id);
    });
  }

  return (
    <Popover anchorEl={anchorEl} onClose={onClose} className={styles.popover}>
      <div className={styles.popoverSearch}>
        <input
          type="text"
          placeholder="Buscar ou criar tag…"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim() && !exact) createTag();
          }}
        />
      </div>
      <div className={styles.popoverList}>
        {matches.length === 0 && !query && (
          <div className={styles.popoverEmpty}>Nenhuma tag ainda. Digite pra criar a primeira.</div>
        )}
        {matches.map((o) => {
          const isSelected = selected.includes(o.id);
          return (
            <div
              key={o.id}
              className={`${styles.popoverOption} ${isSelected ? styles.popoverOptionSelected : ""}`}
              onClick={() => toggle(o.id)}
            >
              <span className={styles.dot} style={{ background: o.color }} />
              <span className={styles.popoverOptionLabel}>{o.label}</span>
              {isSelected && <span className={styles.popoverCheck}>✓</span>}
              <span
                className={styles.popoverDel}
                onClick={(e) => {
                  e.stopPropagation();
                  removeOption(o.id);
                }}
                title="Excluir tag"
              >
                ✕
              </span>
            </div>
          );
        })}
      </div>
      {query && !exact && (
        <>
          <div className={styles.popoverDivider} />
          <div className={styles.popoverCreate} onClick={createTag}>
            + Criar tag &quot;{query}&quot;
          </div>
        </>
      )}
    </Popover>
  );
}
