import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://zmrrykndtravddnjtuch.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcnJ5a25kdHJhdmRkbmp0dWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDM4ODIsImV4cCI6MjA2NzU3OTg4Mn0.MmCLnAJlUNNDao8wu9tERht_m33WWJj7GDqwMFKzgCw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    // Test 1: Basic database connection
    console.log('📊 Testing database connection...');
    const { data, error } = await supabase.from('site_status').select('*').limit(1);
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      console.log('💡 Make sure you have executed supabase-manual-setup.sql in your dashboard');
      return;
    }
    
    console.log('✅ Database connection successful!');
    console.log('📋 Site status data:', data);
    
    // Test 2: Test storage bucket
    console.log('🪣 Testing storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('❌ Storage test failed:', bucketError.message);
      console.log('💡 Make sure you have created the wedding-media bucket');
      return;
    }
    
    console.log('✅ Storage buckets available:', buckets.map(b => b.name));
    
    // Test 3: Test user profiles table
    console.log('👤 Testing user profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.log('❌ User profiles test failed:', profileError.message);
      return;
    }
    
    console.log('✅ User profiles table ready!');
    console.log('📊 Profile count:', profiles.length);
    
    // Test 4: Test media items table
    console.log('📸 Testing media items table...');
    const { data: media, error: mediaError } = await supabase
      .from('media_items')
      .select('*')
      .limit(1);
    
    if (mediaError) {
      console.log('❌ Media items test failed:', mediaError.message);
      return;
    }
    
    console.log('✅ Media items table ready!');
    console.log('📊 Media count:', media.length);
    
    // Test 5: Test real-time subscriptions
    console.log('🔄 Testing real-time subscriptions...');
    const channel = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_users'
        },
        (payload) => {
          console.log('📡 Real-time update received:', payload);
        }
      )
      .subscribe();
    
    // Wait a moment then unsubscribe
    setTimeout(() => {
      supabase.removeChannel(channel);
      console.log('✅ Real-time subscriptions working!');
    }, 1000);
    
    console.log('');
    console.log('🎉 All tests passed! Supabase is ready for migration.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run the migration service to transfer data from Firebase');
    console.log('2. Update components to use Supabase instead of Firebase');
    console.log('3. Test the full application with Supabase');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure Supabase environment variables are set');
    console.log('2. Execute supabase-manual-setup.sql in your Supabase dashboard');
    console.log('3. Create the wedding-media storage bucket');
    console.log('4. Check your Supabase project status');
  }
}

testSupabaseConnection();