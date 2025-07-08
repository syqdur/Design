# 🚀 Firebase to Supabase Migration Guide

## Step 1: Database Setup (Manual)

### 1.1 Execute SQL in Supabase Dashboard
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/zmrrykndtravddnjtuch
2. Navigate to "SQL Editor" in the left sidebar
3. Create a new query and paste the contents of `supabase-manual-setup.sql`
4. Click "Run" to execute the database schema

### 1.2 Setup Storage Bucket
1. Go to "Storage" in the left sidebar
2. Click "Create bucket"
3. Name: `wedding-media`
4. Set as Public bucket
5. Click "Create bucket"

### 1.3 Setup Storage Policies
1. In the SQL Editor, paste the contents of `supabase-storage-setup.sql`
2. Click "Run" to execute storage policies

## Step 2: Environment Variables

Add these to your Replit Secrets:
- `SUPABASE_URL`: https://zmrrykndtravddnjtuch.supabase.co
- `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- `SUPABASE_SERVICE_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## Step 3: Test Database Connection

Run the test script to verify everything is working:
```bash
node test-supabase-connection.js
```

## Step 4: Data Migration

The migration service will:
1. Export user profiles from Firebase
2. Export media items and metadata from Firebase
3. Export comments and likes from Firebase
4. Export stories from Firebase
5. Import all data to Supabase
6. Migrate files from Firebase Storage to Supabase Storage

## Step 5: Component Updates

Components will be updated to use Supabase:
- Replace Firebase imports with Supabase imports
- Update database queries to use SQL instead of Firestore
- Update real-time subscriptions to use Supabase channels
- Update file uploads to use Supabase Storage

## Step 6: Testing

After migration:
1. Test user profiles and authentication
2. Test media uploads and display
3. Test comments and likes functionality
4. Test stories and timeline features
5. Test live user tracking
6. Test admin features

## Step 7: Cleanup

After successful migration:
1. Remove Firebase configuration
2. Clean up unused Firebase code
3. Update documentation
4. Remove Firebase dependencies if no longer needed

## Benefits of Migration

✅ **Better Performance**: PostgreSQL is faster than Firestore  
✅ **Reliable Storage**: No more Firebase Storage permission issues  
✅ **Real-time Features**: Supabase provides real-time subscriptions  
✅ **Better Security**: Row Level Security (RLS) for fine-grained access control  
✅ **SQL Queries**: Full SQL support for complex queries  
✅ **Cost Effective**: Better pricing structure than Firebase  
✅ **Open Source**: Supabase is open source and self-hostable  

## Rollback Plan

If issues occur:
1. Keep Firebase configuration active during migration
2. Switch back to Firebase by updating environment variables
3. All Firebase data remains intact during migration
4. No data loss risk during transition period