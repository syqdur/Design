import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://zmrrykndtravddnjtuch.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcnJ5a25kdHJhdmRkbmp0dWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjAwMzg4MiwiZXhwIjoyMDY3NTc5ODgyfQ.SN8evdCumdDVEgISZBFwalXSP1zbe34kjqWaX5bM-x8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupSupabaseDatabase() {
  console.log('🚀 Setting up Supabase database...');
  
  try {
    // Step 1: Create storage bucket
    console.log('📁 Creating storage bucket...');
    const { error: bucketError } = await supabase.storage.createBucket('wedding-media', {
      public: true
    });
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.log('⚠️ Storage bucket note:', bucketError.message);
    } else {
      console.log('✅ Storage bucket ready!');
    }

    // Step 2: Execute schema SQL
    console.log('🗄️ Creating database tables...');
    
    // Execute each table creation separately for better error handling
    const tables = [
      {
        name: 'users',
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'user_profiles',
        sql: `
          CREATE TABLE IF NOT EXISTS user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_name VARCHAR(255) NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            display_name VARCHAR(255),
            profile_picture TEXT,
            bio TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_name, device_id)
          );
        `
      },
      {
        name: 'media_items',
        sql: `
          CREATE TABLE IF NOT EXISTS media_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            url TEXT NOT NULL,
            type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
            uploaded_by VARCHAR(255) NOT NULL,
            uploaded_by_device_id VARCHAR(255) NOT NULL,
            note TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'comments',
        sql: `
          CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            user_name VARCHAR(255) NOT NULL,
            user_device_id VARCHAR(255) NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'likes',
        sql: `
          CREATE TABLE IF NOT EXISTS likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            user_name VARCHAR(255) NOT NULL,
            user_device_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(media_id, user_name, user_device_id)
          );
        `
      },
      {
        name: 'stories',
        sql: `
          CREATE TABLE IF NOT EXISTS stories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            url TEXT NOT NULL,
            type VARCHAR(10) NOT NULL CHECK (type IN ('image', 'video')),
            uploaded_by VARCHAR(255) NOT NULL,
            uploaded_by_device_id VARCHAR(255) NOT NULL,
            thumbnail_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
          );
        `
      },
      {
        name: 'live_users',
        sql: `
          CREATE TABLE IF NOT EXISTS live_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_name VARCHAR(255) NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_name, device_id)
          );
        `
      },
      {
        name: 'timeline_events',
        sql: `
          CREATE TABLE IF NOT EXISTS timeline_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        `
      },
      {
        name: 'media_tags',
        sql: `
          CREATE TABLE IF NOT EXISTS media_tags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            tagged_user_name VARCHAR(255) NOT NULL,
            tagged_user_device_id VARCHAR(255) NOT NULL,
            tagged_by VARCHAR(255) NOT NULL,
            tagged_by_device_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(media_id, tagged_user_name, tagged_user_device_id)
          );
        `
      },
      {
        name: 'location_tags',
        sql: `
          CREATE TABLE IF NOT EXISTS location_tags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            media_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
            location_name VARCHAR(255) NOT NULL,
            location_address TEXT,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            created_by VARCHAR(255) NOT NULL,
            created_by_device_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'notifications',
        sql: `
          CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        `
      },
      {
        name: 'site_status',
        sql: `
          CREATE TABLE IF NOT EXISTS site_status (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            gallery_enabled BOOLEAN DEFAULT TRUE,
            stories_enabled BOOLEAN DEFAULT TRUE,
            music_enabled BOOLEAN DEFAULT TRUE,
            challenges_enabled BOOLEAN DEFAULT TRUE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      },
      {
        name: 'challenge_completions',
        sql: `
          CREATE TABLE IF NOT EXISTS challenge_completions (
            id SERIAL PRIMARY KEY,
            challenge_id VARCHAR(255) NOT NULL,
            user_name VARCHAR(255) NOT NULL,
            device_id VARCHAR(255) NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }
    ];

    // Create tables
    for (const table of tables) {
      console.log(`📋 Creating ${table.name} table...`);
      const { error } = await supabase.rpc('exec', { sql: table.sql });
      if (error) {
        console.log(`⚠️ ${table.name} table note:`, error.message);
      } else {
        console.log(`✅ ${table.name} table ready!`);
      }
    }

    // Step 3: Create indexes
    console.log('🔍 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_media_items_created_at ON media_items(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_comments_media_id ON comments(media_id);',
      'CREATE INDEX IF NOT EXISTS idx_likes_media_id ON likes(media_id);',
      'CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);',
      'CREATE INDEX IF NOT EXISTS idx_live_users_last_seen ON live_users(last_seen DESC);',
      'CREATE INDEX IF NOT EXISTS idx_timeline_events_date ON timeline_events(date DESC);',
      'CREATE INDEX IF NOT EXISTS idx_media_tags_media_id ON media_tags(media_id);',
      'CREATE INDEX IF NOT EXISTS idx_location_tags_media_id ON location_tags(media_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_name, user_device_id, created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_user_profiles_user_device ON user_profiles(user_name, device_id);'
    ];

    for (const indexSql of indexes) {
      const { error } = await supabase.rpc('exec', { sql: indexSql });
      if (error) {
        console.log('⚠️ Index note:', error.message);
      }
    }

    // Step 4: Insert default site status
    console.log('⚙️ Setting up default site status...');
    const { error: statusError } = await supabase
      .from('site_status')
      .upsert([{
        gallery_enabled: true,
        stories_enabled: true,
        music_enabled: true,
        challenges_enabled: true
      }]);
    
    if (statusError) {
      console.log('⚠️ Default site status note:', statusError.message);
    } else {
      console.log('✅ Default site status ready!');
    }

    // Step 5: Test database connection
    console.log('🧪 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('site_status')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database test failed:', testError.message);
    } else {
      console.log('✅ Database connection successful!');
      console.log('📊 Test data:', testData);
    }

    // Step 6: Test storage
    console.log('🪣 Testing storage...');
    const { data: buckets, error: bucketTestError } = await supabase.storage.listBuckets();
    if (bucketTestError) {
      console.log('❌ Storage test failed:', bucketTestError.message);
    } else {
      console.log('✅ Storage available:', buckets.map(b => b.name));
    }

    console.log('🎉 Supabase setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update environment variables in frontend');
    console.log('2. Create migration service from Firebase to Supabase');
    console.log('3. Update all components to use Supabase instead of Firebase');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

setupSupabaseDatabase();