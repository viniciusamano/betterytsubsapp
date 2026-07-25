CREATE TYPE "public"."property_type" AS ENUM('multi_select', 'select', 'text', 'number', 'checkbox', 'link');--> statement-breakpoint
CREATE TABLE "channel_property_values" (
	"channel_id" text NOT NULL,
	"property_id" uuid NOT NULL,
	"value_option_ids" uuid[],
	"value_text" text,
	"value_number" integer,
	"value_bool" boolean,
	CONSTRAINT "channel_property_values_channel_id_property_id_pk" PRIMARY KEY("channel_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"handle" text,
	"description" text,
	"subscriber_count" integer,
	"video_count" integer,
	"view_count" integer,
	"last_video_published_at" timestamp with time zone,
	"created_at_youtube" timestamp with time zone,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "property_type" NOT NULL,
	"ai_suggested" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_property_values" ADD CONSTRAINT "channel_property_values_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_property_values" ADD CONSTRAINT "channel_property_values_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_options" ADD CONSTRAINT "property_options_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;