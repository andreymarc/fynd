-- Migration: Add latitude and longitude columns to items table for map view
-- Run this in Supabase SQL Editor

-- Add latitude and longitude columns
ALTER TABLE items
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add index for faster geospatial queries
CREATE INDEX IF NOT EXISTS idx_items_location ON items(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment to columns
COMMENT ON COLUMN items.latitude IS 'Latitude coordinate for map display';
COMMENT ON COLUMN items.longitude IS 'Longitude coordinate for map display';

