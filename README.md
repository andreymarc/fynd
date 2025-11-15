# Fynd - Lost & Found App

A mobile-friendly web application for posting and finding lost items, built with React and Supabase.

## Features

- 🔐 User authentication (sign up/login)
- 📝 Post lost or found items with images
- 🔍 Search and filter items
- 📱 Fully responsive mobile-first design
- 🖼️ Image upload and storage
- 📍 Location tracking with auto-detection
- 💬 Contact information sharing
- ✅ Claim system - Users can claim items they found
- 🎯 Mark items as resolved when returned
- 🚫 Prevent duplicate claims
- 🏷️ Categories/Tags - Predefined categories (Electronics, Clothing, Keys, Pets, etc.)
- 🔍 Filter by category for better organization and discovery
- ✅ Item Verification - Verified items badge, photo verification, trust indicators
- 🛡️ Fraud Prevention - Verification system reduces fraudulent listings
- ⚡ Real-time Updates - Live feed when new items are posted (disabled by default to avoid costs - can be enabled)
- 🔄 Manual Refresh - Refresh button to check for new items
- 💬 Direct Messaging - Private chat between item owners and claimers
- 📨 Message Notifications - Unread message counts and read receipts
- 👤 User Profiles - Public profiles with stats, success rate, and trust indicators
- 🔔 Notifications System - In-app notifications for claims, messages, and item updates
- 🎯 Smart Matching - Auto-suggest matches between lost and found items based on category, keywords, location, and date

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Real-time)
- **Routing**: React Router v6
- **Icons**: Lucide React

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Create Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Create items table
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('lost', 'found')),
  item_type TEXT CHECK (item_type IN ('electronics', 'clothing', 'keys', 'pets', 'jewelry', 'books', 'wallet', 'accessories', 'vehicles', 'sports', 'toys', 'other')),
  location TEXT,
  image_url TEXT,
  contact_info TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
  verified BOOLEAN DEFAULT false,
  verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active items"
  ON items FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can insert their own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
  ON items FOR DELETE
  USING (auth.uid() = user_id);

-- Create claims table
CREATE TABLE claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  claimed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(item_id, claimed_by_user_id)
);

-- Enable RLS on claims
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Claims policies
CREATE POLICY "Anyone can view claims"
  ON claims FOR SELECT
  USING (true);

CREATE POLICY "Users can create claims"
  ON claims FOR INSERT
  WITH CHECK (auth.uid() = claimed_by_user_id);

CREATE POLICY "Item owners can update claims"
  ON claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = claims.item_id
      AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own claims"
  ON claims FOR DELETE
  USING (auth.uid() = claimed_by_user_id);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_messages_item_id ON messages(item_id);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() = receiver_id
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can mark received messages as read"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('claim', 'claim_approved', 'claim_rejected', 'message', 'item_resolved', 'verification_approved', 'verification_rejected')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Storage policies
CREATE POLICY "Anyone can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/     # Reusable components
├── pages/         # Page components
├── lib/           # Utilities (Supabase client)
├── types/         # TypeScript types
├── App.tsx        # Main app component
└── main.tsx       # Entry point
```

## Environment Variables

Make sure to create a `.env` file with:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Migrations

Additional database migrations are available in the `migrations/` folder:

- `add_profiles.sql` - Creates user profiles table with auto-creation trigger
- `add_notifications.sql` - Creates notifications system with helper functions
- `add_messaging.sql` - Creates messaging table for direct communication
- `add_smart_matching.sql` - Creates smart matching system with automatic match calculation

Run these migrations in your Supabase SQL Editor after setting up the base tables.

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

### Deploy to Netlify

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**

1. Build your app: `npm run build`
2. Go to [Netlify](https://app.netlify.com)
3. Drag and drop the `dist` folder
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Redeploy

**Or use Git:**

- Connect your Git repository to Netlify
- Netlify will auto-detect settings from `netlify.toml`
- Add environment variables in Netlify dashboard
- Every push will auto-deploy!

## License

MIT
