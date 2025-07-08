import { v4 as uuidv4 } from 'uuid';
import { userRegistry } from './userRegistry';

// Check if device ID already exists in Firebase
const checkDeviceIdInFirebase = async (deviceId: string): Promise<boolean> => {
  try {
    // Import Firebase here to avoid circular dependencies
    const { db } = await import('../config/firebase');
    const { query, collection, where, getDocs } = await import('firebase/firestore');
    
    const q = query(collection(db, 'userProfiles'), where('deviceId', '==', deviceId));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.warn(`⚠️ Could not check Firebase for device ID collision:`, error);
    return false; // Assume false if we can't check
  }
};

const DEVICE_ID_KEY = 'deviceId'; // Primary key for device ID
const USER_NAME_KEY = 'userName'; // Primary key for username

export const getDeviceId = (): string => {
  // Check for device ID in localStorage first
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  // If no device ID found, generate a completely new one (synchronously for now)
  if (!deviceId) {
    deviceId = uuidv4(); // Fallback to simple UUID for immediate return
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    
    // Asynchronously generate a better unique device ID in the background
    generateNewDeviceId().then(newId => {
      if (newId !== deviceId) {
        localStorage.setItem(DEVICE_ID_KEY, newId);
        console.log(`🔄 Updated device ID to more unique version: ${newId}`);
      }
    }).catch(error => {
      console.warn(`⚠️ Could not generate enhanced device ID:`, error);
    });
    
    console.log(`🆔 Generated new device ID: ${deviceId}`);
    userRegistry.registerDeviceId(deviceId);
    return deviceId;
  }
  
  // Validate the device ID format (should be a valid UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(deviceId)) {
    console.warn(`⚠️ Invalid device ID format detected: ${deviceId}. Generating new one.`);
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    userRegistry.registerDeviceId(deviceId);
    return deviceId;
  }
  
  // Additional check: ensure device ID is not empty or corrupted
  if (deviceId.length < 36) {
    console.warn(`⚠️ Corrupted device ID detected: ${deviceId}. Generating new one.`);
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    userRegistry.registerDeviceId(deviceId);
    return deviceId;
  }
  
  // Register the existing device ID in the registry
  userRegistry.registerDeviceId(deviceId);
  
  // Always return the same device ID for this browser
  return deviceId;
};

// Generate a new device ID and store it properly
export const generateNewDeviceId = async (): Promise<string> => {
  let attempts = 0;
  let newDeviceId: string;
  
  do {
    // Generate a truly unique device ID with browser fingerprint + timestamp to prevent conflicts
    const timestamp = Date.now();
    const randomSeed = Math.random().toString(36).substring(2, 15);
    const browserFingerprint = navigator.userAgent.slice(-8) + window.screen.width + window.screen.height;
    const hashBase = `${timestamp}-${randomSeed}-${browserFingerprint}`;
    
    // Create a UUID-like format but with guaranteed uniqueness
    const uuid = uuidv4();
    newDeviceId = `${uuid.substring(0, 8)}-${uuid.substring(9, 13)}-${uuid.substring(14, 18)}-${uuid.substring(19, 23)}-${timestamp.toString(16)}${randomSeed}`.substring(0, 36);
    
    attempts++;
    
    // Prevent infinite loop
    if (attempts > 10) {
      console.error(`❌ Could not generate unique device ID after ${attempts} attempts`);
      newDeviceId = uuidv4(); // Fallback to simple UUID
      break;
    }
    
    // Check if this device ID already exists in Firebase (more reliable than local registry)
    const existsInFirebase = await checkDeviceIdInFirebase(newDeviceId);
    if (!existsInFirebase && !userRegistry.isDeviceIdInUse(newDeviceId)) {
      break;
    }
    
    console.warn(`⚠️ Device ID collision detected (attempt ${attempts}): ${newDeviceId.substring(0, 8)}...`);
  } while (attempts <= 10);
  
  // Register the new device ID
  userRegistry.registerDeviceId(newDeviceId);
  
  // Only store in localStorage - avoid sessionStorage to prevent cross-tab conflicts
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  console.log(`🆔 Generated and stored unique device ID: ${newDeviceId}`);
  return newDeviceId;
};

export const getUserName = (): string | null => {
  return localStorage.getItem(USER_NAME_KEY);
};

export const setUserName = (name: string): void => {
  localStorage.setItem(USER_NAME_KEY, name);
};

export const clearUserData = (): void => {
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (deviceId) {
    userRegistry.unregisterDeviceId(deviceId);
  }
  
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem('admin_status');
  localStorage.removeItem('userDeleted');
  console.log(`🧹 Cleared all user data from localStorage`);
};

// Force a complete identity reset - generates new device ID and clears all data
export const forceNewIdentity = (): string => {
  console.log(`🔄 Forcing complete identity reset...`);
  
  // Clear all existing data
  localStorage.clear();
  
  // Generate completely new device ID
  const newDeviceId = generateNewDeviceId();
  
  console.log(`✅ Identity reset complete. New device ID: ${newDeviceId}`);
  console.log(`🔄 Please refresh the page to complete the reset.`);
  return newDeviceId;
};

// Debug function - make it available globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).debugResetIdentity = () => {
    console.log(`🔧 DEBUG: Resetting user identity...`);
    const newId = forceNewIdentity();
    console.log(`🔧 DEBUG: New device ID generated: ${newId}`);
    console.log(`🔧 DEBUG: Reload the page to complete reset.`);
    return newId;
  };
  
  (window as any).debugShowCurrentId = () => {
    const currentId = localStorage.getItem(DEVICE_ID_KEY);
    const currentUser = localStorage.getItem(USER_NAME_KEY);
    console.log(`🔧 DEBUG: Current device ID: ${currentId}`);
    console.log(`🔧 DEBUG: Current username: ${currentUser}`);
    return { deviceId: currentId, userName: currentUser };
  };
  
  (window as any).debugForceNewUser = async () => {
    console.log(`🔧 DEBUG: Creating completely new user identity...`);
    localStorage.clear();
    const newId = await generateNewDeviceId();
    console.log(`🔧 DEBUG: Generated new device ID: ${newId}`);
    console.log(`🔧 DEBUG: All localStorage cleared`);
    console.log(`🔧 DEBUG: Reload the page to start fresh with a new username prompt`);
    return newId;
  };
  
  (window as any).debugFixContamination = () => {
    console.log(`🔧 DEBUG: Fixing profile contamination for current user...`);
    const currentUser = localStorage.getItem('userName');
    const currentDevice = localStorage.getItem('deviceId');
    console.log(`👤 Current User: ${currentUser}`);
    console.log(`📱 Current Device: ${currentDevice}`);
    
    if (currentUser && currentDevice) {
      // Clear any contaminated profile data
      localStorage.removeItem('userDeleted');
      localStorage.removeItem('admin_status');
      console.log(`🧹 Cleared contaminated profile flags`);
      console.log(`🔧 Reload the page to reset profile data`);
      return { user: currentUser, device: currentDevice };
    } else {
      console.log(`❌ No user/device found - use debugForceNewUser() instead`);
      return null;
    }
  };
}