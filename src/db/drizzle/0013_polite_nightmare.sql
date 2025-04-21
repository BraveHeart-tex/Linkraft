ALTER TABLE "bookmark_collection" DROP CONSTRAINT "bookmark_collection_bookmark_id_bookmarks_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmark_collection" DROP CONSTRAINT "bookmark_collection_collection_id_collections_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmarks_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "bookmark_collection" ADD CONSTRAINT "bookmark_collection_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_collection" ADD CONSTRAINT "bookmark_collection_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;