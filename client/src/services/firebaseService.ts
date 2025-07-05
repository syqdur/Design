import { 
  ref, 
  uploadBytes, 
  listAll, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { MediaItem, Comment, Like, ProfileData, MediaTag, LocationTag } from '../types';

export interface UserProfile {
  id: string;
  userName: string;
  deviceId: string;
  profilePicture?: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export const uploadFiles = async (
  files: FileList, 
  userName: string, 
  deviceId: string,
  onProgress: (progress: number) => void
): Promise<void> => {
  let uploaded = 0;
  
  for (const file of Array.from(files)) {
    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `uploads/${fileName}`);
    
    await uploadBytes(storageRef, file);
    
    // Add metadata to Firestore
    const isVideo = file.type.startsWith('video/');
    await addDoc(collection(db, 'media'), {
      name: fileName,
      uploadedBy: userName,
      deviceId: deviceId,
      uploadedAt: new Date().toISOString(),
      type: isVideo ? 'video' : 'image'
    });
    
    uploaded++;
    onProgress((uploaded / files.length) * 100);
  }
};

export const uploadVideoBlob = async (
  videoBlob: Blob,
  userName: string,
  deviceId: string,
  onProgress: (progress: number) => void
): Promise<void> => {
  const fileName = `${Date.now()}-recorded-video.webm`;
  const storageRef = ref(storage, `uploads/${fileName}`);
  
  onProgress(50);
  
  await uploadBytes(storageRef, videoBlob);
  
  // Add metadata to Firestore
  await addDoc(collection(db, 'media'), {
    name: fileName,
    uploadedBy: userName,
    deviceId: deviceId,
    uploadedAt: new Date().toISOString(),
    type: 'video'
  });
  
  onProgress(100);
};

export const addNote = async (
  noteText: string,
  userName: string,
  deviceId: string
): Promise<void> => {
  // Add note as a special media item
  await addDoc(collection(db, 'media'), {
    name: `note-${Date.now()}`,
    uploadedBy: userName,
    deviceId: deviceId,
    uploadedAt: new Date().toISOString(),
    type: 'note',
    noteText: noteText
  });
};

export const editNote = async (
  noteId: string,
  newText: string
): Promise<void> => {
  const noteRef = doc(db, 'media', noteId);
  await updateDoc(noteRef, {
    noteText: newText,
    lastEdited: new Date().toISOString()
  });
};

// 🔧 ENHANCED: Robuste Download-URL Funktion mit besserer Fehlerbehandlung
const getDownloadURLSafe = async (fileName: string): Promise<string> => {
  try {
    console.log(`🔍 Attempting to get URL for: ${fileName}`);
    
    // 🎯 FIX: Try multiple possible paths for the file
    const possiblePaths = [
      `uploads/${fileName}`,  // Standard path
      fileName,               // Direct path (fallback)
      `stories/${fileName}`,  // Stories path (if it was a story)
      `media/${fileName}`     // Alternative media path
    ];
    
    for (const path of possiblePaths) {
      try {
        console.log(`🔍 Trying path: ${path}`);
        const storageRef = ref(storage, path);
        const url = await getDownloadURL(storageRef);
        
        console.log(`✅ URL found at path: ${path}`);
        return url;
        
      } catch (pathError) {
        console.log(`❌ Path failed: ${path} - ${pathError.code}`);
        continue; // Try next path
      }
    }
    
    // If all paths fail, throw a descriptive error
    throw new Error(`File not found in any expected location: ${fileName}`);
    
  } catch (error) {
    console.error(`❌ Failed to get URL for ${fileName}:`, error);
    
    // 🔧 FIX: Return a placeholder or handle gracefully
    if (error.code === 'storage/object-not-found') {
      console.warn(`⚠️ File not found: ${fileName} - marking as unavailable`);
      throw new Error(`File not found: ${fileName}`);
    } else if (error.code === 'storage/unauthorized') {
      console.warn(`🔒 Access denied for: ${fileName} - checking permissions`);
      throw new Error(`Access denied: ${fileName}`);
    } else {
      throw new Error(`Could not load ${fileName}: ${error.message}`);
    }
  }
};

export const loadGallery = (callback: (items: MediaItem[]) => void): () => void => {
  const q = query(collection(db, 'media'), orderBy('uploadedAt', 'desc'));
  
  return onSnapshot(q, async (snapshot) => {
    console.log(`📊 Loading ${snapshot.docs.length} items from Firestore...`);
    
    // 🔧 FIX: Process items with better error handling
    const itemPromises = snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      
      try {
        if (data.type === 'note') {
          // Handle note items
          return {
            id: docSnapshot.id,
            name: data.name,
            url: '', // Notes don't have URLs
            uploadedBy: data.uploadedBy,
            uploadedAt: data.uploadedAt,
            deviceId: data.deviceId,
            type: 'note' as const,
            noteText: data.noteText
          };
          
        } else {
          // Handle media items (images/videos)
          try {
            const url = await getDownloadURLSafe(data.name);
            
            return {
              id: docSnapshot.id,
              name: data.name,
              url,
              uploadedBy: data.uploadedBy,
              uploadedAt: data.uploadedAt,
              deviceId: data.deviceId,
              type: data.type as 'image' | 'video'
            };
            
          } catch (urlError) {
            console.error(`❌ Could not load ${data.name}:`, urlError);
            
            // 🔧 FIX: Instead of skipping, create a placeholder item
            return {
              id: docSnapshot.id,
              name: data.name,
              url: '', // Empty URL indicates unavailable
              uploadedBy: data.uploadedBy,
              uploadedAt: data.uploadedAt,
              deviceId: data.deviceId,
              type: data.type as 'image' | 'video',
              isUnavailable: true // Mark as unavailable
            };
          }
        }
        
      } catch (itemError) {
        console.error(`❌ Error processing item ${docSnapshot.id}:`, itemError);
        return null; // Skip this item
      }
    });
    
    // Wait for all promises and filter null values
    const resolvedItems = await Promise.all(itemPromises);
    const validItems = resolvedItems.filter((item): item is MediaItem => item !== null);
    
    console.log(`📊 Gallery loaded successfully:`);
    console.log(`   📸 Images: ${validItems.filter(i => i.type === 'image').length}`);
    console.log(`   🎥 Videos: ${validItems.filter(i => i.type === 'video').length}`);
    console.log(`   💌 Notes: ${validItems.filter(i => i.type === 'note').length}`);
    console.log(`   ⚠️ Unavailable: ${validItems.filter(i => i.isUnavailable).length}`);
    console.log(`   ❌ Failed: ${snapshot.docs.length - validItems.length}`);
    
    callback(validItems);
    
  }, (error) => {
    console.error('❌ Gallery listener error:', error);
    // Fallback: empty list
    callback([]);
  });
};

