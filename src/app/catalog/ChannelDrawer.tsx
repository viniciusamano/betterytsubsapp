"use client";

import { useEffect } from "react";
import { colorFor, fmtBig, fmtInt, initials, statusLabel, statusOf } from "./format";
import type { Channel, Property } from "@/lib/catalog-types";
import styles from "./Catalog.module.css";

export function ChannelDrawer({
  channel,
  properties,
  onClose,
}: {
  channel: Channel;
  properties: Property[];
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const status = statusOf(channel.lastVideoPublishedAt);
  const sinceYear = channel.createdAtYoutube
    ? new Date(channel.createdAtYoutube).getFullYear()
    : null;

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHead}>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className={styles.drawerBody}>
          <div className={styles.drawerAvatar} style={{ background: colorFor(channel.name) }}>
            {initials(channel.name)}
          </div>
          <h2>{channel.name}</h2>
          <div className={styles.handle}>
            {channel.handle ? `@${channel.handle}` : "sem handle"}
            {sinceYear ? ` · no ar desde ${sinceYear}` : ""}
          </div>
          <div className={styles.badges}>
            <span className={`${styles.status} ${styles[status]}`}>
              <span className={styles.dot} />
              {statusLabel(status)}
            </span>
          </div>
          {channel.description && <div className={styles.desc}>{channel.description}</div>}

          <div className={styles.drawerGrid}>
            <div className={styles.box}>
              <div className={styles.boxN}>{fmtBig(channel.subscriberCount)}</div>
              <div className={styles.boxL}>Inscritos</div>
            </div>
            <div className={styles.box}>
              <div className={styles.boxN}>{fmtInt(channel.videoCount)}</div>
              <div className={styles.boxL}>Vídeos</div>
            </div>
            <div className={styles.box}>
              <div className={styles.boxN}>{fmtBig(channel.viewCount)}</div>
              <div className={styles.boxL}>Views totais</div>
            </div>
            <div className={styles.box}>
              <div className={styles.boxN}>{sinceYear ?? "—"}</div>
              <div className={styles.boxL}>No ar desde</div>
            </div>
          </div>

          {properties.length > 0 && (
            <>
              <h3>Propriedades</h3>
              {properties.map((p) => {
                const v = channel.values[p.id];
                let display: React.ReactNode = <span className={styles.cellPlaceholder}>—</span>;
                if (p.type === "multi_select" || p.type === "select") {
                  const opts = (v?.optionIds ?? [])
                    .map((id) => p.options.find((o) => o.id === id))
                    .filter((o): o is NonNullable<typeof o> => Boolean(o));
                  if (opts.length > 0) {
                    display = (
                      <>
                        {opts.map((o) => (
                          <span key={o.id} className={styles.chipTag}>
                            <span className={styles.dot} style={{ background: o.color }} />
                            {o.label}
                          </span>
                        ))}
                      </>
                    );
                  }
                } else if (p.type === "checkbox") {
                  display = v?.bool ? "Sim" : "Não";
                } else if (v?.text != null) {
                  display = v.text;
                } else if (v?.number != null) {
                  display = fmtInt(v.number);
                }
                return (
                  <div key={p.id} className={styles.propRow}>
                    <span className={styles.pl}>{p.name}</span>
                    <span className={styles.pv}>{display}</span>
                  </div>
                );
              })}
              <div className={styles.drawerNote}>Edite as propriedades direto na tabela.</div>
            </>
          )}

          <div className={styles.drawerFoot}>
            {channel.handle && (
              <a
                className={`${styles.btn} ${styles.btnPrimary}`}
                href={`https://www.youtube.com/@${encodeURIComponent(channel.handle)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir no YouTube
              </a>
            )}
            <button className={styles.btn} disabled title="Disponível na Fase 2">
              Cancelar inscrição
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
