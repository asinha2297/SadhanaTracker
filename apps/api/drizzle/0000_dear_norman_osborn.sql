CREATE SEQUENCE "public"."devotee_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 200 CACHE 1;--> statement-breakpoint
CREATE TABLE "accounts" (
	"devotee_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"pending" boolean DEFAULT false NOT NULL,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"password_hash" text NOT NULL,
	"group_id" text,
	"joined_at" date NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"time_zone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"subject" text,
	"details" text
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"devotee_id" text NOT NULL,
	"local_date" date NOT NULL,
	"rounds" integer NOT NULL,
	"reflection" text,
	"reading" jsonb NOT NULL,
	"hearing" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"coordinator_id" text NOT NULL,
	"can_review_records" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"devotee_id" text NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommended_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"effective_date" date NOT NULL,
	"rounds" integer NOT NULL,
	"reading_minutes" integer NOT NULL,
	"hearing_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"devotee_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"time" text DEFAULT '21:00' NOT NULL,
	"time_zone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"channel" text DEFAULT 'IN_APP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reset_requests" (
	"devotee_id" text PRIMARY KEY NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "target_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"devotee_id" text NOT NULL,
	"effective_date" date NOT NULL,
	"kind" text NOT NULL,
	"rounds" integer,
	"reading_minutes" integer,
	"hearing_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_devotee_id_accounts_devotee_id_fk" FOREIGN KEY ("devotee_id") REFERENCES "public"."accounts"("devotee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_devotee_id_accounts_devotee_id_fk" FOREIGN KEY ("devotee_id") REFERENCES "public"."accounts"("devotee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_devotee_id_accounts_devotee_id_fk" FOREIGN KEY ("devotee_id") REFERENCES "public"."accounts"("devotee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_requests" ADD CONSTRAINT "reset_requests_devotee_id_accounts_devotee_id_fk" FOREIGN KEY ("devotee_id") REFERENCES "public"."accounts"("devotee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "target_choices" ADD CONSTRAINT "target_choices_devotee_id_accounts_devotee_id_fk" FOREIGN KEY ("devotee_id") REFERENCES "public"."accounts"("devotee_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entries_devotee_date_idx" ON "entries" USING btree ("devotee_id","local_date");