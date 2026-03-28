-- Add mapEmbed column to Event for Google Maps iframe embed URLs
ALTER TABLE "Event" ADD COLUMN "mapEmbed" TEXT;
