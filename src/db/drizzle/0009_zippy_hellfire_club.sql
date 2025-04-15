ALTER TABLE "bookmarks" ALTER COLUMN "deleted_at" SET DEFAULT null;--> statement-breakpoint
ALTER TABLE "bookmarks" ALTER COLUMN "deleted_at" DROP NOT NULL;