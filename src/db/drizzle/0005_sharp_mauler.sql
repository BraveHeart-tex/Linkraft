ALTER TABLE "bookmarks" ADD COLUMN "favicon_id" uuid;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_favicon_id_favicons_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."favicons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "favicon_url";