export const deleteMediaItem = async (item: MediaItem): Promise<void> => {
  try {
    console.log(`🗑️ === DELETING MEDIA ITEM ===`);
    console.log(`🗑️ Item: ${item.name} (${item.type})`);
    console.log(`👤 Uploaded by: ${item.uploadedBy}`);
    
    // Delete from storage (only if it's not a note and has a valid URL)
    if (item.type !== 'note' && item.name && !item.isUnavailable) {
      try {
        console.log(`🗑️ Attempting to delete from storage: ${item.name}`);
        
        // 🔧 FIX: Try multiple possible paths for deletion
        const possiblePaths = [
          `uploads/${item.name}`,  // Standard path
          item.name,               // Direct path
          `stories/${item.name}`,  // Stories path
          `media/${item.name}`     // Alternative path
        ];
        
        let deletedFromStorage = false;
        
        for (const path of possiblePaths) {
          try {
            console.log(`🗑️ Trying to delete from path: ${path}`);
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
            console.log(`✅ Deleted from storage at path: ${path}`);
            deletedFromStorage = true;
            break; // Success, stop trying other paths
          } catch (pathError) {
            console.log(`❌ Delete failed for path: ${path} - ${pathError.code}`);
            continue; // Try next path
          }
        }
        
        if (!deletedFromStorage) {
          console.warn(`⚠️ Could not delete from storage: ${item.name} (file may not exist)`);
          // Continue with Firestore deletion anyway
        }
        
      } catch (storageError) {
        console.warn(`⚠️ Storage deletion error for ${item.name}:`, storageError);
        // Continue with Firestore deletion even if storage deletion fails
      }
    } else if (item.isUnavailable) {
      console.log(`ℹ️ Skipping storage deletion for unavailable item: ${item.name}`);
    }
    
    // Delete from Firestore
    console.log(`🗑️ Deleting from Firestore: ${item.id}`);
    await deleteDoc(doc(db, 'media', item.id));
    console.log(`✅ Deleted from Firestore: ${item.id}`);
    
    // Delete associated comments
    console.log(`🗑️ Deleting associated comments...`);
    const commentsQuery = query(
      collection(db, 'comments'), 
      where('mediaId', '==', item.id)
    );
    const commentsSnapshot = await getDocs(commentsQuery);
    
    const deleteCommentPromises = commentsSnapshot.docs.map(commentDoc => 
      deleteDoc(doc(db, 'comments', commentDoc.id))
    );
    
    // Delete associated likes
    console.log(`🗑️ Deleting associated likes...`);
    const likesQuery = query(
      collection(db, 'likes'), 
      where('mediaId', '==', item.id)
    );
    const likesSnapshot = await getDocs(likesQuery);
    
    const deleteLikePromises = likesSnapshot.docs.map(likeDoc => 
      deleteDoc(doc(db, 'likes', likeDoc.id))
    );
    
    await Promise.all([...deleteCommentPromises, ...deleteLikePromises]);
    console.log(`✅ Deleted ${deleteCommentPromises.length} comments and ${deleteLikePromises.length} likes`);
    
    console.log(`🗑️ === DELETION COMPLETE ===`);
    
  } catch (error) {
    console.error(`❌ Error deleting item ${item.id}:`, error);
    throw error;
  }
};

