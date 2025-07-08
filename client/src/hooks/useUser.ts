import { useState, useEffect } from 'react';
import { getDeviceId, getUserName, setUserName } from '../utils/deviceId';

export const useUser = () => {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    // Always get a fresh device ID on component mount
    const currentDeviceId = getDeviceId();
    setDeviceId(currentDeviceId);
    
    // Check if user was deleted and clear the flag after reload
    if (localStorage.getItem('userDeleted') === 'true') {
      console.log(`🧹 Clearing userDeleted flag after reload`);
      localStorage.clear(); // Clear everything including the flag
      // After clearing, get a new device ID
      const newDeviceId = getDeviceId();
      setDeviceId(newDeviceId);
      setShowNamePrompt(true);
      return;
    }
    
    const storedName = getUserName();
    
    // Validate that device ID and username are properly paired
    if (storedName && currentDeviceId) {
      console.log(`🔍 Validating user identity: ${storedName} (${currentDeviceId})`);
      setUserNameState(storedName);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  const handleSetUserName = async (name: string, profilePicture?: File) => {
    setUserName(name);
    setUserNameState(name);
    setShowNamePrompt(false);
    
    // Log new visitor connection for profile sync
    console.log(`👋 New visitor connected: ${name} (${deviceId})`);
    
    // Trigger a window event to notify App component to resync profiles
    window.dispatchEvent(new CustomEvent('userConnected', { 
      detail: { userName: name, deviceId: deviceId, profilePicture } 
    }));
  };

  return {
    userName,
    deviceId,
    showNamePrompt,
    setUserName: handleSetUserName
  };
};