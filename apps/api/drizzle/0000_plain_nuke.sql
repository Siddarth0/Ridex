CREATE TYPE "public"."cancelled_by" AS ENUM('rider', 'driver', 'system');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('license', 'registration', 'insurance', 'profile_photo');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('pending', 'approved', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('ride_fare', 'commission', 'driver_payout', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash');--> statement-breakpoint
CREATE TYPE "public"."ride_status" AS ENUM('searching', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."ride_type" AS ENUM('bike', 'car', 'premium');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('rider', 'driver', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_token_purpose" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by" uuid,
	"user_agent" text,
	"ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" "user_token_purpose" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'rider' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "driver_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" varchar(255),
	"mime_type" varchar(100),
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"license_number" varchar(50) NOT NULL,
	"status" "driver_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"is_online" boolean DEFAULT false NOT NULL,
	"rating_avg" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "drivers_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"ride_type" "ride_type" NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer,
	"plate_number" varchar(20) NOT NULL,
	"color" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_plate_number_unique" UNIQUE("plate_number")
);
--> statement-breakpoint
CREATE TABLE "ride_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"from_status" "ride_status",
	"to_status" "ride_status" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"driver_id" uuid,
	"vehicle_id" uuid,
	"ride_type" "ride_type" NOT NULL,
	"status" "ride_status" DEFAULT 'searching' NOT NULL,
	"pickup_address" text NOT NULL,
	"pickup_lat" double precision NOT NULL,
	"pickup_lng" double precision NOT NULL,
	"destination_address" text NOT NULL,
	"destination_lat" double precision NOT NULL,
	"destination_lng" double precision NOT NULL,
	"distance_m" integer,
	"duration_s" integer,
	"estimated_fare" numeric(10, 2),
	"final_fare" numeric(10, 2),
	"surge_multiplier" numeric(4, 2) DEFAULT 1 NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"currency" varchar(3) DEFAULT 'NPR' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" "cancelled_by",
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fare_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_type" "ride_type" NOT NULL,
	"base_fare" numeric(10, 2) NOT NULL,
	"per_km" numeric(10, 2) NOT NULL,
	"per_min" numeric(10, 2) NOT NULL,
	"min_fare" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NPR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fare_configs_ride_type_unique" UNIQUE("ride_type")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid,
	"user_id" uuid NOT NULL,
	"type" "ledger_entry_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'NPR' NOT NULL,
	"method" "payment_method" DEFAULT 'cash' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tokens_user_purpose_idx" ON "user_tokens" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "driver_documents_driver_idx" ON "driver_documents" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "drivers_status_idx" ON "drivers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ride_events_ride_idx" ON "ride_events" USING btree ("ride_id");--> statement-breakpoint
CREATE INDEX "rides_rider_idx" ON "rides" USING btree ("rider_id","created_at");--> statement-breakpoint
CREATE INDEX "rides_driver_idx" ON "rides" USING btree ("driver_id","created_at");--> statement-breakpoint
CREATE INDEX "rides_status_idx" ON "rides" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "ledger_entries_user_idx" ON "ledger_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ledger_entries_ride_idx" ON "ledger_entries" USING btree ("ride_id");