// Device ID validation and collision detection utility
import { db } from '../config/firebase';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { getDeviceId, generateNewDeviceId, forceNewIdentity } from './deviceId';

export interface DeviceIdValidationResult {
  isValid: boolean;
  isUnique: boolean;
  conflictingUsers?: string[];
  recommendation: 'keep' | 'regenerate' | 'force_reset';
}

// Validate current device ID against Firebase
export const validateCurrentDeviceId = async (): Promise<DeviceIdValidationResult> => {
  try {
    const currentDeviceId = getDeviceId();
    const currentUser = localStorage.getItem('userName');
    
    console.log(`🔍 Validating device ID: ${currentDeviceId.substring(0, 8)}... for user: ${currentUser}`);
    
    // Check for any existing users with this device ID
    const q = query(collection(db, 'userProfiles'), where('deviceId', '==', currentDeviceId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // No conflicts - device ID is unique
      console.log(`✅ Device ID is unique - no conflicts found`);
      return {
        isValid: true,
        isUnique: true,
        recommendation: 'keep'
      };
    }
    
    // Check if the existing user is the same as current user
    const conflictingUsers: string[] = [];
    let isCurrentUserProfile = false;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userName === currentUser) {
        isCurrentUserProfile = true;
      } else {
        conflictingUsers.push(data.userName);
      }
    });
    
    if (isCurrentUserProfile && conflictingUsers.length === 0) {
      // This is the current user's own profile - valid
      console.log(`✅ Device ID belongs to current user - valid`);
      return {
        isValid: true,
        isUnique: true,
        recommendation: 'keep'
      };
    }
    
    if (conflictingUsers.length > 0) {
      // Device ID collision detected!
      console.error(`❌ Device ID collision detected! Conflicting users: ${conflictingUsers.join(', ')}`);
      return {
        isValid: false,
        isUnique: false,
        conflictingUsers,
        recommendation: 'force_reset'
      };
    }
    
    // Multiple profiles for same user - regenerate to clean up
    console.warn(`⚠️ Multiple profiles found for same user - recommending regeneration`);
    return {
      isValid: true,
      isUnique: false,
      recommendation: 'regenerate'
    };
    
  } catch (error) {
    console.error(`❌ Error validating device ID:`, error);
    return {
      isValid: false,
      isUnique: false,
      recommendation: 'regenerate'
    };
  }
};

// Fix device ID conflicts
export const fixDeviceIdConflicts = async (): Promise<string> => {
  const validation = await validateCurrentDeviceId();
  
  switch (validation.recommendation) {
    case 'keep':
      console.log(`✅ Device ID is valid - no action needed`);
      return getDeviceId();
      
    case 'regenerate':
      console.log(`🔄 Regenerating device ID for better uniqueness...`);
      const newId = await generateNewDeviceId();
      window.location.reload(); // Reload to apply new ID
      return newId;
      
    case 'force_reset':
      console.log(`🚨 Forcing complete identity reset due to conflicts...`);
      const resetId = forceNewIdentity();
      alert(`Device ID conflict detected! Your identity has been reset. Please refresh the page and enter your name again.`);
      window.location.reload();
      return resetId;
      
    default:
      return getDeviceId();
  }
};

// Auto-validate on app startup (call this from App.tsx)
export const autoValidateDeviceId = async (): Promise<void> => {
  try {
    const validation = await validateCurrentDeviceId();
    
    if (!validation.isValid || !validation.isUnique) {
      console.warn(`⚠️ Device ID validation failed - attempting automatic fix`);
      await fixDeviceIdConflicts();
    }
  } catch (error) {
    console.error(`❌ Auto-validation failed:`, error);
  }
};