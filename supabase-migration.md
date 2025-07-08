# Supabase Migration Plan

## Why Supabase is Better
- PostgreSQL database (more reliable than Firestore)
- Proper file storage with consistent permissions
- Real-time subscriptions (like Firebase)
- Better authentication and security
- No service account permission issues

## Migration Steps

### 1. Create Supabase Project
1. Go to: https://supabase.com/dashboard
2. Click "New project"
3. Choose organization
4. Name: "wedding-gallery-2025"
5. Password: Generate strong password
6. Region: Choose closest to your users
7. Click "Create new project"

### 2. Get Project Settings
After project creation:
1. Go to Settings → API
2. Copy:
   - Project URL
   - anon (public) key
   - service_role (secret) key

### 3. Database Schema
I'll create tables for:
- users (existing PostgreSQL structure)
- media_items (photos/videos with metadata)
- comments
- likes
- stories
- timeline_events
- live_users (for presence)

### 4. Storage Setup
- Create storage bucket for media files
- Set up proper storage policies
- Configure file upload/download

### 5. Real-time Features
- Enable real-time on all tables
- Set up live user presence
- Configure story expiration

## What You Need to Provide
Just the Supabase project details (URL and keys) and I'll handle the complete migration.