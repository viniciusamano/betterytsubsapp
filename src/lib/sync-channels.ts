import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { channels } from "@/db/schema";

type YoutubeChannelItem = {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    customUrl?: string;
  };
  statistics: {
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
  };
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchChannelBatch(ids: string[], apiKey: string): Promise<YoutubeChannelItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { items?: YoutubeChannelItem[] };
  return data.items ?? [];
}

// Free (no quota, no API key) — the first <entry> in a channel's public
// upload feed is its most recent video. The feed itself also carries a
// top-level <published> (the channel's creation date, not a video) before
// any <entry> — matching <published> against the whole document picks that
// one up instead, so the date must come from inside the first <entry>.
async function fetchLastVideoDate(channelId: string): Promise<Date | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
    );
    if (!res.ok) return null;
    const xml = await res.text();
    const entryMatch = xml.match(/<entry>[\s\S]*?<\/entry>/);
    if (!entryMatch) return null;
    const publishedMatch = entryMatch[0].match(/<published>([^<]+)<\/published>/);
    return publishedMatch ? new Date(publishedMatch[1]) : null;
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

export type SyncResult = {
  total: number;
  synced: number;
  errors: string[];
};

/**
 * Refreshes stats + last-video-published-at for up to `limit` channels
 * already in the database. Deliberately capped by default: a full 500+
 * channel catalog needs a background function (see docs/roadmap.md, Fase 1
 * item 7) — a plain serverless function will time out well before that.
 */
export async function syncChannels(limit = 25): Promise<SyncResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY não configurada.");
  }

  // Never-synced channels first (nulls first), then whoever was synced
  // longest ago — so repeated calls make progress across the whole catalog
  // instead of refreshing the same rows, and a future daily run naturally
  // refreshes the stalest channels first.
  const targets = await db
    .select({ id: channels.id })
    .from(channels)
    .orderBy(sql`${channels.syncedAt} asc nulls first`)
    .limit(limit);

  const ids = targets.map((c) => c.id);
  const errors: string[] = [];
  let synced = 0;

  for (const batch of chunk(ids, 50)) {
    let items: YoutubeChannelItem[];
    try {
      items = await fetchChannelBatch(batch, apiKey);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    const lastVideoDates = await mapWithConcurrency(items, 10, (item) =>
      fetchLastVideoDate(item.id),
    );

    await Promise.all(
      items.map(async (item, i) => {
        try {
          await db
            .update(channels)
            .set({
              name: item.snippet.title,
              handle: item.snippet.customUrl ?? null,
              description: item.snippet.description,
              subscriberCount: item.statistics.subscriberCount
                ? Number(item.statistics.subscriberCount)
                : null,
              videoCount: item.statistics.videoCount
                ? Number(item.statistics.videoCount)
                : null,
              viewCount: item.statistics.viewCount
                ? Number(item.statistics.viewCount)
                : null,
              createdAtYoutube: new Date(item.snippet.publishedAt),
              lastVideoPublishedAt: lastVideoDates[i],
              syncedAt: new Date(),
            })
            .where(eq(channels.id, item.id));
          synced++;
        } catch (error) {
          // Drizzle wraps driver errors in a DrizzleQueryError whose own
          // .message is just the raw SQL + params; the actual reason (e.g. a
          // Postgres constraint or type error) lives in .cause.
          const cause =
            error instanceof Error && error.cause instanceof Error
              ? error.cause
              : error;
          errors.push(
            `${item.id}: ${cause instanceof Error ? cause.message : String(cause)}`,
          );
        }
      }),
    );
  }

  return { total: ids.length, synced, errors };
}
