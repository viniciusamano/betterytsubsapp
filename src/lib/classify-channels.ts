import Anthropic from "@anthropic-ai/sdk";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { channels, properties, propertyOptions, channelPropertyValues } from "@/db/schema";
import { TAG_COLORS } from "./catalog-types";

const SEGMENT_PROPERTY_NAME = "Segmento";
const BATCH_SIZE = 30;

async function ensureSegmentProperty() {
  const [existing] = await db
    .select()
    .from(properties)
    .where(eq(properties.name, SEGMENT_PROPERTY_NAME))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(properties)
    .values({ name: SEGMENT_PROPERTY_NAME, type: "multi_select", aiSuggested: true })
    .returning();
  return created;
}

type ChannelForClassification = { id: string; name: string; description: string | null };
type ClassificationResult = { channelId: string; label: string };

const RESULT_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          channelId: { type: "string" },
          label: { type: "string" },
        },
        required: ["channelId", "label"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
} as const;

async function classifyBatch(
  client: Anthropic,
  batch: ChannelForClassification[],
  existingLabels: string[],
): Promise<ClassificationResult[]> {
  const channelList = batch
    .map((c) => `- id: ${c.id}\n  nome: ${c.name}\n  descrição: ${(c.description ?? "").slice(0, 300)}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: RESULT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content:
          `Classifique cada canal do YouTube abaixo em um segmento/categoria de conteúdo ` +
          `(ex: "Ciência", "Tecnologia", "Música", "Games", "Culinária", "Finanças").\n\n` +
          `Sempre que um dos rótulos já existentes abaixo descrever bem o canal, reutilize o rótulo ` +
          `EXATAMENTE como está escrito. Só proponha um rótulo novo (curto, 1 a 3 palavras, em português) ` +
          `quando nenhum existente servir.\n\n` +
          `Rótulos já existentes: ${existingLabels.length > 0 ? existingLabels.join(", ") : "(nenhum ainda)"}\n\n` +
          `Canais:\n${channelList}\n\n` +
          `Responda com um resultado por canal, na mesma ordem, usando o channelId exato fornecido.`,
      },
    ],
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  if (!textBlock) return [];
  const parsed = JSON.parse(textBlock.text) as { results: ClassificationResult[] };
  return parsed.results;
}

export type ClassifyResult = { total: number; classified: number; errors: string[] };

/**
 * AI segment classification (docs/roadmap.md, Fase 1 item 5): only runs for
 * channels with no value yet on the "Segmento" property, so it never
 * overwrites a manual edit. Capped by `limit` per call, same pattern as
 * syncChannels — a full catalog needs several calls.
 */
export async function classifySegments(limit = 30): Promise<ClassifyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  const property = await ensureSegmentProperty();

  const targets: ChannelForClassification[] = await db
    .select({ id: channels.id, name: channels.name, description: channels.description })
    .from(channels)
    .leftJoin(
      channelPropertyValues,
      and(
        eq(channelPropertyValues.channelId, channels.id),
        eq(channelPropertyValues.propertyId, property.id),
      ),
    )
    .where(isNull(channelPropertyValues.channelId))
    .limit(limit);

  const errors: string[] = [];
  let classified = 0;
  if (targets.length === 0) {
    return { total: 0, classified: 0, errors };
  }

  const client = new Anthropic({ apiKey });

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    try {
      const existingOptions = await db
        .select()
        .from(propertyOptions)
        .where(eq(propertyOptions.propertyId, property.id));
      const existingLabels = existingOptions.map((o) => o.label);
      const results = await classifyBatch(client, batch, existingLabels);

      for (const result of results) {
        const label = result.label.trim();
        if (!label) continue;

        let option = existingOptions.find((o) => o.label.toLowerCase() === label.toLowerCase());
        if (!option) {
          const color = TAG_COLORS[existingOptions.length % TAG_COLORS.length];
          const [created] = await db
            .insert(propertyOptions)
            .values({ propertyId: property.id, label, color })
            .returning();
          option = created;
          existingOptions.push(created);
        }

        await db
          .insert(channelPropertyValues)
          .values({ channelId: result.channelId, propertyId: property.id, valueOptionIds: [option.id] })
          .onConflictDoUpdate({
            target: [channelPropertyValues.channelId, channelPropertyValues.propertyId],
            set: { valueOptionIds: [option.id] },
          });
        classified++;
      }
    } catch (error) {
      const cause =
        error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
      const message = error instanceof Error ? error.message : String(error);
      errors.push((cause ?? message).slice(0, 300));
    }
  }

  return { total: targets.length, classified, errors };
}
