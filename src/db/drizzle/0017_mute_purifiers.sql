DROP INDEX "bookmark_search_index";--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "tsv" "tsvector";--> statement-breakpoint
CREATE INDEX "bookmarks_tsv_index" ON "bookmarks" USING gin ("tsv");