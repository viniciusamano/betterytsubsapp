"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { runClassification, runSync } from "@/app/actions";
import type { Channel, Property } from "@/lib/catalog-types";
import { colorFor, fmtBig, fmtInt, initials, relTime, statusLabel, statusOf, type Status } from "./format";
import { PropertyCell } from "./PropertyCell";
import { TagPopover } from "./TagPopover";
import { NewPropertyPopover } from "./NewPropertyPopover";
import { PropertyMenuPopover } from "./PropertyMenuPopover";
import { ChannelDrawer } from "./ChannelDrawer";
import styles from "./Catalog.module.css";

type CoreColumnId = "videos" | "views" | "last" | "since";
const CORE_COLUMNS: { id: CoreColumnId; label: string }[] = [
  { id: "videos", label: "Vídeos" },
  { id: "views", label: "Views totais" },
  { id: "last", label: "Último vídeo" },
  { id: "since", label: "Canal desde" },
];

type SortKey = "channel" | "subs" | CoreColumnId;

type PopoverState =
  | { kind: "tag"; channelId: string; propertyId: string; anchorEl: HTMLElement }
  | { kind: "newProperty"; anchorEl: HTMLElement }
  | { kind: "propertyMenu"; propertyId: string; anchorEl: HTMLElement };