export const loadComments = (callback: (comments: Comment[]) => void): () => void => {
  const q = query(collection(db, 'comments'), orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const comments: Comment[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Comment));
    
    console.log(`💬 Loaded ${comments.length} comments`);
    callback(comments);
    
  }, (error) => {
    console.error('❌ Error loading comments:', error);
    callback([]);
  });
};

export const addComment = async (
  mediaId: string, 
  text: string, 
  userName: string, 
  deviceId: string
): Promise<void> => {
  await addDoc(collection(db, 'comments'), {
    mediaId,
    text,
    userName,
    deviceId,
    createdAt: new Date().toISOString()
  });
};

export const deleteComment = async (commentId: string): Promise<void> => {
  await deleteDoc(doc(db, 'comments', commentId));
};

export const loadLikes = (callback: (likes: Like[]) => void): () => void => {
  const q = query(collection(db, 'likes'), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const likes: Like[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Like));
    
    console.log(`❤️ Loaded ${likes.length} likes`);
    callback(likes);
    
  }, (error) => {
    console.error('❌ Error loading likes:', error);
    callback([]);
  });
};

export const toggleLike = async (
  mediaId: string,
  userName: string,
  deviceId: string
): Promise<void> => {
  // Check if user already liked this media
  const likesQuery = query(
    collection(db, 'likes'),
    where('mediaId', '==', mediaId),
    where('userName', '==', userName),
    where('deviceId', '==', deviceId)
  );
  
  const likesSnapshot = await getDocs(likesQuery);
  
  if (likesSnapshot.empty) {
    // Add like
    await addDoc(collection(db, 'likes'), {
      mediaId,
      userName,
      deviceId,
      createdAt: new Date().toISOString()
    });
  } else {
    // Remove like
    const likeDoc = likesSnapshot.docs[0];
    await deleteDoc(doc(db, 'likes', likeDoc.id));
  }
};

// Profile management functions
export const loadProfile = (callback: (profile: ProfileData | null) => void): () => void => {
  const q = query(collection(db, 'profile'), orderBy('updatedAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      const profileDoc = snapshot.docs[0];
      const profile: ProfileData = {
        id: profileDoc.id,
        ...profileDoc.data()
      } as ProfileData;
      
      console.log('👤 Profile loaded:', profile.name);
      callback(profile);
    } else {
      console.log('👤 No profile found');
      callback(null);
    }
  }, (error) => {
    console.error('❌ Error loading profile:', error);
    callback(null);
  });
};

