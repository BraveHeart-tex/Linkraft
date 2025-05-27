ALTER TABLE "bookmarks" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookmarks" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp;