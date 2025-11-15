-- Migration: Add smart matching system for lost and found items
-- Run this in Supabase SQL Editor

-- Create matches table to store potential matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lost_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[], -- Array of reasons why items match (e.g., ['category', 'location', 'keywords'])
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(lost_item_id, found_item_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_matches_lost_item ON matches(lost_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_item ON matches(found_item_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop if exists to make migration idempotent)
-- Users can view matches for their own items
DROP POLICY IF EXISTS "Users can view matches for their items" ON matches;
CREATE POLICY "Users can view matches for their items"
  ON matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = matches.lost_item_id
      AND items.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = matches.found_item_id
      AND items.user_id = auth.uid()
    )
  );

-- System can create matches (via function)
DROP POLICY IF EXISTS "System can create matches" ON matches;
CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  WITH CHECK (true);

-- Users can update match status for their items
DROP POLICY IF EXISTS "Users can update match status" ON matches;
CREATE POLICY "Users can update match status"
  ON matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = matches.lost_item_id
      AND items.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = matches.found_item_id
      AND items.user_id = auth.uid()
    )
  );

-- Function to calculate match score between two items
CREATE OR REPLACE FUNCTION calculate_match_score(
  p_lost_item_id UUID,
  p_found_item_id UUID
)
RETURNS TABLE (
  score DECIMAL,
  reasons TEXT[]
) AS $$
DECLARE
  v_lost_item RECORD;
  v_found_item RECORD;
  v_score DECIMAL := 0;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_category_match BOOLEAN := false;
  v_keyword_match BOOLEAN := false;
  v_location_match BOOLEAN := false;
  v_date_match BOOLEAN := false;
  v_distance_km DECIMAL;
BEGIN
  -- Get lost item details
  SELECT * INTO v_lost_item
  FROM items
  WHERE id = p_lost_item_id AND category = 'lost';

  -- Get found item details
  SELECT * INTO v_found_item
  FROM items
  WHERE id = p_found_item_id AND category = 'found';

  -- If either item doesn't exist or wrong category, return 0
  IF v_lost_item IS NULL OR v_found_item IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL, ARRAY[]::TEXT[];
    RETURN;
  END IF;

  -- Check category/item_type match (30 points)
  IF v_lost_item.item_type IS NOT NULL 
     AND v_found_item.item_type IS NOT NULL 
     AND v_lost_item.item_type = v_found_item.item_type THEN
    v_score := v_score + 30;
    v_reasons := array_append(v_reasons, 'category');
    v_category_match := true;
  END IF;

  -- Check keyword match in title/description (40 points)
  -- Simple keyword matching - check if words from lost item appear in found item
  IF v_lost_item.title IS NOT NULL AND v_found_item.title IS NOT NULL THEN
    -- Convert to lowercase and check for common words
    IF LOWER(v_lost_item.title) = LOWER(v_found_item.title) THEN
      v_score := v_score + 40;
      v_keyword_match := true;
    ELSIF v_lost_item.description IS NOT NULL AND v_found_item.description IS NOT NULL THEN
      -- Check for common words (simple approach)
      -- Split titles into words and check for matches
      IF (
        SELECT COUNT(*) > 0
        FROM unnest(string_to_array(LOWER(v_lost_item.title), ' ')) AS lost_word
        WHERE lost_word != '' 
        AND LENGTH(lost_word) > 3
        AND (
          LOWER(v_found_item.title) LIKE '%' || lost_word || '%'
          OR LOWER(v_found_item.description) LIKE '%' || lost_word || '%'
        )
      ) THEN
        v_score := v_score + 30;
        v_keyword_match := true;
      END IF;
    END IF;
    
    IF v_keyword_match THEN
      v_reasons := array_append(v_reasons, 'keywords');
    END IF;
  END IF;

  -- Check location proximity (20 points)
  IF v_lost_item.latitude IS NOT NULL 
     AND v_lost_item.longitude IS NOT NULL
     AND v_found_item.latitude IS NOT NULL 
     AND v_found_item.longitude IS NOT NULL THEN
    
    -- Calculate distance using Haversine formula (simplified)
    v_distance_km := (
      6371 * acos(
        cos(radians(v_lost_item.latitude)) *
        cos(radians(v_found_item.latitude)) *
        cos(radians(v_found_item.longitude) - radians(v_lost_item.longitude)) +
        sin(radians(v_lost_item.latitude)) *
        sin(radians(v_found_item.latitude))
      )
    );

    -- Award points based on distance
    IF v_distance_km <= 1 THEN -- Within 1km
      v_score := v_score + 20;
      v_location_match := true;
    ELSIF v_distance_km <= 5 THEN -- Within 5km
      v_score := v_score + 15;
      v_location_match := true;
    ELSIF v_distance_km <= 10 THEN -- Within 10km
      v_score := v_score + 10;
      v_location_match := true;
    ELSIF v_distance_km <= 25 THEN -- Within 25km
      v_score := v_score + 5;
      v_location_match := true;
    END IF;

    IF v_location_match THEN
      v_reasons := array_append(v_reasons, 'location');
    END IF;
  ELSIF v_lost_item.location IS NOT NULL 
        AND v_found_item.location IS NOT NULL
        AND LOWER(v_lost_item.location) = LOWER(v_found_item.location) THEN
    -- Exact location match (text-based)
    v_score := v_score + 15;
    v_reasons := array_append(v_reasons, 'location');
    v_location_match := true;
  END IF;

  -- Check date proximity (10 points)
  -- Items posted within 7 days get points
  IF ABS(EXTRACT(EPOCH FROM (v_found_item.created_at - v_lost_item.created_at)) / 86400) <= 7 THEN
    v_score := v_score + 10;
    v_reasons := array_append(v_reasons, 'date');
    v_date_match := true;
  END IF;

  -- Cap score at 100
  IF v_score > 100 THEN
    v_score := 100;
  END IF;

  -- Only return matches with score >= 30 (minimum threshold)
  IF v_score >= 30 THEN
    RETURN QUERY SELECT v_score, v_reasons;
  ELSE
    RETURN QUERY SELECT 0::DECIMAL, ARRAY[]::TEXT[];
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to find and create matches for a new item
CREATE OR REPLACE FUNCTION find_matches_for_item(p_item_id UUID)
RETURNS void AS $$
DECLARE
  v_item RECORD;
  v_match_item RECORD;
  v_match_result RECORD;
  v_match_score DECIMAL;
  v_reasons TEXT[];
