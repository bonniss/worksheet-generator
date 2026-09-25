CREATE TABLE "ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"run_id" uuid,
	"purpose" text NOT NULL,
	"worksheet_id" uuid,
	"level" text,
	"type" text,
	"model" text NOT NULL,
	"max_tokens" integer NOT NULL,
	"prompt_chars" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cache_read_tokens" integer,
	"cache_write_tokens" integer,
	"stop_reason" text,
	"duration_ms" integer,
	"ttft_ms" integer,
	"status" text NOT NULL,
	"error_type" text,
	"http_status" integer,
	"request_id" text,
	"cost_usd" numeric(12, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_worksheet_id_worksheets_id_fk" FOREIGN KEY ("worksheet_id") REFERENCES "public"."worksheets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_calls_user_created_idx" ON "ai_calls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_calls_created_idx" ON "ai_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_calls_run_idx" ON "ai_calls" USING btree ("run_id");