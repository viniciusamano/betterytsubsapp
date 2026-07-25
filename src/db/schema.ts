import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";

// A channel is seeded from a Google Takeout export and enriched by the sync
// job (see docs/youtube-api.md). Stats/last-video fields are nullable because
// a freshly-imported channel has no stats until the first sync runs.
export const channels = pgTable("channels", {
  id: text("id").primaryKey(), // YouTube channel id, e.g. "UC..."
  name: text("name").notNull(),
  handle: text("handle"),
  description: text("description"),
  subscriberCount: integer("subscriber_count"),
  videoCount: integer("video_count"),
  viewCount: integer("view_count"),
  lastVideoPublishedAt: timestamp("last_video_published_at", {
    withTimezone: true,
  }),
  createdAtYoutube: timestamp("created_at_youtube", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const propertyTypeEnum = pgEnum("property_type", [
  "multi_select",
  "select",
  "text",
  "number",
  "checkbox",
  "link",
]);

// User-defined columns (Notion-style). "Segmento" is seeded as the first row
// here with aiSuggested=true, but nothing in the app treats it specially —
// renaming, deleting, or adding new properties works the same way for all of
// them. See docs/architecture.md and prototype/channel-catalog.html (the
// in-memory reference implementation of this exact model).
export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  type: propertyTypeEnum("type").notNull(),
  aiSuggested: boolean("ai_suggested").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Only populated for "select" / "multi_select" properties — each tag a user
// can create inside a property (e.g. "Ciência", "Tecnologia" under "Segmento").
export const propertyOptions = pgTable("property_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  color: text("color").notNull(),
});

// One row per (channel, property). Only the column matching the property's
// type is populated; the rest stay null.
export const channelPropertyValues = pgTable(
  "channel_property_values",
  {
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    valueOptionIds: uuid("value_option_ids").array(), // select / multi_select
    valueText: text("value_text"), // text / link
    valueNumber: integer("value_number"), // number
    valueBool: boolean("value_bool"), // checkbox
  },
  (table) => [primaryKey({ columns: [table.channelId, table.propertyId] })],
);
