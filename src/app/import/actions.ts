"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { channels } from "@/db/schema";
import { parseTakeoutSubscriptions } from "@/lib/parse-takeout";

export type ImportResult =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; imported: number; sample: string[] };

export async function importTakeoutCsv(
  _prevState: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message:
        "Selecione o arquivo subscriptions.csv exportado pelo Google Takeout.",
    };
  }

  const text = await file.text();

  let rows;
  try {
    rows = parseTakeoutSubscriptions(text);
  } catch {
    return {
      status: "error",
      message:
        "Não consegui ler esse arquivo como CSV. Confirma que é o subscriptions.csv do Google Takeout (YouTube e YouTube Music → Inscrições).",
    };
  }

  if (rows.length === 0) {
    return {
      status: "error",
      message: "O arquivo não tem nenhuma linha de canal reconhecível.",
    };
  }

  // Upsert by channel id: re-importing an updated export refreshes the name
  // without touching stats a previous sync may have already filled in.
  try {
    await db
      .insert(channels)
      .values(rows.map((row) => ({ id: row.channelId, name: row.channelTitle })))
      .onConflictDoUpdate({
        target: channels.id,
        set: { name: sql`excluded.name` },
      });
  } catch (error) {
    // Surfaced verbatim on purpose while we're bringing the first deploy up —
    // this is what tells us whether DATABASE_URL is missing, malformed, or
    // the database is unreachable, instead of a blank framework error page.
    return {
      status: "error",
      message: `Erro ao gravar no banco: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return {
    status: "success",
    imported: rows.length,
    sample: rows.slice(0, 5).map((row) => row.channelTitle),
  };
}
