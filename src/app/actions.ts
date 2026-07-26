"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { properties, propertyOptions, channelPropertyValues } from "@/db/schema";
import { syncChannels } from "@/lib/sync-channels";
import { TAG_COLORS, type PropertyType } from "@/lib/catalog-types";

async function upsertValue(
  channelId: string,
  propertyId: string,
  patch: {
    valueOptionIds?: string[] | null;
    valueText?: string | null;
    valueNumber?: number | null;
    valueBool?: boolean | null;
  },
) {
  await db
    .insert(channelPropertyValues)
    .values({ channelId, propertyId, ...patch })
    .onConflictDoUpdate({
      target: [channelPropertyValues.channelId, channelPropertyValues.propertyId],
      set: patch,
    });
}

async function getValue(channelId: string, propertyId: string) {
  const [row] = await db
    .select()
    .from(channelPropertyValues)
    .where(
      and(
        eq(channelPropertyValues.channelId, channelId),
        eq(channelPropertyValues.propertyId, propertyId),
      ),
    )
    .limit(1);
  return row;
}

export async function toggleTagValue(
  channelId: string,
  propertyId: string,
  optionId: string,
) {
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  if (!prop) return;

  const existing = await getValue(channelId, propertyId);
  const current = existing?.valueOptionIds ?? [];
  const next =
    prop.type === "select"
      ? current.includes(optionId)
        ? []
        : [optionId]
      : current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];

  await upsertValue(channelId, propertyId, { valueOptionIds: next });
  revalidatePath("/");
}

export async function createAndAssignOption(
  channelId: string,
  propertyId: string,
  label: string,
) {
  const trimmed = label.trim();
  if (!trimmed) return;

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);
  if (!prop) return;

  const existingOptions = await db
    .select()
    .from(propertyOptions)
    .where(eq(propertyOptions.propertyId, propertyId));
  const color = TAG_COLORS[existingOptions.length % TAG_COLORS.length];
  const [option] = await db
    .insert(propertyOptions)
    .values({ propertyId, label: trimmed, color })
    .returning();

  const existingValue = await getValue(channelId, propertyId);
  const current = existingValue?.valueOptionIds ?? [];
  const next = prop.type === "select" ? [option.id] : [...current, option.id];
  await upsertValue(channelId, propertyId, { valueOptionIds: next });
  revalidatePath("/");
}

export async function deletePropertyOption(optionId: string, propertyId: string) {
  await db.delete(propertyOptions).where(eq(propertyOptions.id, optionId));
  // valueOptionIds is a plain array column, not a join table — the FK
  // cascade on property_options doesn't reach into it, so every channel's
  // stored selection needs the dangling id stripped out by hand.
  await db
    .update(channelPropertyValues)
    .set({
      valueOptionIds: sql`array_remove(${channelPropertyValues.valueOptionIds}, ${optionId})`,
    })
    .where(eq(channelPropertyValues.propertyId, propertyId));
  revalidatePath("/");
}

export async function setTextValue(channelId: string, propertyId: string, value: string) {
  const trimmed = value.trim();
  await upsertValue(channelId, propertyId, { valueText: trimmed === "" ? null : trimmed });
  revalidatePath("/");
}

export async function setNumberValue(channelId: string, propertyId: string, value: string) {
  const trimmed = value.trim();
  await upsertValue(channelId, propertyId, {
    valueNumber: trimmed === "" ? null : Number(trimmed),
  });
  revalidatePath("/");
}

export async function toggleBoolValue(channelId: string, propertyId: string, current: boolean) {
  await upsertValue(channelId, propertyId, { valueBool: !current });
  revalidatePath("/");
}

export async function createProperty(name: string, type: PropertyType) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.insert(properties).values({ name: trimmed, type });
  revalidatePath("/");
}

export async function renameProperty(propertyId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.update(properties).set({ name: trimmed }).where(eq(properties.id, propertyId));
  revalidatePath("/");
}

export async function deleteProperty(propertyId: string) {
  await db.delete(properties).where(eq(properties.id, propertyId));
  revalidatePath("/");
}

export async function runSync(limit: number) {
  const result = await syncChannels(limit);
  revalidatePath("/");
  return result;
}
