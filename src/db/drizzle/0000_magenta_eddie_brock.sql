CREATE TABLE "bookmark_tags" (
	"bookmark_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "bookmark_tags_bookmark_id_tag_id_pk" PRIMARY KEY("bookmark_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"favicon_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"collection_id" uuid,
	"deleted_at" timestamp with time zone DEFAULT null,
	"is_metadata_pending" boolean NOT NULL,
	"tsv" "tsvector"
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" uuid,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"tsv" "tsvector"
);
--> statement-breakpoint
CREATE TABLE "favicons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"hash" varchar(64) NOT NULL,
	"r2_key" text NOT NULL,
	"domain" varchar(253) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favicons_hash_unique" UNIQUE("hash"),
	CONSTRAINT "favicons_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"tsv" "tsvector"
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visible_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"profile_picture" varchar(255),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_bookmark_id_bookmarks_id_fk" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_favicon_id_favicons_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."favicons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_parent_id_collections_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_tsv_index" ON "bookmarks" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "bookmark_user_id_index" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookmark_collection_id_index" ON "bookmarks" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "bookmark_deleted_at_index" ON "bookmarks" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "bookmark_favicon_id_index" ON "bookmarks" USING btree ("favicon_id");--> statement-breakpoint
CREATE INDEX "collection_user_id_index" ON "collections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "collections_tsv_index" ON "collections" USING gin ("tsv");--> statement-breakpoint
CREATE UNIQUE INDEX "favicons_unique_hash_index" ON "favicons" USING btree ("hash");--> statement-breakpoint
CREATE UNIQUE INDEX "favicons_unique_domain_index" ON "favicons" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "session_user_id_index" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_tag_per_user" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "tags_tsv_index" ON "tags" USING gin ("tsv");--> statement-breakpoint
CREATE UNIQUE INDEX "emailUniqueIndex" ON "users" USING btree ("email");