export function Catalog({ channels, properties }: { channels: Channel[]; properties: Property[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("subs");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hiddenProperties, setHiddenProperties] = useState<Set<string>>(new Set());
  const [hiddenCore, setHiddenCore] = useState<Set<CoreColumnId>>(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [isSyncing, startSync] = useTransition();
  const [isClassifying, startClassify] = useTransition();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [classifyMessage, setClassifyMessage] = useState<string | null>(null);
  const columnsWrapRef = useRef<HTMLDivElement>(null);

  const chipsProperty = properties.find((p) => p.type === "multi_select" || p.type === "select") ?? null;

  useEffect(() => {
    if (!columnsOpen) return;
    function handleClick(e: MouseEvent) {
      if (columnsWrapRef.current && !columnsWrapRef.current.contains(e.target as Node)) {
        setColumnsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [columnsOpen]);

  const filtered = useMemo(() => {
    const rows = channels.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const inName = c.name.toLowerCase().includes(q);
        const inHandle = (c.handle ?? "").toLowerCase().includes(q);
        if (!inName && !inHandle) return false;
      }
      if (statusFilter !== "all" && statusOf(c.lastVideoPublishedAt) !== statusFilter) return false;
      if (chipsProperty && selectedOptionIds.size > 0) {
        const vals = c.values[chipsProperty.id]?.optionIds ?? [];
        if (!vals.some((id) => selectedOptionIds.has(id))) return false;
      }
      return true;
    });

    return rows.slice().sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      let va: number | string | null;
      let vb: number | string | null;
      if (sortKey === "channel") {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else if (sortKey === "subs") {
        va = a.subscriberCount;
        vb = b.subscriberCount;
      } else if (sortKey === "videos") {
        va = a.videoCount;
        vb = b.videoCount;
      } else if (sortKey === "views") {
        va = a.viewCount;
        vb = b.viewCount;
      } else if (sortKey === "since") {
        va = a.createdAtYoutube;
        vb = b.createdAtYoutube;
      } else {
        va = a.lastVideoPublishedAt;
        vb = b.lastVideoPublishedAt;
      }
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [channels, search, statusFilter, chipsProperty, selectedOptionIds, sortKey, sortDir]);

  const inactiveCount = channels.filter((c) => statusOf(c.lastVideoPublishedAt) === "bad").length;
  const syncedCount = channels.filter((c) => c.syncedAt).length;
  const lastSync = channels.reduce<string | null>((max, c) => {
    if (!c.syncedAt) return max;
    if (!max || c.syncedAt > max) return c.syncedAt;
    return max;
  }, null);

  const chipCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!chipsProperty) return counts;
    for (const c of channels) {
      for (const id of c.values[chipsProperty.id]?.optionIds ?? []) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }, [channels, chipsProperty]);

  const visibleProperties = properties.filter((p) => !hiddenProperties.has(p.id));
  const visibleCore = CORE_COLUMNS.filter((c) => !hiddenCore.has(c.id));
  const totalColCount = 5 + visibleProperties.length + visibleCore.length;
  const openDrawerChannel = openDrawerId ? channels.find((c) => c.id === openDrawerId) ?? null : null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "channel" ? "asc" : "desc");
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of filtered) {
        if (checked) next.add(c.id);
        else next.delete(c.id);
      }
      return next;
    });
  }

  function toggleSegmentChip(optionId: string | null) {
    if (optionId === null) {
      setSelectedOptionIds(new Set());
      return;
    }
    setSelectedOptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  }

  function toggleHiddenProperty(id: string) {
    setHiddenProperties((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleHiddenCore(id: CoreColumnId) {
    setHiddenCore((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv(rows: Channel[], filename: string) {
    const head = [
      "Canal",
      "Handle",
      ...properties.map((p) => p.name),
      "Inscritos",
      "Vídeos",
      "Views totais",
      "Último vídeo",
      "Status",
    ];
    const lines = [head.join(",")];
    for (const c of rows) {
      const line: (string | number)[] = [c.name, c.handle ? `@${c.handle}` : ""];
      for (const p of properties) {
        const v = c.values[p.id];
        let out = "";
        if (p.type === "multi_select" || p.type === "select") {
          out = (v?.optionIds ?? [])
            .map((id) => p.options.find((o) => o.id === id)?.label)
            .filter((label): label is string => Boolean(label))
            .join("; ");
        } else if (p.type === "checkbox") {
          out = v?.bool ? "Sim" : "Não";
        } else {
          out = v?.text ?? (v?.number != null ? String(v.number) : "");
        }
        line.push(out);
      }
      line.push(
        c.subscriberCount ?? "",
        c.videoCount ?? "",
        c.viewCount ?? "",
        c.lastVideoPublishedAt ?? "",
        statusLabel(statusOf(c.lastVideoPublishedAt)),
      );
      lines.push(
        line
          .map((val) => {
            const s = String(val);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return <span className={styles.arrow}>▼</span>;
    return <span className={`${styles.arrow} ${styles.arrowActive}`}>{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  function rowActions(c: Channel) {
    return (
      <div className={styles.rowActions}>
        {c.handle && (
          <a
            className={styles.iconBtn}
            href={`https://www.youtube.com/@${encodeURIComponent(c.handle)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no YouTube"
          >
            ↗
          </a>
        )}
        <button className={styles.iconBtn} onClick={() => setOpenDrawerId(c.id)} title="Ver perfil">
          ◎
        </button>
        <button className={styles.iconBtn} disabled title="Cancelar inscrição — chega na Fase 2">
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.appbar}>
        <div className={styles.titleblock}>
          <h1>Meus Canais</h1>
          <div className={styles.sub}>{channels.length} canais no catálogo</div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.btn}
            disabled={isSyncing}
            onClick={() =>
              startSync(async () => {
                setSyncMessage(null);
                const result = await runSync(50);
                const errorNote = result.errors.length > 0 ? ` — ${result.errors.length} erro(s): ${result.errors[0]}` : "";
                setSyncMessage(`${result.synced} de ${result.total} sincronizados${errorNote}`);
              })
            }
          >
            {isSyncing ? "Sincronizando…" : "Sincronizar"}
          </button>
          <button
            className={styles.btn}
            disabled={isClassifying}
            onClick={() =>
              startClassify(async () => {
                setClassifyMessage(null);
                const result = await runClassification(30);
                const errorNote = result.errors.length > 0 ? ` — ${result.errors.length} erro(s): ${result.errors[0]}` : "";
                setClassifyMessage(`${result.classified} de ${result.total} classificados${errorNote}`);
              })
            }
          >
            {isClassifying ? "Classificando…" : "Classificar com IA"}
          </button>
        </div>
      </header>

      {(syncMessage || classifyMessage) && (
        <div className={styles.actionFeedback}>
          {syncMessage && <div>Sincronizar: {syncMessage}</div>}
          {classifyMessage && <div>Classificar: {classifyMessage}</div>}
        </div>
      )}

      <div className={styles.statusbar}>
        <div className={styles.sbCell}>
          <span className={styles.sbDot} />
          SISTEMA ATIVO
        </div>
        <div className={styles.sbCell}>{syncedCount} DE {channels.length} SINCRONIZADOS</div>
        <div className={styles.sbCell}>ÚLTIMA SYNC · {relTime(lastSync).toUpperCase()}</div>
      </div>

      <div className={styles.statsStrip}>
        <div className={styles.statPill}>
          <div className={styles.n}>{channels.length}</div>
          <div className={styles.l}>Canais no catálogo</div>
        </div>
        <div className={`${styles.statPill} ${styles.statPillBad}`}>
          <div className={styles.n}>{inactiveCount}</div>
          <div className={styles.l}>Inativos há +6 meses</div>
        </div>
        {chipsProperty && (
          <div className={styles.statPill}>
            <div className={styles.n}>{chipsProperty.options.length}</div>
            <div className={styles.l}>{chipsProperty.name}s</div>
          </div>
        )}
        <div className={styles.statPill}>
          <div className={styles.n}>{properties.length}</div>
          <div className={styles.l}>Propriedades ativas</div>
        </div>
      </div>

      {chipsProperty && (
        <div className={styles.chips}>
          <span className={styles.chipsLabel}>{chipsProperty.name}</span>
          <button
            className={`${styles.chip} ${selectedOptionIds.size === 0 ? styles.chipActive : ""}`}
            onClick={() => toggleSegmentChip(null)}
          >
            Todos <span className={styles.c}>{channels.length}</span>
          </button>
          {chipsProperty.options.map((o) => (
            <button
              key={o.id}
              className={`${styles.chip} ${selectedOptionIds.has(o.id) ? styles.chipActive : ""}`}
              onClick={() => toggleSegmentChip(o.id)}
            >
              <span className={styles.dot} style={{ background: o.color }} />
              {o.label} <span className={styles.c}>{chipCounts.get(o.id) ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <input
            type="text"
            placeholder="Buscar por nome ou @handle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | Status)}
        >
          <option value="all">Status: todos</option>
          <option value="good">Ativos</option>
          <option value="warn">Esfriando</option>
          <option value="bad">Inativos</option>
          <option value="unknown">Sem dados</option>
        </select>
        <div className={styles.spacer} />
        <div className={styles.dropdownWrap} ref={columnsWrapRef}>
          <button className={styles.btn} onClick={() => setColumnsOpen((v) => !v)}>
            Colunas
          </button>
          {columnsOpen && (
            <div className={styles.dropdownPanel}>
              <div className={styles.grp}>Propriedades</div>
              {properties.length === 0 && <div className={styles.cellPlaceholder}>Nenhuma ainda</div>}
              {properties.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={!hiddenProperties.has(p.id)}
                    onChange={() => toggleHiddenProperty(p.id)}
                  />
                  {p.name}
                </label>
              ))}
              <div className={styles.grp}>Dados do YouTube</div>
              {CORE_COLUMNS.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={!hiddenCore.has(c.id)}
                    onChange={() => toggleHiddenCore(c.id)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button className={styles.btn} onClick={() => exportCsv(filtered, "meus-canais.csv")}>
          Exportar CSV
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((c) => selected.has(c.id))}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th className={sortKey === "channel" ? styles.sorted : ""} onClick={() => toggleSort("channel")}>
                Canal {sortArrow("channel")}
              </th>
              {visibleProperties.map((p) => (
                <th key={p.id}>
                  <span className={styles.thWithMenu}>
                    {p.name}
                    {p.aiSuggested && (
                      <span className={styles.aiTag} title="Sugerido por IA — edite à vontade">
                        IA
                      </span>
                    )}
                    <button
                      className={styles.thMenuBtn}
                      onClick={(e) => setPopover({ kind: "propertyMenu", propertyId: p.id, anchorEl: e.currentTarget })}
                      aria-label={`Opções de ${p.name}`}
                    >
                      ⋮
                    </button>
                  </span>
                </th>
              ))}
              <th className={`${styles.num} ${sortKey === "subs" ? styles.sorted : ""}`} onClick={() => toggleSort("subs")}>
                Inscritos {sortArrow("subs")}
              </th>
              {visibleCore.map((c) => (
                <th
                  key={c.id}
                  className={`${c.id !== "last" ? styles.num : ""} ${sortKey === c.id ? styles.sorted : ""}`}
                  onClick={() => toggleSort(c.id)}
                >
                  {c.label} {sortArrow(c.id)}
                </th>
              ))}
              <th>Ações</th>
              <th className={styles.plusTh}>
                <button
                  className={styles.plusBtnTh}
                  onClick={(e) => setPopover({ kind: "newProperty", anchorEl: e.currentTarget })}
                  title="Nova propriedade"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={totalColCount} className={styles.emptyState}>
                  Nenhum canal encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const status = statusOf(c.lastVideoPublishedAt);
                return (
                  <tr key={c.id}>
                    <td>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} />
                    </td>
                    <td>
                      <div className={styles.channelCell}>
                        <div className={styles.avatar} style={{ background: colorFor(c.name) }}>
                          {initials(c.name)}
                        </div>
                        <div className={styles.meta}>
                          <button className={styles.channelName} onClick={() => setOpenDrawerId(c.id)}>
                            {c.name}
                          </button>
                          <br />
                          <span className={styles.channelHandle}>{c.handle ? `@${c.handle}` : "—"}</span>
                        </div>
                      </div>
                    </td>
                    {visibleProperties.map((p) => (
                      <td key={p.id}>
                        <PropertyCell
                          channel={c}
                          property={p}
                          onOpenTagPopover={(e) =>
                            setPopover({ kind: "tag", channelId: c.id, propertyId: p.id, anchorEl: e.currentTarget })
                          }
                        />
                      </td>
                    ))}
                    <td className={styles.num}>{fmtBig(c.subscriberCount)}</td>
                    {visibleCore.map((col) => {
                      if (col.id === "videos") return <td key={col.id} className={styles.num}>{fmtInt(c.videoCount)}</td>;
                      if (col.id === "views") return <td key={col.id} className={styles.num}>{fmtBig(c.viewCount)}</td>;
                      if (col.id === "since") {
                        const year = c.createdAtYoutube ? new Date(c.createdAtYoutube).getFullYear() : null;
                        return (
                          <td key={col.id} className={styles.num}>
                            {year ?? "—"}
                          </td>
                        );
                      }
                      return (
                        <td key={col.id}>
                          <span className={`${styles.status} ${styles[status]}`}>
                            <span className={styles.dot} />
                            {statusLabel(status)}
                            <span className={styles.rel}> · {relTime(c.lastVideoPublishedAt)}</span>
                          </span>
                        </td>
                      );
                    })}
                    <td>{rowActions(c)}</td>
                    <td />
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={totalColCount}>
                {filtered.length} de {channels.length} canais exibidos
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className={styles.cardList}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>Nenhum canal encontrado com esses filtros.</div>
        ) : (
          filtered.map((c) => {
            const status = statusOf(c.lastVideoPublishedAt);
            return (
              <div key={c.id} className={styles.channelCard}>
                <div className={styles.ccTop}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} />
                  <div className={styles.avatar} style={{ background: colorFor(c.name) }}>
                    {initials(c.name)}
                  </div>
                  <div className={styles.ccMeta}>
                    <button className={styles.channelName} onClick={() => setOpenDrawerId(c.id)}>
                      {c.name}
                    </button>
                    <br />
                    <span className={styles.channelHandle}>{c.handle ? `@${c.handle}` : "—"}</span>
                  </div>
                  {rowActions(c)}
                </div>
                <div className={styles.ccStatusRow}>
                  <span className={`${styles.status} ${styles[status]}`}>
                    <span className={styles.dot} />
                    {statusLabel(status)}
                    <span className={styles.rel}> · {relTime(c.lastVideoPublishedAt)}</span>
                  </span>
                </div>
                <div className={styles.ccProps}>
                  {visibleProperties.map((p) => (
                    <PropertyCell
                      key={p.id}
                      channel={c}
                      property={p}
                      onOpenTagPopover={(e) =>
                        setPopover({ kind: "tag", channelId: c.id, propertyId: p.id, anchorEl: e.currentTarget })
                      }
                    />
                  ))}
                </div>
                <div className={styles.ccStats}>
                  <div>
                    <span className={styles.csn}>{fmtBig(c.subscriberCount)}</span>
                    <span className={styles.csl}>Inscritos</span>
                  </div>
                  <div>
                    <span className={styles.csn}>{fmtInt(c.videoCount)}</span>
                    <span className={styles.csl}>Vídeos</span>
                  </div>
                  <div>
                    <span className={styles.csn}>{fmtBig(c.viewCount)}</span>
                    <span className={styles.csl}>Views</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className={styles.note}>
        Clique em qualquer tag, texto ou número da tabela pra editar. Use o &quot;+&quot; no cabeçalho pra criar novas
        propriedades.
      </footer>

      <div className={`${styles.bulkbar} ${selected.size > 0 ? styles.bulkbarOpen : ""}`}>
        <span>
          <span className={styles.bulkCount}>{selected.size}</span> selecionados
        </span>
        <button
          className={`${styles.btn} ${styles.btnSmall}`}
          onClick={() => exportCsv(channels.filter((c) => selected.has(c.id)), "canais-selecionados.csv")}
        >
          Exportar
        </button>
        <button className={`${styles.btn} ${styles.btnSmall}`} disabled title="Disponível na Fase 2">
          Cancelar inscrição
        </button>
        <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => setSelected(new Set())}>
          Cancelar
        </button>
      </div>

      {openDrawerChannel && (
        <ChannelDrawer channel={openDrawerChannel} properties={properties} onClose={() => setOpenDrawerId(null)} />
      )}

      {popover?.kind === "tag" &&
        (() => {
          const channel = channels.find((c) => c.id === popover.channelId);
          const property = properties.find((p) => p.id === popover.propertyId);
          if (!channel || !property) return null;
          return (
            <TagPopover
              channel={channel}
              property={property}
              anchorEl={popover.anchorEl}
              onClose={() => setPopover(null)}
            />
          );
        })()}
      {popover?.kind === "newProperty" && (
        <NewPropertyPopover anchorEl={popover.anchorEl} onClose={() => setPopover(null)} />
      )}
      {popover?.kind === "propertyMenu" &&
        (() => {
          const property = properties.find((p) => p.id === popover.propertyId);
          if (!property) return null;
          return (
            <PropertyMenuPopover property={property} anchorEl={popover.anchorEl} onClose={() => setPopover(null)} />
          );
        })()}
    </div>
  );
}
