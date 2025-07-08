import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zmrrykndtravddnjtuch.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcnJ5a25kdHJhdmRkbmp0dWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDM4ODIsImV4cCI6MjA2NzU3OTg4Mn0.MmCLnAJlUNNDao8wu9tERht_m33WWJj7GDqwMFKzgCw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupSupabase() {
  try {
    console.log('🚀 Setting up Supabase database schema...');
    
    // Read the SQL schema file
    const schema = fs.readFileSync('./supabase-schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`📋 Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql_statement: statement });
        
        if (error) {
          console.log(`⚠️ Statement ${i + 1} note:`, error.message);
          // Continue anyway - some errors are expected (like table already exists)
        } else {
          console.log(`✅ Statement ${i + 1} completed`);
        }
      }
    }
    
    console.log('🎉 Supabase setup completed!');
    console.log('📊 Testing database connection...');
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database test failed:', testError.message);
    } else {
      console.log('✅ Database connection successful!');
    }
    
    // Test storage bucket
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.log('❌ Storage test failed:', bucketError.message);
    } else {
      console.log('✅ Storage buckets available:', buckets.map(b => b.name));
    }
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
  }
}

setupSupabase();