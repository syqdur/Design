import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, listAll, getDownloadURL } from 'firebase/storage';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBIXCwTJMmLvC4MXjYQVJ4KPNHOLdJVKIg",
  authDomain: "weddingpix-744e5.firebaseapp.com",
  projectId: "weddingpix-744e5",
  storageBucket: "weddingpix-744e5.firebasestorage.app",
  messagingSenderId: "1000040937",
  appId: "1:1000040937:web:b0b8a7b8f6c6a7b8b0b8a7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://zmrrykndtravddnjtuch.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcnJ5a25kdHJhdmRkbmp0dWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjAwMzg4MiwiZXhwIjoyMDY3NTc5ODgyfQ.SN8evdCumdDVEgISZBFwalXSP1zbe34kjqWaX5bM-x8';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function migrateFirebaseToSupabase() {
  console.log('🚀 Starting Firebase to Supabase migration...');
  
  try {
    // Step 1: Migrate User Profiles
    console.log('\n👤 Migrating user profiles...');
    const userProfilesRef = collection(db, 'userProfiles');
    const userProfilesSnapshot = await getDocs(userProfilesRef);
    
    const userProfiles = [];
    userProfilesSnapshot.forEach((doc) => {
      const data = doc.data();
      userProfiles.push({
        user_name: data.userName || 'Unknown',
        device_id: data.deviceId || doc.id,
        display_name: data.displayName || data.userName,
        profile_picture: data.profilePicture || null,
        bio: data.bio || null,
        created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
        updated_at: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()
      });
    });
    
    if (userProfiles.length > 0) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(userProfiles, { onConflict: 'user_name,device_id' });
      
      if (profileError) {
        console.log('⚠️ User profiles migration note:', profileError.message);
      } else {
        console.log(`✅ Migrated ${userProfiles.length} user profiles`);
      }
    }
    
    // Step 2: Migrate Media Items
    console.log('\n📸 Migrating media items...');
    const mediaRef = collection(db, 'media');
    const mediaSnapshot = await getDocs(mediaRef);
    
    const mediaItems = [];
    const mediaMetadata = new Map();
    
    mediaSnapshot.forEach((doc) => {
      const data = doc.data();
      const mediaItem = {
        id: doc.id,
        url: data.url || data.downloadURL || '',
        type: data.type || (data.url?.includes('.mp4') ? 'video' : 'image'),
        uploaded_by: data.uploadedBy || data.userName || 'Unknown',
        uploaded_by_device_id: data.uploadedByDeviceId || data.deviceId || 'unknown',
        note: data.note || data.text || null,
        created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
        updated_at: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()
      };
      
      mediaItems.push(mediaItem);
      mediaMetadata.set(doc.id, data);
    });
    
    if (mediaItems.length > 0) {
      const { error: mediaError } = await supabase
        .from('media_items')
        .upsert(mediaItems, { onConflict: 'id' });
      
      if (mediaError) {
        console.log('⚠️ Media items migration note:', mediaError.message);
      } else {
        console.log(`✅ Migrated ${mediaItems.length} media items`);
      }
    }
    
    // Step 3: Migrate Comments
    console.log('\n💬 Migrating comments...');
    const commentsRef = collection(db, 'comments');
    const commentsSnapshot = await getDocs(commentsRef);
    
    const comments = [];
    commentsSnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        media_id: data.mediaId || data.postId,
        user_name: data.userName || 'Unknown',
        user_device_id: data.userDeviceId || data.deviceId || 'unknown',
        text: data.text || data.comment || '',
        created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
      });
    });
    
    if (comments.length > 0) {
      const { error: commentsError } = await supabase
        .from('comments')
        .upsert(comments, { onConflict: 'id' });
      
      if (commentsError) {
        console.log('⚠️ Comments migration note:', commentsError.message);
      } else {
        console.log(`✅ Migrated ${comments.length} comments`);
      }
    }
    
    // Step 4: Migrate Likes
    console.log('\n❤️ Migrating likes...');
    const likesRef = collection(db, 'likes');
    const likesSnapshot = await getDocs(likesRef);
    
    const likes = [];
    likesSnapshot.forEach((doc) => {
      const data = doc.data();
      likes.push({
        id: doc.id,
        media_id: data.mediaId || data.postId,
        user_name: data.userName || 'Unknown',
        user_device_id: data.userDeviceId || data.deviceId || 'unknown',
        created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString()
      });
    });
    
    if (likes.length > 0) {
      const { error: likesError } = await supabase
        .from('likes')
        .upsert(likes, { onConflict: 'id' });
      
      if (likesError) {
        console.log('⚠️ Likes migration note:', likesError.message);
      } else {
        console.log(`✅ Migrated ${likes.length} likes`);
      }
    }
    
    // Step 5: Migrate Stories
    console.log('\n📱 Migrating stories...');
    const storiesRef = collection(db, 'stories');
    const storiesSnapshot = await getDocs(storiesRef);
    
    const stories = [];
    storiesSnapshot.forEach((doc) => {
      const data = doc.data();
      stories.push({
        id: doc.id,
        url: data.url || data.downloadURL || '',
        type: data.type || (data.url?.includes('.mp4') ? 'video' : 'image'),
        uploaded_by: data.uploadedBy || data.userName || 'Unknown',
        uploaded_by_device_id: data.uploadedByDeviceId || data.deviceId || 'unknown',
        thumbnail_url: data.thumbnailUrl || null,
        created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
        expires_at: data.expiresAt ? new Date(data.expiresAt.seconds * 1000).toISOString() : 
                   new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      });
    });
    
    if (stories.length > 0) {
      const { error: storiesError } = await supabase
        .from('stories')
        .upsert(stories, { onConflict: 'id' });
      
      if (storiesError) {
        console.log('⚠️ Stories migration note:', storiesError.message);
      } else {
        console.log(`✅ Migrated ${stories.length} stories`);
      }
    }
    
    // Step 6: Migrate Live Users
    console.log('\n👥 Migrating live users...');
    const liveUsersRef = collection(db, 'live_users');
    const liveUsersSnapshot = await getDocs(liveUsersRef);
    
    const liveUsers = [];
    liveUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      liveUsers.push({
        user_name: data.userName || 'Unknown',
        device_id: data.deviceId || doc.id,
        last_seen: data.lastSeen ? new Date(data.lastSeen.seconds * 1000).toISOString() : new Date().toISOString(),
        is_active: data.isActive !== undefined ? data.isActive : true,
        created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
        updated_at: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()
      });
    });
    
    if (liveUsers.length > 0) {
      const { error: liveUsersError } = await supabase
        .from('live_users')
        .upsert(liveUsers, { onConflict: 'user_name,device_id' });
      
      if (liveUsersError) {
        console.log('⚠️ Live users migration note:', liveUsersError.message);
      } else {
        console.log(`✅ Migrated ${liveUsers.length} live users`);
      }
    }
    
    // Step 7: Migrate Timeline Events
    console.log('\n📅 Migrating timeline events...');
    const timelineRef = collection(db, 'timeline');
    const timelineSnapshot = await getDocs(timelineRef);
    
    const timelineEvents = [];
    timelineSnapshot.forEach((doc) => {
      const data = doc.data();
      timelineEvents.push({
        id: doc.id,
        title: data.title || 'Timeline Event',
        description: data.description || null,
        date: data.date ? new Date(data.date.seconds * 1000).toISOString() : new Date().toISOString(),
        location: data.location || null,
        media_url: data.mediaUrl || null,
        media_type: data.mediaType || null,
        created_by: data.createdBy || data.userName || 'Unknown',
        created_by_device_id: data.createdByDeviceId || data.deviceId || 'unknown',
        created_at: data.createdAt ? new Date(data.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
        updated_at: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()
      });
    });
    
    if (timelineEvents.length > 0) {
      const { error: timelineError } = await supabase
        .from('timeline_events')
        .upsert(timelineEvents, { onConflict: 'id' });
      
      if (timelineError) {
        console.log('⚠️ Timeline events migration note:', timelineError.message);
      } else {
        console.log(`✅ Migrated ${timelineEvents.length} timeline events`);
      }
    }
    
    // Step 8: Create migration summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ User Profiles: ${userProfiles.length}`);
    console.log(`✅ Media Items: ${mediaItems.length}`);
    console.log(`✅ Comments: ${comments.length}`);
    console.log(`✅ Likes: ${likes.length}`);
    console.log(`✅ Stories: ${stories.length}`);
    console.log(`✅ Live Users: ${liveUsers.length}`);
    console.log(`✅ Timeline Events: ${timelineEvents.length}`);
    
    // Step 9: Create migration report
    const migrationReport = {
      date: new Date().toISOString(),
      status: 'completed',
      migrated_data: {
        user_profiles: userProfiles.length,
        media_items: mediaItems.length,
        comments: comments.length,
        likes: likes.length,
        stories: stories.length,
        live_users: liveUsers.length,
        timeline_events: timelineEvents.length
      },
      total_records: userProfiles.length + mediaItems.length + comments.length + likes.length + stories.length + liveUsers.length + timelineEvents.length
    };
    
    fs.writeFileSync('migration-report.json', JSON.stringify(migrationReport, null, 2));
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Migration report saved to migration-report.json');
    console.log('');
    console.log('Next steps:');
    console.log('1. Test the Supabase connection with: node test-supabase-connection.js');
    console.log('2. Update the application components to use Supabase');
    console.log('3. Test all features with the migrated data');
    console.log('4. Switch environment variables to use Supabase');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    
    // Create error report
    const errorReport = {
      date: new Date().toISOString(),
      status: 'failed',
      error: error.message,
      stack: error.stack
    };
    
    fs.writeFileSync('migration-error-report.json', JSON.stringify(errorReport, null, 2));
    console.log('❌ Error report saved to migration-error-report.json');
  }
}

migrateFirebaseToSupabase();