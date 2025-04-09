ALTER TABLE "bookmarks" RENAME COLUMN "keywords[]" TO "tags[]";--> statement-breakpoint
DROP INDEX "bookmark_search_index";--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "deleted_at" timestamp with time zone NOT NULL;--> statement-breakpoint
CREATE INDEX "bookmark_search_index" ON "bookmarks" USING gin (to_tsvector('english', "title" || ' ' || "description"));--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "is_deleted";--> statement-breakpoint
ALTER TABLE "bookmarks" DROP COLUMN "is_public";