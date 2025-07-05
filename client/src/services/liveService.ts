import { 
  doc, 
  onSnapshot, 
  collection,
  query,
  where,
  orderBy,
  addDoc,
  deleteDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

// Stories Types
export interface Story {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  userName: string;
  deviceId: string;
  createdAt: string;
  expiresAt: string;
  views: string[]; // Array of user IDs who viewed this story
  fileName?: string; // For deletion from storage
}

// Stories Functions - FIXED TO USE SAME STORAGE PATH AS REGULAR UPLOADS
export const addStory = async (
  file: File,
  mediaType: 'image' | 'video',
  userName: string,
  deviceId: string
): Promise<void> => {
  console.log(`🚀 === STORY UPLOAD START ===`);
  console.log(`👤 User: ${userName} (${deviceId})`);
  console.log(`📁 File: ${file.name}`);
  console.log(`📊 Size: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  console.log(`🎬 Type: ${mediaType} (${file.type})`);
  
  let storageRef: any = null;
  let uploadedToStorage = false;
  
  try {
    // === STEP 1: VALIDATION ===
    console.log(`🔍 Step 1: Validating file...`);
    
    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Datei zu groß: ${(file.size / 1024 / 1024).toFixed(1)}MB (max. 100MB)`);
    }
    
    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      throw new Error(`Ungültiger Dateityp: ${file.type}`);
    }
    
    console.log(`✅ File validation passed`);
    
    // === STEP 2: GENERATE FILENAME ===
    console.log(`🏷️ Step 2: Generating filename...`);
    
    const timestamp = Date.now();
    const cleanUserName = userName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_');
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || (mediaType === 'video' ? 'mp4' : 'jpg');
    
    // 🔧 FIX: Use same path as regular uploads to avoid permission issues
    const fileName = `STORY_${timestamp}_${cleanUserName}.${fileExtension}`;
    
    console.log(`✅ Generated filename: ${fileName}`);
    
    // === STEP 3: TEST FIREBASE CONNECTION ===
    console.log(`🔗 Step 3: Testing Firebase connection...`);
    
    try {
      // Test Firestore connection
      const testDoc = doc(db, 'test', 'connection');
      console.log(`✅ Firestore connection OK`);
      
      // Test Storage connection
      const testStorageRef = ref(storage, 'test/connection.txt');
      console.log(`✅ Storage connection OK`);
      
    } catch (connectionError) {
      console.error(`❌ Firebase connection failed:`, connectionError);
      throw new Error(`Verbindung zu Firebase fehlgeschlagen. Prüfe deine Internetverbindung.`);
    }
    
    // === STEP 4: UPLOAD TO STORAGE ===
    console.log(`📤 Step 4: Uploading to Firebase Storage...`);
    
    // 🔧 FIX: Use 'uploads/' path instead of 'stories/' to match existing permissions
    storageRef = ref(storage, `uploads/${fileName}`);
    
    try {
      console.log(`📤 Starting upload to: uploads/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file);
      uploadedToStorage = true;
      
      console.log(`✅ Upload completed successfully`);
      console.log(`📊 Upload metadata:`, {
        bucket: uploadResult.metadata.bucket,
        fullPath: uploadResult.metadata.fullPath,
        size: uploadResult.metadata.size,
        timeCreated: uploadResult.metadata.timeCreated
      });
      
    } catch (uploadError: any) {
      console.error(`❌ Storage upload failed:`, uploadError);
      
      // Provide specific error messages
      if (uploadError.code === 'storage/unauthorized') {
        throw new Error('Keine Berechtigung zum Hochladen. Lade die Seite neu und versuche es erneut.');
      } else if (uploadError.code === 'storage/canceled') {
        throw new Error('Upload wurde abgebrochen.');
      } else if (uploadError.code === 'storage/quota-exceeded') {
        throw new Error('Speicherplatz voll. Kontaktiere Kristin oder Maurizio.');
      } else if (uploadError.code === 'storage/invalid-format') {
        throw new Error('Ungültiges Dateiformat.');
      } else if (uploadError.message?.includes('network') || uploadError.message?.includes('fetch')) {
        throw new Error('Netzwerkfehler. Prüfe deine Internetverbindung und versuche es erneut.');
      } else {
        throw new Error(`Upload-Fehler: ${uploadError.message || 'Unbekannter Fehler'}`);
      }
    }
    
    // === STEP 5: GET DOWNLOAD URL ===
    console.log(`🔗 Step 5: Getting download URL...`);
    
    let downloadURL: string;
    try {
      downloadURL = await getDownloadURL(storageRef);
      console.log(`✅ Download URL obtained: ${downloadURL.substring(0, 80)}...`);
    } catch (urlError: any) {
      console.error(`❌ Failed to get download URL:`, urlError);
      throw new Error('Fehler beim Erstellen der Download-URL. Versuche es erneut.');
    }
    
    // === STEP 6: PREPARE STORY DATA ===
    console.log(`📋 Step 6: Preparing story data...`);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    const storyData = {
      mediaUrl: downloadURL,
      mediaType,
      userName,
      deviceId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      views: [],
      fileName: fileName, // Store filename for deletion
      isStory: true // Mark as story for identification
    };
    
    console.log(`📅 Story expires at: ${expiresAt.toISOString()}`);
    
    // === STEP 7: SAVE TO FIRESTORE ===
    console.log(`💾 Step 7: Saving to Firestore...`);
    
    try {
      const docRef = await addDoc(collection(db, 'stories'), storyData);
      console.log(`✅ Story saved to Firestore with ID: ${docRef.id}`);
      console.log(`🎉 === STORY UPLOAD COMPLETED SUCCESSFULLY ===`);
      
    } catch (firestoreError: any) {
      console.error(`❌ Firestore save failed:`, firestoreError);
      
      // Try to clean up the uploaded file
      if (uploadedToStorage && storageRef) {
        try {
          await deleteObject(storageRef);
          console.log(`🧹 Cleaned up uploaded file after Firestore error`);
        } catch (cleanupError) {
          console.warn(`⚠️ Could not clean up uploaded file:`, cleanupError);
        }
      }
      
      if (firestoreError.code === 'permission-denied') {
        throw new Error('Keine Berechtigung zum Speichern. Lade die Seite neu und versuche es erneut.');
      } else if (firestoreError.code === 'unavailable') {
        throw new Error('Server temporär nicht verfügbar. Versuche es in wenigen Sekunden erneut.');
      } else {
        throw new Error(`Fehler beim Speichern der Story: ${firestoreError.message || 'Unbekannter Fehler'}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ === STORY UPLOAD FAILED ===');
    console.error('Error details:', error);
    
    // Clean up on any error if we uploaded to storage
    if (uploadedToStorage && storageRef) {
      try {
        await deleteObject(storageRef);
        console.log(`🧹 Cleaned up uploaded file after error`);
      } catch (cleanupError) {
        console.warn(`⚠️ Could not clean up uploaded file:`, cleanupError);
      }
    }
    
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw error; // Already has a user-friendly message
    } else {
      throw new Error(`Unbekannter Fehler beim Story-Upload: ${error}`);
    }
  }
};

