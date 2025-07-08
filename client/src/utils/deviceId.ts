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
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
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