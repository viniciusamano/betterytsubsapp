import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { Catalog } from "./catalog/Catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { channels, properties } = await getCatalog();

  if (channels.length === 0) {
    return (
      <main style={{ maxWidth: 640, margin: "0 auto", padding: "64px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, textTransform: "uppercase" }}>
          Meus Canais
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: 12 }}>
          Ainda não há canais importados. Comece exportando sua lista de
          inscrições do Google Takeout.
        </p>
        <Link
          href="/import"
          style={{
            display: "inline-block",
            marginTop: 20,
            padding: "10px 16px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Importar inscrições
        </Link>
      </main>
    );
  }

  return <Catalog channels={channels} properties={properties} />;
}
