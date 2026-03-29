-- Add nights and isPotluck fields to Event
ALTER TABLE "Event" ADD COLUMN "nights" INTEGER;
ALTER TABLE "Event" ADD COLUMN "isPotluck" BOOLEAN NOT NULL DEFAULT false;