// 🔧 MAJOR FIX: Simplified stories subscription without complex queries
export const subscribeStories = (callback: (stories: Story[]) => void): (() => void) => {
  console.log(`📱 === SUBSCRIBING TO STORIES (SIMPLIFIED) ===`);
  
  // 🔧 FIX: Use simple query without complex where clauses that might fail
  const q = query(
    collection(db, 'stories'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    console.log(`📱 Raw stories from Firestore: ${snapshot.docs.length}`);
    
    const now = new Date();
    const allStories: Story[] = [];
    const activeStories: Story[] = [];
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const story: Story = {
        id: doc.id,
        ...data
      } as Story;
      
      allStories.push(story);
      
      // Check if story is still active (not expired)
      const expiresAt = new Date(story.expiresAt);
      const isActive = expiresAt > now;
      
      console.log(`  ${index + 1}. ${story.userName} - ${story.mediaType} - ${isActive ? 'ACTIVE' : 'EXPIRED'} (expires: ${expiresAt.toLocaleString()})`);
      
      if (isActive) {
        activeStories.push(story);
      }
    });
    
    console.log(`📱 Total stories: ${allStories.length}, Active: ${activeStories.length}`);
    
    // Return only active stories for regular users
    callback(activeStories);
    
  }, (error) => {
    console.error('❌ Error listening to stories:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    callback([]);
  });
};

