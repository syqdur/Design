import { useState, useEffect } from 'react';
import { getDeviceId, getUserName, setUserName } from '../utils/deviceId';

export const useUser = () => {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [deviceId] = useState<string>(getDeviceId());
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    // Check if user was deleted and clear the flag after reload
    if (localStorage.getItem('userDeleted') === 'true') {
      console.log(`🧹 Clearing userDeleted flag after reload`);
      localStorage.clear(); // Clear everything including the flag
    }
    
    const storedName = getUserName();
    if (storedName) {
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
    console.log(`👋 New visitor connected: ${name} (${getDeviceId()})`);
    
    // Trigger a window event to notify App component to resync profiles
    window.dispatchEvent(new CustomEvent('userConnected', { 
      detail: { userName: name, deviceId: getDeviceId(), profilePicture } 
    }));
  };

  return {
    userName,
    deviceId,
    showNamePrompt,
    setUserName: handleSetUserName
  };
};