CREATE TYPE "public"."visibility" AS ENUM('private', 'public');--> statement-breakpoint
ALTER TABLE "worksheets" ADD COLUMN "visibility" "visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
CREATE INDEX "worksheets_visibility_updated_idx" ON "worksheets" USING btree ("visibility","updated_at");