export const updateProfile = async (
  profileData: {
    profilePicture?: File | string;
    name: string;
    bio: string;
    countdownDate?: string;
    countdownEndMessage?: string;
    countdownMessageDismissed?: boolean;
  },
  userName: string
): Promise<void> => {
  try {
    let profilePictureUrl = profileData.profilePicture;
    
    // Upload new profile picture if it's a File
    if (profileData.profilePicture instanceof File) {
      const fileName = `profile-${Date.now()}-${profileData.profilePicture.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`); // Use uploads folder like other media
      await uploadBytes(storageRef, profileData.profilePicture);
      profilePictureUrl = await getDownloadURL(storageRef);
      console.log('📷 Profile picture uploaded:', fileName);
    }
    
    // Clean payload - remove undefined values to prevent Firebase errors
    const profilePayload: any = {
      name: profileData.name,
      bio: profileData.bio,
      updatedAt: new Date().toISOString(),
      updatedBy: userName
    };

    // Only add optional fields if they have values
    if (profilePictureUrl) {
      profilePayload.profilePicture = profilePictureUrl;
    }
    if (profileData.countdownDate) {
      profilePayload.countdownDate = profileData.countdownDate;
    }
    if (profileData.countdownEndMessage) {
      profilePayload.countdownEndMessage = profileData.countdownEndMessage;
    }
    if (profileData.countdownMessageDismissed !== undefined) {
      profilePayload.countdownMessageDismissed = profileData.countdownMessageDismissed;
    }
    
    // Check if profile already exists
    const profileQuery = query(collection(db, 'profile'));
    const profileSnapshot = await getDocs(profileQuery);
    
    if (!profileSnapshot.empty) {
      // Update existing profile
      const profileDoc = profileSnapshot.docs[0];
      await updateDoc(doc(db, 'profile', profileDoc.id), profilePayload);
      console.log('✅ Profile updated');
    } else {
      // Create new profile
      await addDoc(collection(db, 'profile'), profilePayload);
      console.log('✅ Profile created');
    }
    
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
};

