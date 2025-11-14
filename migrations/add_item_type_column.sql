-- Migration: Add item_type column to items table
-- Run this in your Supabase SQL Editor

-- Add item_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'item_type'
    ) THEN
        ALTER TABLE items 
        ADD COLUMN item_type TEXT CHECK (
            item_type IN (
                'electronics', 
                'clothing', 
                'keys', 
                'pets', 
                'jewelry', 
                'books', 
                'wallet', 
                'accessories', 
                'vehicles', 
                'sports', 
                'toys', 
                'other'
            )
        );
        
        RAISE NOTICE 'Column item_type added successfully';
    ELSE
        RAISE NOTICE 'Column item_type already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'items' 
AND column_name = 'item_type';

