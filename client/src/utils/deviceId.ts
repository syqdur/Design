import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'deviceId'; // Primary key for device ID
const USER_NAME_KEY = 'userName'; // Primary key for username

export const getDeviceId = (): string => {
  // Check for device ID in localStorage using consistent key
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  // Additional safety: check sessionStorage to prevent cross-tab ID mixing
  const sessionDeviceId = sessionStorage.getItem(DEVICE_ID_KEY);
  
  // If no device ID found, generate a new one
  if (!deviceId) {
    deviceId = generateNewDeviceId();
    console.log(`🆔 Generated new device ID: ${deviceId}`);
  } else if (sessionDeviceId && sessionDeviceId !== deviceId) {
    // Potential ID conflict - use the localStorage version but log warning
    console.warn(`⚠️ Device ID mismatch detected! localStorage: ${deviceId}, sessionStorage: ${sessionDeviceId}`);
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId); // Sync sessionStorage
  } else if (!sessionDeviceId) {
    // Ensure sessionStorage has the device ID
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  // Always return the same device ID for this browser session
  return deviceId;
};

// Generate a new device ID and store it properly
export const generateNewDeviceId = (): string => {
  const newDeviceId = uuidv4();
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  sessionStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  console.log(`🆔 Generated and stored new device ID: ${newDeviceId}`);
  return newDeviceId;
};

export const getUserName = (): string | null => {
  return localStorage.getItem(USER_NAME_KEY);
};

export const setUserName = (name: string): void => {
  localStorage.setItem(USER_NAME_KEY, name);
};

export const clearUserData = (): void => {
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem('admin_status');
  sessionStorage.removeItem(USER_NAME_KEY);
  sessionStorage.removeItem(DEVICE_ID_KEY);
  console.log(`🧹 Cleared all user data from localStorage and sessionStorage`);
};

// Force a complete identity reset - generates new device ID and clears all data
export const forceNewIdentity = (): string => {
  console.log(`🔄 Forcing complete identity reset...`);
  
  // Clear all existing data
  localStorage.clear();
  sessionStorage.clear();
  
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
  
  (window as any).debugForceNewUser = () => {
    console.log(`🔧 DEBUG: Creating completely new user identity...`);
    localStorage.clear();
    sessionStorage.clear();
    const newId = generateNewDeviceId();
    console.log(`🔧 DEBUG: Generated new device ID: ${newId}`);
    console.log(`🔧 DEBUG: All localStorage and sessionStorage cleared`);
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