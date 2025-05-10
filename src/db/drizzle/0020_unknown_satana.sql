CREATE TABLE "favicons" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"hash" varchar(64) NOT NULL,
	"r2_key" text NOT NULL,
	"domain" varchar(253) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "favicons_hash_unique" UNIQUE("hash"),
	CONSTRAINT "favicons_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "favicons_unique_hash_index" ON "favicons" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "favicons_unique_domain_index" ON "favicons" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "bookmark_collection_id_index" ON "bookmarks" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "bookmark_deleted_at_index" ON "bookmarks" USING btree ("deleted_at");--> statement-breakpoint
ALTER TABLE "collections" DROP COLUMN "is_deleted";