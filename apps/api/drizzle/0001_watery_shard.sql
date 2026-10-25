ALTER TABLE "accounts" ALTER COLUMN "phone" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_phone_idx" ON "accounts" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_idx" ON "accounts" USING btree ("email");