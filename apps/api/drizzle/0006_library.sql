CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hearing_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"position" integer NOT NULL,
	"lecture_id" integer NOT NULL,
	"minutes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lectures" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"speaker" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"position" integer NOT NULL,
	"book_id" integer NOT NULL,
	"chapter_or_section" text,
	"minutes" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hearing_sessions" ADD CONSTRAINT "hearing_sessions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hearing_sessions" ADD CONSTRAINT "hearing_sessions_lecture_id_lectures_id_fk" FOREIGN KEY ("lecture_id") REFERENCES "public"."lectures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "books_title_idx" ON "books" USING btree (lower("title"));--> statement-breakpoint
CREATE INDEX "hearing_sessions_entry_idx" ON "hearing_sessions" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "hearing_sessions_lecture_idx" ON "hearing_sessions" USING btree ("lecture_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lectures_title_speaker_idx" ON "lectures" USING btree (lower("title"),lower(coalesce("speaker", '')));--> statement-breakpoint
CREATE INDEX "reading_sessions_entry_idx" ON "reading_sessions" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "reading_sessions_book_idx" ON "reading_sessions" USING btree ("book_id");--> statement-breakpoint
INSERT INTO "books" ("title")
SELECT DISTINCT ON (lower(t.title)) t.title
FROM (SELECT trim(s->>'bookTitle') AS title FROM "entries", jsonb_array_elements("reading") AS s) t
WHERE t.title <> ''
ORDER BY lower(t.title), t.title;--> statement-breakpoint
INSERT INTO "lectures" ("title", "speaker", "source")
SELECT DISTINCT ON (lower(t.title), lower(coalesce(t.speaker, ''))) t.title, t.speaker, t.source
FROM (
  SELECT trim(s->>'lectureTitle') AS title, nullif(trim(s->>'speaker'), '') AS speaker, nullif(trim(s->>'source'), '') AS source
  FROM "entries", jsonb_array_elements("hearing") AS s
) t
WHERE t.title <> ''
ORDER BY lower(t.title), lower(coalesce(t.speaker, '')), t.title;--> statement-breakpoint
INSERT INTO "reading_sessions" ("entry_id", "position", "book_id", "chapter_or_section", "minutes")
SELECT e."id", s.ordinality - 1, b."id", nullif(trim(s.value->>'chapterOrSection'), ''), (s.value->>'minutes')::integer
FROM "entries" e
CROSS JOIN LATERAL jsonb_array_elements(e."reading") WITH ORDINALITY AS s(value, ordinality)
JOIN "books" b ON lower(b."title") = lower(trim(s.value->>'bookTitle'))
WHERE trim(s.value->>'bookTitle') <> '';--> statement-breakpoint
INSERT INTO "hearing_sessions" ("entry_id", "position", "lecture_id", "minutes")
SELECT e."id", s.ordinality - 1, l."id", (s.value->>'minutes')::integer
FROM "entries" e
CROSS JOIN LATERAL jsonb_array_elements(e."hearing") WITH ORDINALITY AS s(value, ordinality)
JOIN "lectures" l ON lower(l."title") = lower(trim(s.value->>'lectureTitle'))
  AND lower(coalesce(l."speaker", '')) = lower(coalesce(nullif(trim(s.value->>'speaker'), ''), ''))
WHERE trim(s.value->>'lectureTitle') <> '';--> statement-breakpoint
DELETE FROM "idempotency_keys";--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "reading";--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "hearing";