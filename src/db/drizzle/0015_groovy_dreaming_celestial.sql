ALTER TABLE "collections" ADD COLUMN "tsv" "tsvector";--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "tsv" "tsvector";--> statement-breakpoint
CREATE INDEX "collections_tsv_index" ON "collections" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "tags_tsv_index" ON "tags" USING gin ("tsv");