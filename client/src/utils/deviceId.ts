import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'deviceId'; // Updated to match localStorage usage
const USER_NAME_KEY = 'userName'; // Updated to match localStorage usage

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    console.log(`🆔 Generated new device ID: ${deviceId}`);
  }
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
  console.log(`🧹 Cleared all user data from localStorage`);
};