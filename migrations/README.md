# Database Migrations

This folder contains SQL migration scripts for updating your Supabase database schema.

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of the migration file
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Check the output for success messages

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

Or run the SQL file directly:

```bash
supabase db execute --file migrations/add_item_type_column.sql
```

## Migration Files

### `add_item_type_column.sql`
- **Purpose**: Adds `item_type` column to `items` table for category filtering
- **Date**: Created when categories feature was added
- **Safe to run**: Yes - checks if column exists before adding

## Notes

- All migrations are idempotent (safe to run multiple times)
- Migrations check for existing columns/tables before creating
- Always backup your database before running migrations in production

