# Supabase Database Setup - Manual Steps

## 1. Create Tables in Supabase Dashboard

Go to your Supabase dashboard: https://supabase.com/project/zmrrykndtravddnjtuch/editor

### Execute these SQL commands in the SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  profile_picture TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_name, device_id)
);

-- Media items table
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_by_device_id VARCHAR(255) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_device_id VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_device_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(media_id, user_name, user_device_id)
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_by_device_id VARCHAR(255) NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Live users table
CREATE TABLE IF NOT EXISTS live_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_name, device_id)
);
```

## 2. Create Storage Bucket

1. Go to Storage section in Supabase dashboard
2. Click "Create bucket"
3. Name: `wedding-media`
4. Set as Public bucket
5. Click "Create bucket"

## 3. Set Storage Policies

```sql
-- Create storage policy for wedding-media bucket
CREATE POLICY "Allow all operations on wedding-media" ON storage.objects
FOR ALL USING (bucket_id = 'wedding-media');
```

## 4. Enable Real-time

1. Go to Database → Replication
2. Enable real-time for these tables:
   - user_profiles
   - media_items
   - comments
   - likes
   - stories
   - live_users

After completing these steps, your Supabase is ready for the wedding gallery migration!