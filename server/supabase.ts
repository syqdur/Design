import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Setup database schema
export async function setupSupabaseSchema() {
  console.log('🚀 Setting up Supabase database schema...')
  
  try {
    // Create tables using raw SQL
    const { error } = await supabase.rpc('exec', {
      sql: `
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        -- Users table (keep existing PostgreSQL structure)
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

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

        -- Timeline events table
        CREATE TABLE IF NOT EXISTS timeline_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          location VARCHAR(255),
          media_url TEXT,
          media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),
          created_by VARCHAR(255) NOT NULL,
          created_by_device_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Media tags table
        CREATE TABLE IF NOT EXISTS media_tags (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
          tagged_user_name VARCHAR(255) NOT NULL,
          tagged_user_device_id VARCHAR(255) NOT NULL,
          tagged_by VARCHAR(255) NOT NULL,
          tagged_by_device_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(media_id, tagged_user_name, tagged_user_device_id)
        );

        -- Location tags table
        CREATE TABLE IF NOT EXISTS location_tags (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
          location_name VARCHAR(255) NOT NULL,
          location_address TEXT,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          created_by VARCHAR(255) NOT NULL,
          created_by_device_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Notifications table
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_name VARCHAR(255) NOT NULL,
          user_device_id VARCHAR(255) NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('tag', 'comment', 'like')),
          message TEXT NOT NULL,
          media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
          media_url TEXT,
          media_type VARCHAR(10) CHECK (media_type IN ('image', 'video')),
          created_by VARCHAR(255) NOT NULL,
          created_by_device_id VARCHAR(255) NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Site status table
        CREATE TABLE IF NOT EXISTS site_status (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          gallery_enabled BOOLEAN DEFAULT TRUE,
          stories_enabled BOOLEAN DEFAULT TRUE,
          music_enabled BOOLEAN DEFAULT TRUE,
          challenges_enabled BOOLEAN DEFAULT TRUE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Challenge completions table (keep existing structure)
        CREATE TABLE IF NOT EXISTS challenge_completions (
          id SERIAL PRIMARY KEY,
          challenge_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          device_id VARCHAR(255) NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_media_id ON comments(media_id);
        CREATE INDEX IF NOT EXISTS idx_likes_media_id ON likes(media_id);
        CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
        CREATE INDEX IF NOT EXISTS idx_live_users_last_seen ON live_users(last_seen DESC);
        CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(date DESC);
        CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags(media_id);
        CREATE INDEX IF NOT EXISTS idx_location_tags_media_id ON location_tags(media_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_name, user_device_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_user_device ON user_profiles(user_name, device_id);
      `
    })

    if (error) {
      console.error('❌ Schema setup failed:', error)
      throw error
    }

    console.log('✅ Supabase schema setup completed!')
    return true
  } catch (error) {
    console.error('💥 Setup failed:', error)
    throw error
  }
}

// Create storage bucket
export async function setupSupabaseStorage() {
  console.log('🪣 Setting up Supabase storage...')
  
  try {
    // Create storage bucket
    const { error: bucketError } = await supabase.storage.createBucket('wedding-media', {
      public: true
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Storage bucket creation failed:', bucketError)
      throw bucketError
    }

    console.log('✅ Storage bucket ready!')
    return true
  } catch (error) {
    console.error('💥 Storage setup failed:', error)
    throw error
  }
}

// Insert default site status
export async function insertDefaultSiteStatus() {
  console.log('⚙️ Setting up default site status...')
  
  try {
    const { error } = await supabase
      .from('site_status')
      .upsert([{
        gallery_enabled: true,
        stories_enabled: true,
        music_enabled: true,
        challenges_enabled: true
      }])
    
    if (error) {
      console.error('❌ Default site status setup failed:', error)
      throw error
    }

    console.log('✅ Default site status ready!')
    return true
  } catch (error) {
    console.error('💥 Default site status setup failed:', error)
    throw error
  }
}