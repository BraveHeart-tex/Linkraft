ALTER TABLE "bookmark_collection" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "bookmark_collection" CASCADE;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "collection_id" integer;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;