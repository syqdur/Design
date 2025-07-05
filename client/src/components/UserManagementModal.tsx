import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Smartphone, Wifi, WifiOff, Clock, RefreshCw, XCircle, Eye, Trash2, AlertTriangle, CheckSquare, Square, Camera, Upload } from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  where,
  getDocs,
  doc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadUserProfilePicture, createOrUpdateUserProfile } from '../services/firebaseService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  getUserAvatar?: (userName: string, deviceId?: string) => string | null;
  getUserDisplayName?: (userName: string, deviceId?: string) => string;
}

interface LiveUser {
  id: string;
  userName: string;
  deviceId: string;
  lastSeen: string;
  isActive: boolean;
}

interface UserInfo {
  userName: string;
  deviceId: string;
  lastSeen: string;
  isOnline: boolean;
  contributionCount: number;
  lastActivity: string;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  getUserAvatar,
  getUserDisplayName
}) => {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string>('');
  const [deletingUser, setDeletingUser] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [uploadingProfilePic, setUploadingProfilePic] = useState<string>('');
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'vor wenigen Minuten';
    if (diffInHours === 1) return 'vor 1 Stunde';
    if (diffInHours < 24) return `vor ${diffInHours} Stunden`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'gestern';
    return `vor ${diffInDays} Tagen`;
  };

  const loadUserData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userMap = new Map<string, UserInfo>();
      
      // Load from live_users collection
      const liveUsersQuery = collection(db, 'live_users');
      const liveUsersSnapshot = await getDocs(liveUsersQuery);
      
      liveUsersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userName && data.deviceId) {
          const userKey = `${data.userName}-${data.deviceId}`;
          
          // Handle different timestamp formats
          let lastSeenTime;
          try {
            if (data.lastSeen && typeof data.lastSeen.toDate === 'function') {
              lastSeenTime = data.lastSeen.toDate();
            } else if (data.lastSeen) {
              lastSeenTime = new Date(data.lastSeen);
            } else {
              lastSeenTime = new Date();
            }
          } catch (e) {
            lastSeenTime = new Date();
          }
          
          const isRecent = (new Date().getTime() - lastSeenTime.getTime()) < 5 * 60 * 1000;
          
          userMap.set(userKey, {
            userName: data.userName,
            deviceId: data.deviceId,
            lastSeen: lastSeenTime.toISOString(),
            isOnline: isRecent,
            contributionCount: data.contributionCount || 0,
            lastActivity: formatTimeAgo(lastSeenTime.toISOString())
          });
        }
      });

      // Load from userProfiles database
      const profilesQuery = collection(db, 'userProfiles');
      const profilesSnapshot = await getDocs(profilesQuery);
      
      profilesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userName && data.deviceId) {
          const userKey = `${data.userName}-${data.deviceId}`;
          if (!userMap.has(userKey)) {
            userMap.set(userKey, {
              userName: data.userName,
              deviceId: data.deviceId,
              lastSeen: data.createdAt || new Date().toISOString(),
              isOnline: false,
              contributionCount: 0,
              lastActivity: 'Profil erstellt'
            });
          }
        }
      });

      setUsers(Array.from(userMap.values()));
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error('Error loading user data:', error);
      console.error('Error details:', error?.message || 'Unknown error');
      setError(`Fehler beim Laden der Benutzerdaten: ${error?.message || 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const triggerFileInput = (userName: string, deviceId: string) => {
    const userKey = `${userName}-${deviceId}`;
    fileInputRefs.current[userKey]?.click();
  };

  const handleFileChange = async (userName: string, deviceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const userKey = `${userName}-${deviceId}`;
    setUploadingProfilePic(userKey);

    try {
      const profilePictureUrl = await uploadUserProfilePicture(file, userName, deviceId);

      // Trigger profile updated event
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { userName, deviceId, profilePicture: profilePictureUrl }
      }));

      // Refresh user data
      await loadUserData();
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setError('Fehler beim Hochladen des Profilbilds');
    } finally {
      setUploadingProfilePic('');
      // Reset file input
      const input = fileInputRefs.current[userKey];
      if (input) input.value = '';
    }
  };

  const startDeleteUser = (userName: string, deviceId: string) => {
    const userKey = `${userName}-${deviceId}`;
    setDeleteConfirm(userKey);
  };

  const bulkDeleteUsers = async () => {
    if (!showBulkConfirm) {
      setShowBulkConfirm(true);
      return;
    }

    setBulkDeleting(true);
    setShowBulkConfirm(false);
    
    try {
      const batch = writeBatch(db);
      
      for (const userKey of Array.from(selectedUsers)) {
        if (userKey.length < 37) continue;
        
        const deviceId = userKey.slice(-36);
        const userName = userKey.slice(0, -37);
        
        // Delete from live_users collection
        const liveUsersQuery = query(
          collection(db, 'live_users'),
          where('deviceId', '==', deviceId)
        );
        const liveUsersSnapshot = await getDocs(liveUsersQuery);
        liveUsersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        
        // Delete from userProfiles collection
        const profilesQuery = query(
          collection(db, 'userProfiles'),
          where('deviceId', '==', deviceId)
        );
        const profilesSnapshot = await getDocs(profilesQuery);
        profilesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      }
      
      await batch.commit();
      setSelectedUsers(new Set());
      await loadUserData();
      
    } catch (error) {
      console.error('Error in bulk delete:', error);
      setError('Fehler beim Löschen der Benutzer');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleUserSelection = (userName: string, deviceId: string) => {
    const userKey = `${userName}-${deviceId}`;
    const newSelection = new Set(selectedUsers);
    
    if (newSelection.has(userKey)) {
      newSelection.delete(userKey);
    } else {
      newSelection.add(userKey);
    }
    
    setSelectedUsers(newSelection);
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      const allUserKeys = users.map(user => `${user.userName}-${user.deviceId}`);
      setSelectedUsers(new Set(allUserKeys));
    }
  };

  const deleteUser = async (userName: string, deviceId: string) => {
    const userKey = `${userName}-${deviceId}`;
    
    if (deleteConfirm !== userKey) return;
    
    setDeletingUser(userKey);
    setDeleteConfirm('');
    
    try {
      const batch = writeBatch(db);
      
      // Delete from live_users collection
      const liveUsersQuery = query(
        collection(db, 'live_users'),
        where('deviceId', '==', deviceId)
      );
      const liveUsersSnapshot = await getDocs(liveUsersQuery);
      liveUsersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Delete from userProfiles collection
      const profilesQuery = query(
        collection(db, 'userProfiles'),
        where('deviceId', '==', deviceId)
      );
      const profilesSnapshot = await getDocs(profilesQuery);
      profilesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      await loadUserData();
      
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Fehler beim Löschen des Benutzers');
    } finally {
      setDeletingUser('');
    }
  };

  const stats = {
    onlineUsers: users.filter(u => u.isOnline).length,
    totalUsers: users.length,
    totalContributions: users.reduce((sum, u) => sum + u.contributionCount, 0)
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header - Mobile Optimized */}
        <div className={`p-4 sm:p-6 border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className={`p-2 sm:p-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-cyan-600' : 'bg-cyan-500'
              }`}>
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-lg sm:text-xl font-semibold transition-colors duration-300 truncate ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  👥 User Management
                </h3>
                <p className={`text-xs sm:text-sm transition-colors duration-300 hidden sm:block ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Alle Benutzer und deren Status im Überblick
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={loadUserData}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isLoading 
                    ? 'cursor-not-allowed opacity-50' 
                    : isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Daten aktualisieren"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bulk Actions Row - Mobile Optimized */}
          {selectedUsers.size > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className={`text-sm font-medium transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {selectedUsers.size} ausgewählt
              </span>
              <div className="flex items-center gap-2">
                {bulkDeleting ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500 text-white">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Löschen...</span>
                  </div>
                ) : showBulkConfirm ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={bulkDeleteUsers}
                      className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition-colors duration-200"
                      title="Löschen bestätigen"
                    >
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      <span className="hidden sm:inline">Bestätigen</span>
                      <span className="sm:hidden">OK</span>
                    </button>
                    <button
                      onClick={() => setShowBulkConfirm(false)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${
                        isDarkMode 
                          ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                      }`}
                    >
                      <span className="hidden sm:inline">Abbrechen</span>
                      <span className="sm:hidden">X</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={bulkDeleteUsers}
                    className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition-colors duration-200"
                    title="Ausgewählte Benutzer löschen"
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    Löschen
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-4 sm:p-6 max-h-[70vh] overflow-auto transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`p-4 rounded-xl text-center transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
              }`}>
                {stats.onlineUsers}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Online
              </div>
            </div>
            <div className={`p-4 rounded-xl text-center transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {stats.totalUsers}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Gesamt
              </div>
            </div>
            <div className={`p-4 rounded-xl text-center transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
            }`}>
              <div className={`text-2xl font-bold transition-colors duration-300 ${
                isDarkMode ? 'text-purple-400' : 'text-purple-600'
              }`}>
                {stats.totalContributions}
              </div>
              <div className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Beiträge
              </div>
            </div>
          </div>

          {/* Last Update Info */}
          <div className={`flex items-center justify-between mb-4 text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Letztes Update: {lastUpdate.toLocaleTimeString('de-DE')}</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Auto-Refresh: deaktiviert</span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className={`transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Lade Benutzerdaten...
                </span>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {!isLoading && users.length > 0 && (
            <div className="mb-4">
              <button
                onClick={selectAllUsers}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title={selectedUsers.size === users.length ? "Alle abwählen" : "Alle auswählen"}
              >
                {selectedUsers.size === users.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {selectedUsers.size === users.length ? "Alle abwählen" : "Alle auswählen"}
                </span>
              </button>
            </div>
          )}

          {/* Users Cards - Mobile Friendly */}
          {!isLoading && users.length > 0 && (
            <div className="space-y-4">
              {users.map((user, index) => {
                const userKey = `${user.userName}-${user.deviceId}`;
                const isSelected = selectedUsers.has(userKey);
                
                return (
                  <div 
                    key={userKey} 
                    className={`p-4 rounded-xl border transition-all duration-300 ${
                      isSelected 
                        ? isDarkMode 
                          ? 'bg-blue-900/30 border-blue-600/50' 
                          : 'bg-blue-50 border-blue-200'
                        : isDarkMode 
                          ? 'bg-gray-800/60 border-gray-700/50 hover:bg-gray-800/80' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* Mobile Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      {/* User Info with Avatar */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Selection Checkbox */}
                        <button
                          onClick={() => toggleUserSelection(user.userName, user.deviceId)}
                          className={`flex-shrink-0 p-1 rounded transition-colors duration-200 ${
                            isSelected
                              ? 'text-blue-500'
                              : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-300 border-2 ${
                            user.isOnline
                              ? isDarkMode ? 'bg-green-600 text-white border-green-400' : 'bg-green-500 text-white border-green-300'
                              : isDarkMode ? 'bg-gray-600 text-gray-300 border-gray-500' : 'bg-gray-300 text-gray-700 border-gray-200'
                          }`}>
                            {getUserAvatar?.(user.userName, user.deviceId) ? (
                              <img 
                                src={getUserAvatar(user.userName, user.deviceId)!}
                                alt={user.userName}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span>{user.userName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          
                          {/* Hidden File Input */}
                          <input
                            ref={(el) => fileInputRefs.current[userKey] = el}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileChange(user.userName, user.deviceId, e)}
                            className="hidden"
                          />
                        </div>

                        {/* Profile Picture Upload Button - Separate from profile picture */}
                        <button
                          onClick={() => triggerFileInput(user.userName, user.deviceId)}
                          disabled={uploadingProfilePic === userKey}
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-200 ${
                            uploadingProfilePic === userKey
                              ? 'bg-gray-400 cursor-not-allowed'
                              : isDarkMode 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                          }`}
                          title="Profilbild setzen"
                        >
                          {uploadingProfilePic === userKey ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                        </button>

                        {/* User Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold text-sm truncate transition-colors duration-300 ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {getUserDisplayName?.(user.userName, user.deviceId) || user.userName}
                            </h4>
                            {user.isOnline && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className={`text-xs transition-colors duration-300 ${
                                  isDarkMode ? 'text-green-400' : 'text-green-600'
                                }`}>
                                  Online
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-3 h-3 flex-shrink-0" />
                              <span className={`truncate transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {user.deviceId?.slice(-8) || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className={`truncate transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {user.lastActivity}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors duration-300 ${
                          isDarkMode ? 'bg-purple-600/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {user.contributionCount} Beiträge
                        </div>
                        
                        <button
                          onClick={() => startDeleteUser(user.userName, user.deviceId)}
                          disabled={deletingUser === userKey}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs transition-all duration-200 ${
                            deletingUser === userKey
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                          }`}
                          title="Benutzer löschen"
                        >
                          {deletingUser === userKey ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span className="hidden sm:inline">Löschen</span>
                        </button>
                      </div>
                    </div>

                    {/* Delete Confirmation */}
                    {deleteConfirm === userKey && (
                      <div className={`mt-3 p-3 rounded-lg border-l-4 transition-colors duration-300 ${
                        isDarkMode 
                          ? 'bg-red-900/20 border-red-500 text-red-400' 
                          : 'bg-red-50 border-red-500 text-red-700'
                      }`}>
                        <p className="text-sm mb-3">
                          Möchten Sie "{getUserDisplayName?.(user.userName, user.deviceId) || user.userName}" wirklich löschen?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteUser(user.userName, user.deviceId)}
                            className="px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm transition-colors duration-200"
                          >
                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                            Bestätigen
                          </button>
                          <button
                            onClick={() => setDeleteConfirm('')}
                            className={`px-3 py-1 rounded-lg text-sm transition-colors duration-200 ${
                              isDarkMode 
                                ? 'bg-gray-600 hover:bg-gray-500 text-gray-300' 
                                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                            }`}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* No Users State */}
          {!isLoading && users.length === 0 && !error && (
            <div className="text-center py-12">
              <Users className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <h3 className={`text-lg font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Keine Benutzer gefunden
              </h3>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-600'
              }`}>
                Es wurden noch keine Benutzer registriert.
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className={`p-4 rounded-lg border-l-4 transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-500 text-red-400' 
                : 'bg-red-50 border-red-500 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};