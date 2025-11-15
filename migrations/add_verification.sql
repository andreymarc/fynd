-- Migration: Add verification system to items
-- Run this in your Supabase SQL Editor

-- Add verification columns to items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_photos TEXT[];

-- Create verifications table for tracking verification requests
CREATE TABLE IF NOT EXISTS verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verification_photos TEXT[] NOT NULL,
  verification_notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(item_id)
);

-- Enable RLS on verifications
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Verifications policies (drop if exists to make migration idempotent)
DROP POLICY IF EXISTS "Anyone can view verifications" ON verifications;
CREATE POLICY "Anyone can view verifications"
  ON verifications FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create verification requests" ON verifications;
CREATE POLICY "Users can create verification requests"
  ON verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Item owners can update their verification requests" ON verifications;
CREATE POLICY "Item owners can update their verification requests"
  ON verifications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Function to update item verification status when verification is approved
CREATE OR REPLACE FUNCTION update_item_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE items 
    SET 
      verified = true,
      verification_status = 'approved',
      verification_photos = NEW.verification_photos
    WHERE id = NEW.item_id;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE items 
    SET 
      verified = false,
      verification_status = 'rejected'
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update item verification status
DROP TRIGGER IF EXISTS update_item_verification_trigger ON verifications;
CREATE TRIGGER update_item_verification_trigger
AFTER UPDATE ON verifications
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_item_verification();

