export type Status = "good" | "warn" | "bad" | "unknown";

const AVATAR_PALETTE = [
  "#E2664F",
  "#E3A83C",
  "#8FD16F",
  "#5FB8C9",
  "#B98FE0",
  "#E08FC0",
  "#C9C15F",
  "#8FA8E0",
];

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function relTime(iso: string | null): string {
  if (!iso) return "nunca sincronizado";
  const d = daysSince(iso);
  if (d < 1) return "hoje";
  if (d === 1) return "há 1 dia";
  if (d < 30) return `há ${d} dias`;
  const m = Math.floor(d / 30);
  if (m < 12) return `há ${m} ${m === 1 ? "mês" : "meses"}`;
  const y = Math.floor(m / 12);
  return `há ${y} ${y === 1 ? "ano" : "anos"}`;
}

export function statusOf(iso: string | null): Status {
  if (!iso) return "unknown";
  const d = daysSince(iso);
  if (d <= 30) return "good";
  if (d <= 180) return "warn";
  return "bad";
}

export function statusLabel(s: Status): string {
  if (s === "good") return "Ativo";
  if (s === "warn") return "Esfriando";
  if (s === "bad") return "Inativo";
  return "Sem dados";
}

export function fmtBig(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return n.toLocaleString("pt-BR");
}

export function fmtInt(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

export function initials(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  if (clean.length === 0 || clean[0] === "") return "?";
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase();
  return (clean[0][0] + clean[1][0]).toUpperCase();
}

export function colorFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}
