ALTER TABLE "bookmarks" ADD COLUMN "faviconUrl" varchar(255);--> statement-breakpoint
CREATE INDEX "bookmark_user_id_index" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collection_user_id_index" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "sessions" USING btree ("user_id");