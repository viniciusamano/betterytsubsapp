"use client";

import { useTransition, useState } from "react";
import { setNumberValue, setTextValue, toggleBoolValue } from "@/app/actions";
import type { Channel, Property } from "@/lib/catalog-types";
import { fmtInt } from "./format";
import styles from "./Catalog.module.css";

export function PropertyCell({
  channel,
  property,
  onOpenTagPopover,
}: {
  channel: Channel;
  property: Property;
  onOpenTagPopover: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const v = channel.values[property.id];

  if (property.type === "multi_select" || property.type === "select") {
    const opts = (v?.optionIds ?? [])
      .map((id) => property.options.find((o) => o.id === id))
      .filter((o): o is NonNullable<typeof o> => Boolean(o));
    return (
      <div className={styles.cellEditable} onClick={onOpenTagPopover}>
        {opts.length > 0 ? (
          opts.map((o) => (
            <span key={o.id} className={styles.chipTag}>
              <span className={styles.dot} style={{ background: o.color }} />
              {o.label}
            </span>
          ))
        ) : (
          <span className={styles.cellPlaceholder}>+ adicionar</span>
        )}
      </div>
    );
  }

  if (property.type === "checkbox") {
    return (
      <div
        className={styles.cellEditable}
        onClick={() => {
          startTransition(async () => {
            await toggleBoolValue(channel.id, property.id, Boolean(v?.bool));
          });
        }}
      >
        <input type="checkbox" checked={Boolean(v?.bool)} readOnly style={{ pointerEvents: "none" }} />
      </div>
    );
  }

  function commit(value: string) {
    setEditing(false);
    startTransition(async () => {
      if (property.type === "number") await setNumberValue(channel.id, property.id, value);
      else await setTextValue(channel.id, property.id, value);
    });
  }

  if (editing) {
    const initial = property.type === "number" ? (v?.number?.toString() ?? "") : (v?.text ?? "");
    return (
      <input
        className={styles.cellInput}
        type={property.type === "number" ? "number" : "text"}
        placeholder={property.type === "link" ? "https://…" : ""}
        defaultValue={initial}
        autoFocus
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  if (property.type === "link") {
    return (
      <div className={styles.cellEditable} onClick={() => setEditing(true)}>
        {v?.text ? (
          <span className={styles.chipTag}>🔗 {v.text.length > 24 ? `${v.text.slice(0, 24)}…` : v.text}</span>
        ) : (
          <span className={styles.cellPlaceholder}>+ adicionar</span>
        )}
      </div>
    );
  }

  if (property.type === "number") {
    return (
      <div
        className={styles.cellEditable}
        style={{ justifyContent: "flex-end", fontFamily: "var(--font-mono)" }}
        onClick={() => setEditing(true)}
      >
        {v?.number != null ? fmtInt(v.number) : <span className={styles.cellPlaceholder}>—</span>}
      </div>
    );
  }

  return (
    <div className={styles.cellEditable} onClick={() => setEditing(true)}>
      {v?.text ? v.text : <span className={styles.cellPlaceholder}>+ adicionar</span>}
    </div>
  );
}