// User Profile Functions
export const getUserProfile = async (userName: string, deviceId: string): Promise<UserProfile | null> => {
  try {
    const profilesRef = collection(db, 'userProfiles');
    const q = query(profilesRef, where('userName', '==', userName), where('deviceId', '==', deviceId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const createOrUpdateUserProfile = async (
  userName: string, 
  deviceId: string, 
  profileData: Partial<UserProfile>
): Promise<UserProfile> => {
  try {
    const existingProfile = await getUserProfile(userName, deviceId);
    
    if (existingProfile) {
      // Update existing profile
      const profileRef = doc(db, 'userProfiles', existingProfile.id);
      const updatedData = {
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      // Remove undefined values to prevent Firebase errors
      Object.keys(updatedData).forEach(key => {
        if (updatedData[key as keyof typeof updatedData] === undefined) {
          delete updatedData[key as keyof typeof updatedData];
        }
      });
      
      await updateDoc(profileRef, updatedData);
      return { ...existingProfile, ...updatedData };
    } else {
      // Create new profile
      const newProfile: Omit<UserProfile, 'id'> = {
        userName,
        deviceId,
        displayName: profileData.displayName || userName,
        profilePicture: profileData.profilePicture || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Remove undefined values to prevent Firebase errors
      Object.keys(newProfile).forEach(key => {
        if (newProfile[key as keyof typeof newProfile] === undefined) {
          delete newProfile[key as keyof typeof newProfile];
        }
      });
      
      const docRef = await addDoc(collection(db, 'userProfiles'), newProfile);
      return { id: docRef.id, ...newProfile };
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
};

export const uploadUserProfilePicture = async (
  file: File,
  userName: string,
  deviceId: string
): Promise<string> => {
  try {
    const fileName = `profile-${userName}-${deviceId}-${Date.now()}-${file.name}`;
    // Use uploads folder which has proper permissions
    const storageRef = ref(storage, `uploads/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    // Update user profile with new picture
    await createOrUpdateUserProfile(userName, deviceId, {
      profilePicture: downloadURL
    });
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    console.log('📊 Loading all user profiles from Firebase...');
    const profilesRef = collection(db, 'userProfiles');
    const querySnapshot = await getDocs(profilesRef);
    
    const profiles: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      profiles.push({
        id: doc.id,
        ...doc.data()
      } as UserProfile);
    });
    
    console.log(`👤 Found ${profiles.length} user profiles in database`);
    profiles.forEach(profile => {
      console.log(`  - ${profile.displayName || profile.userName} (${profile.userName}) [${profile.deviceId?.slice(0, 8)}...]`);
    });
    
    return profiles;
  } catch (error) {
    console.error('Error getting all user profiles:', error);
    return [];
  }
};

export const loadUserProfiles = (callback: (profiles: UserProfile[]) => void): () => void => {
  const profilesRef = collection(db, 'userProfiles');
  const q = query(profilesRef, orderBy('updatedAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const profiles: UserProfile[] = [];
    snapshot.forEach((doc) => {
      profiles.push({ id: doc.id, ...doc.data() } as UserProfile);
    });
    callback(profiles);
  });
  
  return unsubscribe;
};

// Promise-based version for one-time loading
export const getUserProfilesOnce = async (): Promise<UserProfile[]> => {
  try {
    const profilesRef = collection(db, 'userProfiles');
    const q = query(profilesRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const profiles: UserProfile[] = [];
    snapshot.forEach((doc) => {
      profiles.push({ id: doc.id, ...doc.data() } as UserProfile);
    });
    
    return profiles;
  } catch (error) {
    console.error('Error getting user profiles:', error);
    return [];
  }
};

// Media Tagging Functions
export const addMediaTag = async (
  mediaId: string,
  userName: string,
  deviceId: string,
  taggedBy: string,
  taggedByDeviceId: string
): Promise<MediaTag> => {
  try {
    const tagData = {
      mediaId,
      userName,
      deviceId,
      taggedBy,
      taggedByDeviceId,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'media_tags'), tagData);
    console.log(`✅ Tagged ${userName} in media ${mediaId}`);
    
    return {
      id: docRef.id,
      ...tagData
    };
  } catch (error) {
    console.error('Error adding media tag:', error);
    throw error;
  }
};

export const removeMediaTag = async (tagId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'media_tags', tagId));
    console.log(`✅ Removed media tag ${tagId}`);
  } catch (error) {
    console.error('Error removing media tag:', error);
    throw error;
  }
};

export const getMediaTags = (
  mediaId: string,
  callback: (tags: MediaTag[]) => void
): () => void => {
  const q = query(
    collection(db, 'media_tags'),
    where('mediaId', '==', mediaId)
  );

  return onSnapshot(q, (snapshot) => {
    const tags: MediaTag[] = [];
    snapshot.forEach((doc) => {
      tags.push({
        id: doc.id,
        ...doc.data()
      } as MediaTag);
    });
    // Sort tags by creation date in JavaScript
    tags.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(tags);
  });
};

export const getAllUsers = async (): Promise<Array<{userName: string, deviceId: string, displayName?: string}>> => {
  try {
    console.log('🔍 Fetching all users for tagging...');
    
    // Get users from live_users collection
    const usersQuery = query(collection(db, 'live_users'));
    const usersSnapshot = await getDocs(usersQuery);
    
    const users: Array<{userName: string, deviceId: string, displayName?: string}> = [];
    const seenUsers = new Set<string>();
    
    console.log(`📊 Found ${usersSnapshot.size} live user entries`);
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.userName && userData.deviceId) {
        const userKey = `${userData.userName}_${userData.deviceId}`;
        
        if (!seenUsers.has(userKey)) {
          seenUsers.add(userKey);
          users.push({
            userName: userData.userName,
            deviceId: userData.deviceId,
            displayName: userData.displayName || userData.userName
          });
        }
      }
    });
    
    console.log(`👥 Processed ${users.length} unique users`);
    
    // Also get user profiles for better display names
    try {
      const profilesQuery = query(collection(db, 'user_profiles'));
      const profilesSnapshot = await getDocs(profilesQuery);
      
      console.log(`👤 Found ${profilesSnapshot.size} user profiles`);
      
      const profileMap = new Map<string, string>();
      profilesSnapshot.forEach((doc) => {
        const profile = doc.data();
        if (profile.userName && profile.deviceId && profile.displayName) {
          const key = `${profile.userName}_${profile.deviceId}`;
          profileMap.set(key, profile.displayName);
        }
      });
      
      // Update display names from profiles
      users.forEach(user => {
        const key = `${user.userName}_${user.deviceId}`;
        if (profileMap.has(key)) {
          user.displayName = profileMap.get(key);
        }
      });
      
      console.log(`✅ Updated display names for ${profileMap.size} users`);
    } catch (profileError) {
      console.warn('Could not fetch user profiles:', profileError);
    }
    
    const sortedUsers = users.sort((a, b) => (a.displayName || a.userName).localeCompare(b.displayName || b.userName));
    console.log(`📋 Returning ${sortedUsers.length} users for tagging`);
    
    return sortedUsers;
  } catch (error) {
    console.error('❌ Error getting users for tagging:', error);
    return [];
  }
};

// Location Tagging Functions
export const addLocationTag = async (
  mediaId: string,
  locationData: {
    name: string;
    address?: string;
    coordinates?: { latitude: number; longitude: number };
    placeId?: string;
  },
  addedBy: string,
  addedByDeviceId: string
): Promise<string> => {
  try {
    // Clean the locationData to remove undefined values
    const cleanLocationData: any = {
      mediaId,
      name: locationData.name,
      addedBy,
      addedByDeviceId,
      createdAt: new Date().toISOString()
    };

    // Only add optional fields if they have values
    if (locationData.address) {
      cleanLocationData.address = locationData.address;
    }
    if (locationData.coordinates) {
      cleanLocationData.coordinates = locationData.coordinates;
    }
    if (locationData.placeId) {
      cleanLocationData.placeId = locationData.placeId;
    }

    const docRef = await addDoc(collection(db, 'location_tags'), cleanLocationData);
    console.log('✅ Location tag added:', locationData.name);
    return docRef.id;
  } catch (error) {
    console.error('❌ Failed to add location tag:', error);
    throw error;
  }
};

export const removeLocationTag = async (locationTagId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'location_tags', locationTagId));
    console.log('✅ Location tag removed');
  } catch (error) {
    console.error('❌ Failed to remove location tag:', error);
    throw error;
  }
};

export const getLocationTags = async (mediaId: string): Promise<LocationTag[]> => {
  try {
    const q = query(
      collection(db, 'location_tags'),
      where('mediaId', '==', mediaId)
    );
    
    const snapshot = await getDocs(q);
    const locationTags: LocationTag[] = [];
    
    snapshot.forEach((doc) => {
      locationTags.push({
        id: doc.id,
        ...doc.data()
      } as LocationTag);
    });
    
    return locationTags;
  } catch (error) {
    console.error('❌ Failed to get location tags:', error);
    return [];
  }
};

// Location Search using Browser Geolocation API with high accuracy
export const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    // First attempt with maximum accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('📍 GPS Location obtained:', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
        // Check if accuracy is reasonable (less than 1000m)
        if (position.coords.accuracy > 1000) {
          console.warn('⚠️ Location accuracy is poor:', position.coords.accuracy + 'm');
        }
        
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.warn('❌ High accuracy location failed:', error.message);
        
        // Fallback to lower accuracy if high accuracy fails
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('📍 Fallback GPS Location obtained:', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
            
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (fallbackError) => {
            console.error('❌ All location attempts failed:', fallbackError);
            reject(fallbackError);
          },
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 600000 // 10 minutes for fallback
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // Increased timeout for better accuracy
        maximumAge: 60000 // 1 minute for fresh location
      }
    );
  });
};

// Reverse geocoding using Google's Geocoding API for maximum accuracy
export const getLocationFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<{ name: string; address: string }> => {
  // Try Google Geocoding API first (most accurate)
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (googleApiKey) {
    try {
      console.log('🔍 Using Google Geocoding API for maximum accuracy...');
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}&language=de&region=de`,
        {
          method: 'GET'
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          return parseGoogleGeocodingResponse(data.results[0]);
        } else {
          console.warn('⚠️ Google Geocoding API returned no results:', data.status);
        }
      } else {
        console.warn('⚠️ Google Geocoding API request failed:', response.status);
      }
    } catch (error) {
      console.warn('❌ Google Geocoding API failed:', error);
    }
  } else {
    console.log('ℹ️ Google Maps API key not available, using fallback services');
  }

  // Fallback to OpenStreetMap services
  const geocodingServices = [
    {
      name: 'Nominatim',
      url: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&extratags=1`,
      headers: { 'User-Agent': 'Wedding-Gallery-App' }
    },
    {
      name: 'Photon',
      url: `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&limit=1`,
      headers: {}
    }
  ];

  for (const service of geocodingServices) {
    try {
      console.log(`🔍 Trying ${service.name} geocoding service...`);
      
      const response = await fetch(service.url, {
        headers: service.headers
      });
      
      if (!response.ok) {
        console.warn(`⚠️ ${service.name} service failed:`, response.status);
        continue;
      }
      
      const data = await response.json();
      
      if (service.name === 'Nominatim') {
        return parseNominatimResponse(data);
      } else if (service.name === 'Photon') {
        return parsePhotonResponse(data);
      }
    } catch (error) {
      console.warn(`❌ ${service.name} geocoding failed:`, error);
      continue;
    }
  }

  // Final fallback
  console.error('❌ All geocoding services failed');
  return {
    name: 'Current Location',
    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  };
};

// Parse Google Geocoding API response for optimal accuracy
const parseGoogleGeocodingResponse = (result: any): { name: string; address: string } => {
  const addressComponents = result.address_components || [];
  const locationParts = [];
  
  // Extract components in order of specificity
  const getComponent = (types: string[]) => {
    return addressComponents.find((comp: any) => 
      types.some(type => comp.types.includes(type))
    )?.long_name;
  };
  
  // Try to get the most specific location first (excluding street details)
  const establishment = getComponent(['establishment', 'point_of_interest']);
  const locality = getComponent(['locality', 'sublocality']);
  const adminLevel2 = getComponent(['administrative_area_level_2']);
  const adminLevel1 = getComponent(['administrative_area_level_1']);
  const country = getComponent(['country']);
  
  // Build location name prioritizing specific places (no street names)
  if (establishment) {
    locationParts.push(establishment);
  }
  
  // Add locality (city/town/village)
  if (locality) {
    locationParts.push(locality);
  }
  
  // Add administrative area (state/region) if different from locality
  if (adminLevel1 && adminLevel1 !== locality) {
    locationParts.push(adminLevel1);
  }
  
  // Add country
  if (country) {
    locationParts.push(country);
  }
  
  const name = locationParts.length > 0 ? locationParts.join(', ') : 'Current Location';
  const fullAddress = result.formatted_address || name;
  
  console.log('📍 Google Geocoding parsed location:', { name, fullAddress });
  
  return { name, address: fullAddress };
};

// Parse Nominatim response with enhanced accuracy for German locations
const parseNominatimResponse = (data: any): { name: string; address: string } => {
  const address = data.address || {};
  const locationParts = [];
  
  // For German locations, prioritize proper city/town/village identification
  if (address.village) {
    locationParts.push(address.village);
  } else if (address.town) {
    locationParts.push(address.town);
  } else if (address.city) {
    locationParts.push(address.city);
  } else if (address.municipality) {
    locationParts.push(address.municipality);
  }
  
  // Add specific location details if available (excluding street details)
  if (address.tourism) {
    locationParts.unshift(address.tourism);
  } else if (address.amenity) {
    locationParts.unshift(address.amenity);
  } else if (address.shop) {
    locationParts.unshift(address.shop);
  }
  
  // Add state/region for context
  if (address.state && address.state !== address.city && address.state !== address.town && address.state !== address.village) {
    locationParts.push(address.state);
  }
  
  // Add country
  if (address.country) {
    locationParts.push(address.country);
  }
  
  const name = locationParts.length > 0 ? locationParts.join(', ') : 'Current Location';
  const fullAddress = data.display_name || 'Unknown Address';
  
  console.log('📍 Nominatim parsed location:', { name, fullAddress });
  
  return { name, address: fullAddress };
};

// Parse Photon response
const parsePhotonResponse = (data: any): { name: string; address: string } => {
  if (!data.features || data.features.length === 0) {
    throw new Error('No results from Photon service');
  }
  
  const feature = data.features[0];
  const props = feature.properties || {};
  const locationParts = [];
  
  if (props.name) {
    locationParts.push(props.name);
  }
  
  if (props.city) {
    locationParts.push(props.city);
  } else if (props.district) {
    locationParts.push(props.district);
  }
  
  if (props.state) {
    locationParts.push(props.state);
  }
  
  if (props.country) {
    locationParts.push(props.country);
  }
  
  const name = locationParts.length > 0 ? locationParts.join(', ') : 'Current Location';
  const fullAddress = props.label || name;
  
  console.log('📍 Photon parsed location:', { name, fullAddress });
  
  return { name, address: fullAddress };
};

// Location search using Google Places API for better establishment results
export const searchLocations = async (query: string): Promise<Array<{
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  placeId?: string;
}>> => {
  if (!query.trim() || query.trim().length < 3) {
    return [];
  }

  try {
    // Import location service dynamically
    const { searchLocations: locationSearch } = await import('./locationService');
    const results = await locationSearch(query);
    
    console.log('🔍 Location search results:', results.length);
    
    // Transform results to match expected interface
    return results.map(result => ({
      name: result.name,
      address: result.address,
      coordinates: result.coordinates,
      placeId: result.placeId
    }));
    
  } catch (error) {
    console.error('❌ Google Places search failed, using fallback:', error);
    
    // Fallback to German locations based on query
    const lowerQuery = query.toLowerCase();
    const fallbackLocations: Array<{
      name: string;
      address: string;
      coordinates?: { latitude: number; longitude: number };
      placeId?: string;
    }> = [];
    
    if (lowerQuery.includes('restaurant') || lowerQuery.includes('essen')) {
      fallbackLocations.push(
        { name: 'Restaurant Zur Post, Berlin', address: 'Zur Post, Mitte, Berlin, Deutschland' },
        { name: 'Gasthof zum Hirsch, München', address: 'Gasthof zum Hirsch, Altstadt, München, Deutschland' },
        { name: 'Restaurant Hafen Hamburg', address: 'Hafenrestaurant, HafenCity, Hamburg, Deutschland' }
      );
    }
    
    if (lowerQuery.includes('bar') || lowerQuery.includes('cocktail')) {
      fallbackLocations.push(
        { name: 'Bar Centrale, Berlin', address: 'Bar Centrale, Prenzlauer Berg, Berlin, Deutschland' },
        { name: 'Cocktailbar 1895, München', address: 'Cocktailbar 1895, Maxvorstadt, München, Deutschland' },
        { name: 'Harry\'s New York Bar, Hamburg', address: 'Harry\'s New York Bar, St. Pauli, Hamburg, Deutschland' }
      );
    }
    
    if (lowerQuery.includes('cafe') || lowerQuery.includes('kaffee')) {
      fallbackLocations.push(
        { name: 'Café Einstein, Berlin', address: 'Café Einstein, Unter den Linden, Berlin, Deutschland' },
        { name: 'Café Luitpold, München', address: 'Café Luitpold, Maximilianstraße, München, Deutschland' },
        { name: 'Café Paris, Hamburg', address: 'Café Paris, Rotherbaum, Hamburg, Deutschland' }
      );
    }
    
    if (lowerQuery.includes('hotel')) {
      fallbackLocations.push(
        { name: 'Hotel Adlon, Berlin', address: 'Hotel Adlon Kempinski, Unter den Linden, Berlin, Deutschland' },
        { name: 'Hotel Vier Jahreszeiten, München', address: 'Hotel Vier Jahreszeiten, Maximilianstraße, München, Deutschland' },
        { name: 'Hotel Atlantic, Hamburg', address: 'Hotel Atlantic Kempinski, St. Georg, Hamburg, Deutschland' }
      );
    }
    
    // Generic fallback for any search
    if (fallbackLocations.length === 0) {
      fallbackLocations.push(
        { name: `${query}, Berlin`, address: `${query}, Berlin, Deutschland` },
        { name: `${query}, München`, address: `${query}, München, Deutschland` },
        { name: `${query}, Hamburg`, address: `${query}, Hamburg, Deutschland` }
      );
    }
    
    return fallbackLocations.slice(0, 5);
  }
};

// Add notification function
export const addNotification = async (
  targetUser: string,
  targetDeviceId: string,
  type: 'tagged' | 'comment' | 'like',
  message: string,
  mediaId?: string,
  mediaUrl?: string
): Promise<void> => {
  try {
    // Create base notification object
    const notificationData: any = {
      type,
      message,
      targetUser,
      targetDeviceId,
      read: false,
      createdAt: new Date().toISOString()
    };

    // Only add optional fields if they have values
    if (mediaId !== undefined && mediaId !== null) {
      notificationData.mediaId = mediaId;
    }
    
    if (mediaUrl !== undefined && mediaUrl !== null) {
      notificationData.mediaUrl = mediaUrl;
    }

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
};

// Create a test notification for debugging
export const createTestNotification = async (userName: string, deviceId: string) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      type: 'test',
      title: 'Test Benachrichtigung',
      message: 'Dies ist eine Test-Benachrichtigung um das System zu überprüfen',
      targetUser: userName,
      targetDeviceId: deviceId,
      fromUser: 'System',
      fromDeviceId: 'test',
      mediaId: 'test',
      mediaUrl: '',
      read: false,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Test notification created');
  } catch (error) {
    console.error('❌ Failed to create test notification:', error);
    throw error;
  }
};