// Subscribe to ALL stories for admin (including expired ones)
export const subscribeAllStories = (callback: (stories: Story[]) => void): (() => void) => {
  console.log(`👑 === SUBSCRIBING TO ALL STORIES (ADMIN) ===`);
  
  const q = query(
    collection(db, 'stories'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const stories: Story[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Story));
    
    console.log(`👑 All stories loaded (admin): ${stories.length}`);
    
    // Debug: Log each story with expiry status
    const now = new Date();
    stories.forEach((story, index) => {
      const isExpired = new Date(story.expiresAt) < now;
      const timeLeft = new Date(story.expiresAt).getTime() - Date.now();
      const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      console.log(`  ${index + 1}. ${story.userName} - ${story.mediaType} - ${isExpired ? 'EXPIRED' : `${hoursLeft}h left`}`);
    });
    
    callback(stories);
  }, (error) => {
    console.error('❌ Error listening to all stories:', error);
    callback([]);
  });
};

export const markStoryAsViewed = async (storyId: string, deviceId: string): Promise<void> => {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storyDoc = await getDocs(query(collection(db, 'stories'), where('__name__', '==', storyId)));
    
    if (!storyDoc.empty) {
      const storyData = storyDoc.docs[0].data();
      const currentViews = storyData.views || [];
      
      if (!currentViews.includes(deviceId)) {
        await updateDoc(storyRef, {
          views: [...currentViews, deviceId]
        });
      }
    }
  } catch (error) {
    console.error('Error marking story as viewed:', error);
  }
};

// Delete a specific story
export const deleteStory = async (storyId: string): Promise<void> => {
  try {
    console.log(`🗑️ Deleting story: ${storyId}`);
    
    // Get story data first to get the fileName for storage deletion
    const storyDoc = await getDocs(query(collection(db, 'stories'), where('__name__', '==', storyId)));
    
    if (!storyDoc.empty) {
      const storyData = storyDoc.docs[0].data();
      
      // Delete from storage if fileName exists
      if (storyData.fileName) {
        try {
          // 🔧 FIX: Use 'uploads/' path for deletion too
          const storageRef = ref(storage, `uploads/${storyData.fileName}`);
          await deleteObject(storageRef);
          console.log(`✅ Deleted story from storage: ${storyData.fileName}`);
        } catch (storageError) {
          console.warn(`⚠️ Could not delete story from storage: ${storyData.fileName}`, storageError);
          // Continue with Firestore deletion even if storage deletion fails
        }
      }
    }
    
    // Delete from Firestore
    await deleteDoc(doc(db, 'stories', storyId));
    console.log(`✅ Deleted story from Firestore: ${storyId}`);
    
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
};

// Cleanup expired stories (should be called periodically)
export const cleanupExpiredStories = async (): Promise<void> => {
  try {
    console.log(`🧹 === CLEANING UP EXPIRED STORIES ===`);
    
    // Get all stories first, then filter expired ones
    const allStoriesSnapshot = await getDocs(collection(db, 'stories'));
    const now = new Date();
    const expiredStories: any[] = [];
    
    allStoriesSnapshot.docs.forEach(doc => {
      const storyData = doc.data();
      const expiresAt = new Date(storyData.expiresAt);
      
      if (expiresAt <= now) {
        expiredStories.push({ id: doc.id, data: storyData });
      }
    });
    
    console.log(`🧹 Found ${expiredStories.length} expired stories to clean up`);
    
    const deletePromises = expiredStories.map(async (story) => {
      // Delete from storage if fileName exists
      if (story.data.fileName) {
        try {
          // 🔧 FIX: Use 'uploads/' path for cleanup too
          const storageRef = ref(storage, `uploads/${story.data.fileName}`);
          await deleteObject(storageRef);
          console.log(`✅ Deleted expired story from storage: ${story.data.fileName}`);
        } catch (storageError) {
          console.warn(`⚠️ Could not delete expired story from storage: ${story.data.fileName}`, storageError);
        }
      }
      
      // Delete from Firestore
      return deleteDoc(doc(db, 'stories', story.id));
    });
    
    await Promise.all(deletePromises);
    console.log(`🧹 Cleaned up ${expiredStories.length} expired stories`);
  } catch (error) {
    console.error('Error cleaning up expired stories:', error);
  }
};