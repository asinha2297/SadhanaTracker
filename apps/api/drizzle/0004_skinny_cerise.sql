ALTER TABLE "accounts" DROP CONSTRAINT "accounts_group_id_groups_id_fk";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "pending";--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "group_id";--> statement-breakpoint
DROP TABLE "groups" CASCADE;