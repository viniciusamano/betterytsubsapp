import { db } from "@/db";
import {
  channels,
  properties,
  propertyOptions,
  channelPropertyValues,
} from "@/db/schema";
import type { Channel, ChannelValue, Property, PropertyOption } from "./catalog-types";

export async function getCatalog(): Promise<{
  channels: Channel[];
  properties: Property[];
}> {
  const [channelRows, propertyRows, optionRows, valueRows] = await Promise.all([
    db.select().from(channels),
    db.select().from(properties).orderBy(properties.createdAt),
    db.select().from(propertyOptions),
    db.select().from(channelPropertyValues),
  ]);

  const optionsByProperty = new Map<string, PropertyOption[]>();
  for (const o of optionRows) {
    const list = optionsByProperty.get(o.propertyId) ?? [];
    list.push({ id: o.id, label: o.label, color: o.color });
    optionsByProperty.set(o.propertyId, list);
  }

  // Creation order matters here: the UI picks the first select/multi_select
  // property to drive the chip filter row, mirroring how "Segmento" is meant
  // to behave as the first property without being hardcoded as special.
  const propertiesOut: Property[] = propertyRows.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    aiSuggested: p.aiSuggested,
    options: optionsByProperty.get(p.id) ?? [],
  }));

  const valuesByChannel = new Map<string, Record<string, ChannelValue>>();
  for (const v of valueRows) {
    const rec = valuesByChannel.get(v.channelId) ?? {};
    rec[v.propertyId] = {
      optionIds: v.valueOptionIds,
      text: v.valueText,
      number: v.valueNumber,
      bool: v.valueBool,
    };
    valuesByChannel.set(v.channelId, rec);
  }

  const channelsOut: Channel[] = channelRows.map((c) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    description: c.description,
    subscriberCount: c.subscriberCount,
    videoCount: c.videoCount,
    viewCount: c.viewCount,
    lastVideoPublishedAt: c.lastVideoPublishedAt
      ? c.lastVideoPublishedAt.toISOString()
      : null,
    createdAtYoutube: c.createdAtYoutube ? c.createdAtYoutube.toISOString() : null,
    syncedAt: c.syncedAt ? c.syncedAt.toISOString() : null,
    values: valuesByChannel.get(c.id) ?? {},
  }));

  return { channels: channelsOut, properties: propertiesOut };
}