BEGIN
  -- Get the item
  SELECT * INTO v_item FROM items WHERE id = p_item_id;
  
  IF v_item IS NULL THEN
    RETURN;
  END IF;

  -- If it's a lost item, find matching found items
  IF v_item.category = 'lost' THEN
    FOR v_match_item IN 
      SELECT * FROM items
      WHERE category = 'found'
      AND status = 'active'
      AND id != p_item_id
      AND user_id != v_item.user_id
    LOOP
      -- Calculate match score
      SELECT * INTO v_match_result
      FROM calculate_match_score(p_item_id, v_match_item.id);
      
      v_match_score := v_match_result.score;
      v_reasons := v_match_result.reasons;

      -- Insert match if score is high enough
      IF v_match_score >= 30 THEN
        INSERT INTO matches (lost_item_id, found_item_id, match_score, match_reasons)
        VALUES (p_item_id, v_match_item.id, v_match_score, v_reasons)
        ON CONFLICT (lost_item_id, found_item_id) DO UPDATE
        SET match_score = EXCLUDED.match_score,
            match_reasons = EXCLUDED.match_reasons,
            updated_at = NOW();
      END IF;
    END LOOP;
  -- If it's a found item, find matching lost items
  ELSIF v_item.category = 'found' THEN
    FOR v_match_item IN 
      SELECT * FROM items
      WHERE category = 'lost'
      AND status = 'active'
      AND id != p_item_id
      AND user_id != v_item.user_id
    LOOP
      -- Calculate match score
      SELECT * INTO v_match_result
      FROM calculate_match_score(v_match_item.id, p_item_id);
      
      v_match_score := v_match_result.score;
      v_reasons := v_match_result.reasons;

      -- Insert match if score is high enough
      IF v_match_score >= 30 THEN
        INSERT INTO matches (lost_item_id, found_item_id, match_score, match_reasons)
        VALUES (v_match_item.id, p_item_id, v_match_score, v_reasons)
        ON CONFLICT (lost_item_id, found_item_id) DO UPDATE
        SET match_score = EXCLUDED.match_score,
            match_reasons = EXCLUDED.match_reasons,
            updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to find matches when a new item is created
DROP TRIGGER IF EXISTS find_matches_on_item_insert ON items;
CREATE TRIGGER find_matches_on_item_insert
  AFTER INSERT ON items
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION find_matches_for_item(NEW.id);

-- Trigger to update matches when item is updated (e.g., location added)
DROP TRIGGER IF EXISTS find_matches_on_item_update ON items;
CREATE TRIGGER find_matches_on_item_update
  AFTER UPDATE ON items
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND (
    OLD.latitude IS DISTINCT FROM NEW.latitude OR
    OLD.longitude IS DISTINCT FROM NEW.longitude OR
    OLD.location IS DISTINCT FROM NEW.location OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description
  ))
  EXECUTE FUNCTION find_matches_for_item(NEW.id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_updated_at();

-- Add comment
COMMENT ON TABLE matches IS 'Smart matches between lost and found items';

