CREATE TYPE "public"."offer_status" AS ENUM('offered', 'accepted', 'declined', 'expired', 'superseded');--> statement-breakpoint
CREATE TABLE "driver_locations" (
	"driver_id" uuid PRIMARY KEY NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"heading" smallint,
	"speed_kmh" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid NOT NULL,
	"rater_user_id" uuid NOT NULL,
	"ratee_user_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_ride_rater_uq" UNIQUE("ride_id","rater_user_id")
);
--> statement-breakpoint
CREATE TABLE "ride_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ride_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"status" "offer_status" DEFAULT 'offered' NOT NULL,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ride_offers_ride_driver_uq" UNIQUE("ride_id","driver_id")
);
--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "route_polyline" text;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "search_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_user_id_users_id_fk" FOREIGN KEY ("rater_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratee_user_id_users_id_fk" FOREIGN KEY ("ratee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_ride_id_rides_id_fk" FOREIGN KEY ("ride_id") REFERENCES "public"."rides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "driver_locations_lat_lng_idx" ON "driver_locations" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "ratings_ratee_idx" ON "ratings" USING btree ("ratee_user_id");--> statement-breakpoint
CREATE INDEX "ride_offers_status_idx" ON "ride_offers" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "ride_offers_driver_idx" ON "ride_offers" USING btree ("driver_id","status");