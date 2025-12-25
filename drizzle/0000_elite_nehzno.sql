CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"nodes" jsonb NOT NULL,
	"edges" jsonb NOT NULL,
	"initial_context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_node" text NOT NULL,
	"context" jsonb NOT NULL,
	"conversation_history" jsonb DEFAULT '[]'::jsonb,
	"node_states" jsonb DEFAULT '{}'::jsonb,
	"last_error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid NOT NULL,
	"node_id" text,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_execution_workflow" ON "workflow_executions" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "idx_execution_status" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_execution_started" ON "workflow_executions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_log_execution" ON "execution_logs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "idx_log_level" ON "execution_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_log_timestamp" ON "execution_logs" USING btree ("timestamp");