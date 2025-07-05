import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Sun, Moon, UserPlus, Lock, Unlock, Settings, Menu, Plus, Image as ImageIcon, Video as VideoIcon, MessageSquare, Zap } from 'lucide-react';
import { UserNamePrompt } from './components/UserNamePrompt';
import { UploadSection } from './components/UploadSection';
import { InstagramGallery } from './components/InstagramGallery';
import { MediaModal } from './components/MediaModal';
import { AdminPanel } from './components/AdminPanel';
import { ProfileHeader } from './components/ProfileHeader';
import { UnderConstructionPage } from './components/UnderConstructionPage';
import { StoriesBar } from './components/StoriesBar';
import { StoriesViewer } from './components/StoriesViewer';
import { StoryUploadModal } from './components/StoryUploadModal';
import { TabNavigation } from './components/TabNavigation';
import { LiveUserIndicator } from './components/LiveUserIndicator';
import { SpotifyCallback } from './components/SpotifyCallback';
import { MusicWishlist } from './components/MusicWishlist';
import { Timeline } from './components/Timeline';
import { PostWeddingRecap } from './components/PostWeddingRecap';
import { PublicRecapPage } from './components/PublicRecapPage';
import { AdminLoginModal } from './components/AdminLoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { BackToTopButton } from './components/BackToTopButton';
import { NotificationCenter } from './components/NotificationCenter';
import { PhotoChallenges } from './components/PhotoChallenges';
import { VideoRecorder } from './components/VideoRecorder';
import { useUser } from './hooks/useUser';
import { useDarkMode } from './hooks/useDarkMode';
import { MediaItem, Comment, Like } from './types';
import {
  uploadFiles,
  uploadVideoBlob,
  loadGallery,
  deleteMediaItem,
  loadComments,
  addComment,
  deleteComment,
  loadLikes,
  toggleLike,
  addNote,
  editNote,
  loadUserProfiles,
  getUserProfile,
  getAllUserProfiles,
  createOrUpdateUserProfile,
  uploadUserProfilePicture,
  UserProfile,
  createTestNotification
} from './services/firebaseService';
import { subscribeSiteStatus, SiteStatus } from './services/siteStatusService';
import { getUserName, getDeviceId } from './utils/deviceId';
import { notificationService, initializePushNotifications } from './services/notificationService';
import {
  subscribeStories,
  subscribeAllStories,
  addStory,
  markStoryAsViewed,
  deleteStory,
  cleanupExpiredStories,
  Story
} from './services/liveService';

function App() {
  // Check if user was deleted and prevent app initialization
  const isUserDeleted = localStorage.getItem('userDeleted') === 'true';
  
  const { userName, deviceId, showNamePrompt, setUserName } = useUser();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [status, setStatus] = useState('');
  const [siteStatus, setSiteStatus] = useState<SiteStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showStoriesViewer, setShowStoriesViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [selectedStoryUser, setSelectedStoryUser] = useState<string>('');
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [activeTab, setActiveTab] = useState<'gallery' | 'music' | 'timeline' | 'challenges'>('gallery');
  
  // Handle tab switching when features are disabled
  const handleTabChange = (tab: 'gallery' | 'music' | 'timeline' | 'challenges') => {
    if (tab === 'gallery' && siteStatus && !siteStatus.galleryEnabled) {
      return; // Don't switch to gallery if disabled
    }
    if (tab === 'music' && siteStatus && !siteStatus.musicWishlistEnabled) {
      return; // Don't switch to music if disabled
    }
    setActiveTab(tab);
  };

  // Auto-switch away from disabled tabs
  useEffect(() => {
    if (siteStatus) {
      if (activeTab === 'gallery' && !siteStatus.galleryEnabled) {
        setActiveTab('timeline'); // Switch to timeline if gallery is disabled
      }
      if (activeTab === 'music' && !siteStatus.musicWishlistEnabled) {
        setActiveTab('timeline'); // Switch to timeline if music is disabled
      }
      if (activeTab === 'challenges' && !siteStatus.challengesEnabled) {
        setActiveTab('timeline'); // Switch to timeline if challenges is disabled
      }
    }
  }, [siteStatus, activeTab]);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  // Helper function to check if countdown is active
  const isCountdownActive = () => {
    // For now, return false since we need to integrate with ProfileData
    // This will be updated when countdown integration is complete
    return false;
  };

  // Check if we're on the Spotify callback page
  const isSpotifyCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('code') && urlParams.has('state');
  };

  // Check if we're on the Public Recap page
  const isPublicRecap = () => {
    return window.location.pathname === '/recap';
  };

  // Check if we're on the Post-Wedding Recap page (admin)
  const isPostWeddingRecap = () => {
    return window.location.pathname === '/admin/post-wedding-recap';
  };

  // Subscribe to site status changes
  useEffect(() => {
    const unsubscribe = subscribeSiteStatus((status) => {
      setSiteStatus(status);
    });

    return unsubscribe;
  }, []);

  // Initialize notification service when user is logged in
  useEffect(() => {
    if (!userName) return;

    const initNotifications = async () => {
      try {
        const initialized = await notificationService.init();
        if (initialized) {
          await notificationService.subscribeToPush(userName, deviceId);
          console.log('✅ Push notifications initialized');
        }
        
        // Initialize real push notifications for Android/iPhone
        await initializePushNotifications();
      } catch (error) {
        console.log('⚠️ Push notifications not available:', error);
      }
    };

    initNotifications();

    // Handle navigation events from service worker (real push notifications)
    const handleServiceWorkerNavigation = (event: any) => {
      const { mediaId } = event.detail;
      if (mediaId) {
        // Navigate to media and open modal
        setActiveTab('gallery');
        const mediaIndex = mediaItems.findIndex(item => item.id === mediaId);
        if (mediaIndex !== -1) {
          setCurrentImageIndex(mediaIndex);
          setModalOpen(true);
        }
      }
    };

    window.addEventListener('navigateToMedia', handleServiceWorkerNavigation);
    
    return () => {
      window.removeEventListener('navigateToMedia', handleServiceWorkerNavigation);
    };
  }, [userName, deviceId]);

  // Subscribe to stories when user is logged in
  useEffect(() => {
    if (!userName || !siteStatus || siteStatus.isUnderConstruction) return;

    // Subscribe to stories (admin sees all, users see only active)
    const unsubscribeStories = isAdmin 
      ? subscribeAllStories(setStories)
      : subscribeStories(setStories);

    // Cleanup expired stories periodically
    const cleanupInterval = setInterval(() => {
      cleanupExpiredStories();
    }, 60000); // Check every minute

    return () => {
      clearInterval(cleanupInterval);
      unsubscribeStories();
    };
  }, [userName, deviceId, siteStatus, isAdmin]);

  useEffect(() => {
    if (!userName || !siteStatus || siteStatus.isUnderConstruction) return;

    const unsubscribeGallery = loadGallery(setMediaItems);
    const unsubscribeComments = loadComments(setComments);
    const unsubscribeLikes = loadLikes(setLikes);
    const unsubscribeUserProfiles = loadUserProfiles(setUserProfiles);

    return () => {
      unsubscribeGallery();
      unsubscribeComments();
      unsubscribeLikes();
      unsubscribeUserProfiles();
    };
  }, [userName, siteStatus]);

  // Auto-logout when window/tab is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Clear admin status when page is closed
      if (isAdmin) {
        localStorage.removeItem('admin_status');
      }
    };

    // Check if admin status is stored in localStorage (for page refreshes)
    const storedAdminStatus = localStorage.getItem('admin_status');
    if (storedAdminStatus) {
      setIsAdmin(true);
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAdmin]);

  const handleUpload = async (files: FileList) => {
    if (!userName) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatus('⏳ Lädt hoch...');

    try {
      await uploadFiles(files, userName, deviceId, setUploadProgress);
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
      
      setStatus('✅ Bilder erfolgreich hochgeladen!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Hochladen. Bitte versuche es erneut.');
      console.error('Upload error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (videoBlob: Blob) => {
    if (!userName) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatus('⏳ Video wird hochgeladen...');

    try {
      await uploadVideoBlob(videoBlob, userName, deviceId, setUploadProgress);
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
      
      setStatus('✅ Video erfolgreich hochgeladen!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Hochladen des Videos. Bitte versuche es erneut.');
      console.error('Video upload error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleNoteSubmit = async (noteText: string) => {
    if (!userName) return;

    setIsUploading(true);
    setStatus('⏳ Notiz wird gespeichert...');

    try {
      await addNote(noteText, userName, deviceId);
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
      
      setStatus('✅ Notiz erfolgreich hinterlassen!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Speichern der Notiz. Bitte versuche es erneut.');
      console.error('Note error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditNote = async (item: MediaItem, newText: string) => {
    if (!userName || item.uploadedBy !== userName) {
      alert('Du kannst nur deine eigenen Notizen bearbeiten.');
      return;
    }

    setIsUploading(true);
    setStatus('⏳ Notiz wird aktualisiert...');

    try {
      await editNote(item.id, newText);
      setStatus('✅ Notiz erfolgreich aktualisiert!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus('❌ Fehler beim Aktualisieren der Notiz. Bitte versuche es erneut.');
      console.error('Edit note error:', error);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (item: MediaItem) => {
    // Check permissions
    if (!isAdmin && item.uploadedBy !== userName) {
      alert('Du kannst nur deine eigenen Beiträge löschen.');
      return;
    }

    const itemType = item.type === 'note' ? 'Notiz' : item.type === 'video' ? 'Video' : 'Bild';
    const confirmMessage = isAdmin 
      ? `${itemType} von ${item.uploadedBy} wirklich löschen?`
      : `Dein${item.type === 'note' ? 'e' : ''} ${itemType} wirklich löschen?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteMediaItem(item);
      setStatus(`✅ ${itemType} erfolgreich gelöscht!`);
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      setStatus(`❌ Fehler beim Löschen des ${itemType}s.`);
      console.error('Delete error:', error);
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const handleAddComment = async (mediaId: string, text: string) => {
    if (!userName) return;
    
    try {
      await addComment(mediaId, text, userName, deviceId);
      
      // Find the media owner to send notification
      const mediaItem = mediaItems.find(item => item.id === mediaId);
      if (mediaItem && mediaItem.uploadedBy !== userName) {
        await notificationService.sendCommentNotification(
          mediaItem.uploadedBy,
          mediaItem.deviceId,
          userName,
          deviceId,
          mediaId,
          text
        );
      }
      
      // Ensure user profile exists for proper display name sync
      await createOrUpdateUserProfile(userName, deviceId, {});
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleToggleLike = async (mediaId: string) => {
    if (!userName) return;
    
    try {
      await toggleLike(mediaId, userName, deviceId);
      
      // Send notification for likes (simplified approach)
      const mediaItem = mediaItems.find(item => item.id === mediaId);
      if (mediaItem && mediaItem.uploadedBy !== userName) {
        await notificationService.sendLikeNotification(
          mediaItem.uploadedBy,
          mediaItem.deviceId,
          userName,
          deviceId,
          mediaId
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleStoryUpload = async (file: File) => {
    if (!userName) return;

    setIsUploading(true);
    setStatus('⏳ Story wird hochgeladen...');

    try {
      // Determine media type
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      
      // Add story using the service function
      await addStory(file, mediaType, userName, deviceId);
      
      setStatus('✅ Story erfolgreich hinzugefügt!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Story upload error:', error);
      setStatus('❌ Fehler beim Hochladen der Story. Bitte versuche es erneut.');
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewStory = (storyIndex: number, userName: string) => {
    // Use the actual story index from the full stories array
    setCurrentStoryIndex(storyIndex);
    setSelectedStoryUser(userName);
    setShowStoriesViewer(true);
  };

  const handleStoryViewed = async (storyId: string) => {
    await markStoryAsViewed(storyId, deviceId);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteStory(storyId);
      setStatus('✅ Story erfolgreich gelöscht!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Error deleting story:', error);
      setStatus('❌ Fehler beim Löschen der Story.');
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const openModal = (index: number) => {
    setCurrentImageIndex(index);
    setModalOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === mediaItems.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? mediaItems.length - 1 : prev - 1
    );
  };

  const handleAdminLogin = (username: string) => {
    setIsAdmin(true);
    localStorage.setItem('admin_status', 'true');
    setShowAdminLogin(false);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('admin_status');
  };

  const handleProfileUpdated = (profile: UserProfile) => {
    setCurrentUserProfile(profile);
    // Update the userProfiles array to sync display names
    setUserProfiles(prev => {
      const index = prev.findIndex(p => p.id === profile.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = profile;
        return updated;
      } else {
        return [...prev, profile];
      }
    });
  };

  const handleNavigateToMedia = (mediaId: string) => {
    // Find the media item in the current media list
    const mediaIndex = mediaItems.findIndex(item => item.id === mediaId);
    if (mediaIndex !== -1) {
      // Switch to gallery tab and open the media modal
      setActiveTab('gallery');
      setCurrentImageIndex(mediaIndex);
      setModalOpen(true);
    }
  };;

  // Real-time profile synchronization - polling for profile changes
  useEffect(() => {
    if (!userName || !deviceId) return;
    
    console.log(`🔄 Setting up profile sync for ${userName}`);
    
    const checkProfileUpdates = async () => {
      try {
        const latestProfile = await getUserProfile(userName, deviceId);
        if (latestProfile && JSON.stringify(latestProfile) !== JSON.stringify(currentUserProfile)) {
          console.log(`📸 Profile updated for ${userName}:`, latestProfile.profilePicture ? 'Has picture' : 'No picture');
          setCurrentUserProfile(latestProfile);
        }
      } catch (error) {
        console.error('Error checking profile updates:', error);
      }
    };
    
    // Check for profile updates every 3 seconds for live sync
    const interval = setInterval(checkProfileUpdates, 3000);
    
    return () => {
      console.log(`🔄 Cleaning up profile sync for ${userName}`);
      clearInterval(interval);
    };
  }, [userName, deviceId, currentUserProfile]);

  // Load current user profile when user changes (fallback)
  useEffect(() => {
    const loadCurrentUserProfile = async () => {
      if (userName && deviceId) {
        try {
          console.log(`🔍 Looking for profile: ${userName} with deviceId ${deviceId}`);
          const userProfile = await getUserProfile(userName, deviceId);
          setCurrentUserProfile(userProfile);
          
          if (userProfile) {
            console.log(`✅ Found profile for ${userName}: ${userProfile.displayName || 'No display name'}`);
          } else {
            console.log(`❌ No profile found for ${userName} (${deviceId})`);
            
            // Try to find any existing profile for this username or similar usernames
            console.log(`🔍 Checking for existing profiles for username: ${userName}`);
            const allProfiles = await getAllUserProfiles();
            
            // First try exact match
            let existingUserProfile = allProfiles.find(p => p.userName === userName);
            
            // If no exact match, try fuzzy matching for similar names (e.g., Maurizio -> Mauro)
            if (!existingUserProfile) {
              const lowerUserName = userName.toLowerCase();
              existingUserProfile = allProfiles.find(p => {
                const lowerProfileName = p.userName.toLowerCase();
                return lowerProfileName.includes(lowerUserName.slice(0, 4)) || 
                       lowerUserName.includes(lowerProfileName.slice(0, 4));
              });
              
              if (existingUserProfile) {
                console.log(`🔗 Found similar profile: ${existingUserProfile.userName} for ${userName}`);
              }
            }
            
            if (existingUserProfile) {
              console.log(`🔗 Found existing profile for ${userName}, linking to current device`);
              try {
                // Create a new profile entry for this device but use existing display name/picture
                await createOrUpdateUserProfile(userName, deviceId, {
                  displayName: existingUserProfile.displayName || userName,
                  profilePicture: existingUserProfile.profilePicture
                });
                
                const linkedProfile = await getUserProfile(userName, deviceId);
                setCurrentUserProfile(linkedProfile);
                console.log(`✅ Linked existing profile data to current device for ${userName}`);
              } catch (error) {
                console.error('Error linking profile:', error);
                // Fallback to basic profile
                setCurrentUserProfile(null);
              }
            } else {
              console.log(`🔧 No existing profile found, user will need to create one manually`);
              // Don't auto-create profile to avoid Firebase errors
              setCurrentUserProfile(null);
            }
          }
        } catch (error) {
          console.error('Error loading current user profile:', error);
        }
      }
    };

    // Only load initially, real-time updates handled by listener above
    loadCurrentUserProfile();
  }, [userName, deviceId]);

  // Sync all user profiles when app loads and when new users connect
  useEffect(() => {
    const syncAllUserProfiles = async () => {
      try {
        console.log('🔄 Syncing all user profiles for display name consistency...');
        const allProfiles = await getAllUserProfiles();
        setUserProfiles(allProfiles);
        console.log(`✅ Synced ${allProfiles.length} user profiles`);
      } catch (error) {
        console.error('Error syncing user profiles:', error);
      }
    };

    // Initial sync when app loads
    syncAllUserProfiles();

    // Listen for new user connections and resync profiles
    const handleUserConnected = async (event: CustomEvent) => {
      const { userName, deviceId, profilePicture } = event.detail;
      console.log(`🔄 New user connected (${userName}), resyncing all profiles...`);
      
      // If user provided a profile picture during registration, upload it first then save profile
      if (profilePicture && profilePicture instanceof File) {
        try {
          console.log('📷 Uploading profile picture for new user:', userName);
          
          // Upload the profile picture to Firebase Storage
          const profilePictureUrl = await uploadUserProfilePicture(profilePicture, userName, deviceId);
          
          console.log('✅ Profile picture uploaded, creating user profile...');
          
          // Create user profile with the uploaded picture URL
          await createOrUpdateUserProfile(userName, deviceId, {
            displayName: userName,
            profilePicture: profilePictureUrl
          });
          
          // Update current user profile if this is the current user
          const currentStoredName = getUserName();
          const currentStoredDeviceId = getDeviceId();
          if (userName === currentStoredName && deviceId === currentStoredDeviceId) {
            const updatedProfile = await getUserProfile(userName, deviceId);
            setCurrentUserProfile(updatedProfile);
          }
          console.log('✅ Profile picture saved for new user');
        } catch (error) {
          console.error('❌ Error saving profile picture:', error);
        }
      }
      
      // Delay the sync to ensure profile creation has completed
      setTimeout(() => {
        syncAllUserProfiles();
      }, 1000);
    };

    window.addEventListener('userConnected', handleUserConnected as any);
    
    return () => {
      window.removeEventListener('userConnected', handleUserConnected as any);
    };
  }, []);

  // Function to get user's profile picture or fallback to generated avatar
  const getUserAvatar = (targetUserName: string, targetDeviceId?: string) => {
    const userProfile = userProfiles.find(p => 
      p.userName === targetUserName && (!targetDeviceId || p.deviceId === targetDeviceId)
    );
    // Return custom profile picture if available, otherwise return null for generated avatar fallback
    return userProfile?.profilePicture || null;
  };

  // Function to get user's display name (display name overrides username)
  const getUserDisplayName = (targetUserName: string, targetDeviceId?: string) => {
    const userProfile = userProfiles.find(p => 
      p.userName === targetUserName && (!targetDeviceId || p.deviceId === targetDeviceId)
    );
    // Return display name if it exists and is different from username, otherwise return username
    return (userProfile?.displayName && userProfile.displayName !== targetUserName) 
      ? userProfile.displayName 
      : targetUserName;
  };

  // Show Spotify callback handler if on callback page
  if (isSpotifyCallback()) {
    return <SpotifyCallback isDarkMode={isDarkMode} />;
  }

  // Show Public Recap Page if on that route
  if (isPublicRecap()) {
    return <PublicRecapPage isDarkMode={isDarkMode} />;
  }

  // Show Post-Wedding Recap if on that route (admin only)
  if (isPostWeddingRecap()) {
    // Only allow access if admin
    if (!isAdmin) {
      return (
        <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Zugriff verweigert
            </h1>
            <p className={`transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Diese Seite ist nur für Administratoren zugänglich.
            </p>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="mt-4 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors"
            >
              Anmelden
            </button>
          </div>
          
          <AdminLoginModal 
            isOpen={showAdminLogin}
            onClose={() => setShowAdminLogin(false)}
            onLogin={handleAdminLogin}
            isDarkMode={isDarkMode}
          />
        </div>
      );
    }

    return (
      <PostWeddingRecap
        isDarkMode={isDarkMode}
        mediaItems={mediaItems}
        isAdmin={isAdmin}
        userName={userName || ''}
      />
    );
  }

  // Show loading while site status is being fetched
  if (siteStatus === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={`text-lg transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Lade Website...
          </p>
        </div>
      </div>
    );
  }

  // Show under construction page if site is under construction
  if (siteStatus.isUnderConstruction) {
    return (
      <UnderConstructionPage 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        siteStatus={siteStatus}
        isAdmin={isAdmin}
        onToggleAdmin={setIsAdmin}
      />
    );
  }

  if (showNamePrompt) {
    return <UserNamePrompt onSubmit={(name: string, profilePicture?: File) => {
      setUserName(name, profilePicture);
    }} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gray-900' 
        : 'bg-gray-50'
    }`} style={{
      background: isDarkMode 
        ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)' 
        : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)'
    }}>
      {/* Compact Mobile Header */}
      <div className={`sticky top-0 z-50 transition-all duration-300 glass-card ${
        isDarkMode 
          ? 'bg-black/60 border-white/10 backdrop-blur-2xl shadow-2xl' 
          : 'bg-white/60 border-black/10 backdrop-blur-2xl shadow-2xl'
      } border-b rounded-none`}>
        <div className="max-w-md mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center relative bg-transparent">
                {/* Simple Wedding Rings */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className={`absolute w-3 h-3 rounded-full border transition-all duration-1000 ${
                    isDarkMode ? 'border-yellow-300' : 'border-yellow-400'
                  }`} style={{ transform: 'translateX(-1px)' }}></div>
                  <div className={`absolute w-3 h-3 rounded-full border transition-all duration-1000 ${
                    isDarkMode ? 'border-yellow-300' : 'border-yellow-400'
                  }`} style={{ transform: 'translateX(1px)' }}></div>
                </div>
              </div>
              <div>
                <h1 className={`text-sm font-bold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Kristin & Mauro
                </h1>
                <p className={`text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Foto-Sharing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Notification Center */}
              {userName && (
                <NotificationCenter
                  userName={userName}
                  deviceId={deviceId}
                  isDarkMode={isDarkMode}
                  onNavigateToMedia={handleNavigateToMedia}
                />
              )}
              
              {/* Temporary Test Notification Button - For debugging */}
              {userName && isAdmin && (
                <button
                  onClick={async () => {
                    try {
                      await createTestNotification(userName, deviceId);
                      console.log('🧪 Test notification created successfully!');
                    } catch (error) {
                      console.error('❌ Failed to create test notification:', error);
                    }
                  }}
                  className={`p-2 rounded-full text-xs transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                  title="Create Test Notification"
                >
                  TEST
                </button>
              )}
              
              {/* Pure Glassmorphism Profile Edit Button - FIXED für Mobile */}
              <button
                onClick={() => setShowUserProfileModal(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-300 hover:scale-105 backdrop-blur-sm shadow-lg h-[40px] ${
                  isDarkMode 
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20 shadow-black/20' 
                    : 'bg-white/20 hover:bg-white/30 text-gray-800 border border-white/30 shadow-gray-500/20'
                }`}
                title="Mein Profil bearbeiten"
              >
                {/* Profilbild oder UserPlus Icon - IMMER sichtbar */}
                {currentUserProfile?.profilePicture ? (
                  <img 
                    src={currentUserProfile?.profilePicture || ''} 
                    alt="My Profile"
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-white/30 shadow-sm flex-shrink-0"
                  />
                ) : (
                  <UserPlus className={`w-4 h-4 transition-colors duration-300 flex-shrink-0 ${
                    isDarkMode ? 'text-white/80' : 'text-gray-700'
                  }`} />
                )}
                
                {/* Text nur auf größeren Bildschirmen - SEPARATE vom Bild */}
                <span className="text-sm font-medium truncate hidden sm:block max-w-16">
                  Profil
                </span>
              </button>
              
              {/* Live User Indicator - Moved to right side */}
              <LiveUserIndicator 
                currentUser={userName || ''}
                isDarkMode={isDarkMode}
              />
              
              <button
                onClick={toggleDarkMode}
                className={`p-2 sm:p-2.5 rounded-full transition-all duration-300 touch-manipulation ${
                  isDarkMode 
                    ? 'text-yellow-400 hover:bg-gray-800/50 hover:scale-110' 
                    : 'text-gray-600 hover:bg-gray-100/50 hover:scale-110'
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-2 sm:px-0" style={{
        paddingBottom: 'max(64px, calc(64px + env(safe-area-inset-bottom)))'
      }}>
        <ProfileHeader 
          isDarkMode={isDarkMode} 
          isAdmin={isAdmin}
          userName={userName ?? undefined}
          mediaItems={mediaItems}
          onToggleAdmin={(status) => {
            if (status) {
              setShowAdminLogin(true);
            } else {
              handleAdminLogout();
            }
          }}
          currentUserProfile={currentUserProfile}
          onOpenUserProfile={() => setShowUserProfileModal(true)}
          showTopBarControls={false}
          showProfileEditModal={showProfileEditModal}
          onCloseProfileEditModal={() => setShowProfileEditModal(false)}
        />
        
        {/* Stories Bar */}
        <StoriesBar
          stories={stories}
          currentUser={userName || ''}
          deviceId={deviceId}
          onAddStory={() => setShowStoryUpload(true)}
          onViewStory={handleViewStory}
          isDarkMode={isDarkMode}
          storiesEnabled={siteStatus?.storiesEnabled ?? true}
          getUserAvatar={getUserAvatar}
        />
        
        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isDarkMode={isDarkMode}
          galleryEnabled={siteStatus?.galleryEnabled ?? true}
          musicWishlistEnabled={siteStatus?.musicWishlistEnabled ?? true}
          challengesEnabled={siteStatus?.challengesEnabled ?? true}
          isCountdownActive={isCountdownActive()}
          tabsLockedUntilCountdown={siteStatus?.tabsLockedUntilCountdown ?? false}
          adminOverrideTabLock={siteStatus?.adminOverrideTabLock ?? false}
          isAdmin={isAdmin}
        />

        {/* Mobile Upload Button - Safe Area */}
        <div className="fixed z-40" style={{ 
          bottom: 'max(200px, calc(200px + env(safe-area-inset-bottom)))',
          right: '16px'
        }}>
          <button
            onClick={() => setShowUploadOptions(true)}
            className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 btn-touch ${
              isUploading ? 'animate-pulse' : ''
            } bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700`}
            style={{
              boxShadow: isDarkMode 
                ? '0 8px 25px rgba(236, 72, 153, 0.4)' 
                : '0 8px 25px rgba(236, 72, 153, 0.3)'
            }}
            title="Foto teilen"
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
        </div>

        {/* Upload Options Modal */}
        {showUploadOptions && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" style={{ alignItems: 'flex-start', paddingTop: '20vh' }}>
            <div className={`w-full max-w-sm rounded-2xl p-6 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600' 
                : 'bg-white border-gray-300'
            } border shadow-2xl transform transition-all duration-300 animate-in zoom-in-95`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Was möchtest du teilen?
                </h3>
                <button
                  onClick={() => setShowUploadOptions(false)}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
                  }`}
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-3">
                {/* Photo/Video Upload */}
                <div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    id="media-upload"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleUpload(e.target.files);
                        setShowUploadOptions(false);
                      }
                    }}
                  />
                  <label
                    htmlFor="media-upload"
                    className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 btn-touch ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Fotos & Videos</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Aus Galerie auswählen
                      </p>
                    </div>
                  </label>
                </div>

                {/* Video Recording */}
                <button
                  onClick={() => {
                    setShowVideoRecorder(true);
                    setShowUploadOptions(false);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl w-full transition-all duration-200 btn-touch ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <VideoIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Video aufnehmen</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Neues Video erstellen
                    </p>
                  </div>
                </button>

                {/* Note */}
                <button
                  onClick={() => {
                    setShowNoteInput(true);
                    setShowUploadOptions(false);
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl w-full transition-all duration-200 btn-touch ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Notiz schreiben</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Nachricht hinterlassen
                    </p>
                  </div>
                </button>

                {/* Stories */}
                {siteStatus?.storiesEnabled && (
                  <button
                    onClick={() => {
                      setShowStoryUpload(true);
                      setShowUploadOptions(false);
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl w-full transition-all duration-200 btn-touch ${
                      isDarkMode 
                        ? 'bg-gray-600/60 hover:bg-gray-500/70 text-white' 
                        : 'bg-gray-50/90 hover:bg-gray-100/90 text-gray-900'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Story hinzufügen</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        24h Story erstellen
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Video Recorder Modal */}
        {showVideoRecorder && (
          <VideoRecorder
            onVideoRecorded={handleVideoUpload}
            onClose={() => setShowVideoRecorder(false)}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Note Input Modal */}
        {showNoteInput && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl p-6 glass-card ${
              isDarkMode 
                ? 'bg-gray-900/90 border-white/10' 
                : 'bg-white/90 border-black/10'
            } border transform transition-all duration-300 animate-in slide-in-from-bottom-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Notiz schreiben
                </h3>
                <button
                  onClick={() => setShowNoteInput(false)}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode 
                      ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-black/10'
                  }`}
                >
                  ×
                </button>
              </div>
              
              <textarea
                value={noteText}
                placeholder="Was möchtest du mitteilen?"
                className={`w-full h-32 p-3 rounded-xl border resize-none ${
                  isDarkMode 
                    ? 'bg-white/5 border-white/10 text-white placeholder-gray-400' 
                    : 'bg-black/5 border-black/10 text-gray-900 placeholder-gray-500'
                }`}
                onChange={(e) => setNoteText(e.target.value)}
              />
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowNoteInput(false);
                    setNoteText('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-xl transition-colors ${
                    isDarkMode 
                      ? 'bg-white/10 hover:bg-white/20 text-white' 
                      : 'bg-black/10 hover:bg-black/20 text-gray-900'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  onClick={async () => {
                    if (noteText.trim() && userName && deviceId) {
                      try {
                        await addNote(noteText, userName, deviceId);
                        setNoteText('');
                        setShowNoteInput(false);
                        // Note will automatically appear in gallery via real-time listener
                      } catch (error) {
                        console.error('Error adding note:', error);
                      }
                    }
                  }}
                  disabled={!noteText.trim()}
                  className={`flex-1 py-2 px-4 rounded-xl transition-colors ${
                    noteText.trim()
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Teilen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress Indicator */}
        {isUploading && (
          <div className="fixed top-20 left-4 right-4 z-50 max-w-sm mx-auto">
            <div className="glass-card p-4 bg-green-500/20 border-green-500/30">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-500">Foto wird hochgeladen...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'gallery' && siteStatus?.galleryEnabled ? (
          <>
            {/* Compact Welcome */}
            <div className="px-3 py-3 text-center">
              <h2 className={`text-sm font-medium mb-1 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Teile deine Hochzeitsfotos! 🎉
              </h2>
              <p className={`text-xs mb-3 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Pink Button → Foto hochladen
              </p>
              
              {/* Compact Stats */}
              <div className="flex justify-center gap-6 text-center">
                <div className="flex items-center gap-1">
                  <span className={`text-lg font-bold transition-colors duration-300 ${
                    isDarkMode ? 'text-pink-400' : 'text-pink-600'
                  }`}>
                    {mediaItems.length}
                  </span>
                  <span className={`text-xs transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Fotos
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-lg font-bold transition-colors duration-300 ${
                    isDarkMode ? 'text-pink-400' : 'text-pink-600'
                  }`}>
                    {likes.length}
                  </span>
                  <span className={`text-xs transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Likes
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-lg font-bold transition-colors duration-300 ${
                    isDarkMode ? 'text-pink-400' : 'text-pink-600'
                  }`}>
                    {comments.length}
                  </span>
                  <span className={`text-xs transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Kommentare
                  </span>
                </div>
              </div>
            </div>

            {status && (
              <div className="px-4 py-2">
                <p className={`text-sm text-center transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`} dangerouslySetInnerHTML={{ __html: status }} />
              </div>
            )}

            <InstagramGallery
              items={mediaItems}
              onItemClick={openModal}
              onDelete={handleDelete}
              onEditNote={handleEditNote}
              isAdmin={isAdmin}
              comments={comments}
              likes={likes}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onToggleLike={handleToggleLike}
              userName={userName || ''}
              isDarkMode={isDarkMode}
              getUserAvatar={getUserAvatar}
              getUserDisplayName={getUserDisplayName}
              deviceId={deviceId || ''}
            />
          </>
        ) : activeTab === 'timeline' ? (
          <Timeline 
            isDarkMode={isDarkMode}
            userName={userName || ''}
            isAdmin={isAdmin}
          />
        ) : activeTab === 'music' && siteStatus?.musicWishlistEnabled ? (
          <MusicWishlist isDarkMode={isDarkMode} isAdmin={isAdmin} />
        ) : activeTab === 'challenges' && siteStatus?.challengesEnabled ? (
          <PhotoChallenges isDarkMode={isDarkMode} isAdmin={isAdmin} />
        ) : (
          <div className={`p-8 text-center transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <p>Diese Funktion ist derzeit deaktiviert.</p>
          </div>
        )}
      </div>

      <MediaModal
        isOpen={modalOpen}
        items={mediaItems}
        currentIndex={currentImageIndex}
        onClose={() => setModalOpen(false)}
        onNext={nextImage}
        onPrev={prevImage}
        comments={comments}
        likes={likes}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
        onToggleLike={handleToggleLike}
        userName={userName || ''}
        isAdmin={isAdmin}
        isDarkMode={isDarkMode}
        getUserAvatar={getUserAvatar}
        getUserDisplayName={getUserDisplayName}
      />

      {/* Stories Viewer */}
      <StoriesViewer
        isOpen={showStoriesViewer}
        stories={stories}
        initialStoryIndex={currentStoryIndex}
        currentUser={userName || ''}
        selectedUserName={selectedStoryUser}
        onClose={() => setShowStoriesViewer(false)}
        onStoryViewed={handleStoryViewed}
        onDeleteStory={handleDeleteStory}
        isAdmin={isAdmin}
        isDarkMode={isDarkMode}
      />

      {/* Story Upload Modal */}
      <StoryUploadModal
        isOpen={showStoryUpload}
        onClose={() => setShowStoryUpload(false)}
        onUpload={handleStoryUpload}
        isDarkMode={isDarkMode}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onLogin={handleAdminLogin}
        isDarkMode={isDarkMode}
      />

      {/* User Profile Modal */}
      {userName && deviceId && (
        <UserProfileModal
          isOpen={showUserProfileModal}
          onClose={() => setShowUserProfileModal(false)}
          userName={userName}
          deviceId={deviceId}
          isDarkMode={isDarkMode}
          onProfileUpdated={handleProfileUpdated}
          isAdmin={isAdmin}
          currentUserName={userName}
          currentDeviceId={deviceId}
        />
      )}

      <AdminPanel 
        isDarkMode={isDarkMode} 
        isAdmin={isAdmin}
        onToggleAdmin={(status) => {
          if (status) {
            setShowAdminLogin(true);
          } else {
            handleAdminLogout();
          }
        }}
        mediaItems={mediaItems}
        siteStatus={siteStatus}
        getUserAvatar={getUserAvatar}
        getUserDisplayName={getUserDisplayName}
      />

      {/* Back to Top Button */}
      <BackToTopButton isDarkMode={isDarkMode} />

      {/* Mobile Admin Burger Menu - Above Bottom Navigation */}
      {userName && (
        <div className="fixed left-4 z-50" style={{ 
          bottom: 'max(80px, calc(80px + env(safe-area-inset-bottom)))' 
        }}>
          {/* Admin Burger Menu Button */}
          <button
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center shadow-lg ring-2 ${
              isDarkMode 
                ? 'bg-gray-800/90 hover:bg-gray-700/90 backdrop-blur-sm ring-gray-600/40 hover:ring-gray-500/60' 
                : 'bg-white/90 hover:bg-gray-50/90 backdrop-blur-sm ring-gray-300/40 hover:ring-gray-400/60'
            } ${showAdminMenu ? 'rotate-90' : ''}`}
            title="Admin-Menü"
          >
            <Menu className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} />
          </button>

          {/* Admin Menu Dropdown */}
          {showAdminMenu && (
            <div className={`absolute bottom-12 left-0 mb-2 min-w-[140px] rounded-xl shadow-xl backdrop-blur-sm border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800/95 border-gray-700/50' 
                : 'bg-white/95 border-gray-200/50'
            }`}>
              {/* Admin Toggle */}
              <button
                onClick={() => {
                  if (isAdmin) {
                    handleAdminLogout();
                  } else {
                    setShowAdminLogin(true);
                  }
                  setShowAdminMenu(false);
                }}
                className={`w-full p-3 text-left text-sm flex items-center gap-3 transition-colors duration-300 rounded-t-xl ${
                  isDarkMode 
                    ? 'hover:bg-gray-700/50 text-gray-300' 
                    : 'hover:bg-gray-100/50 text-gray-700'
                }`}
              >
                {isAdmin ? (
                  <Unlock className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {isAdmin ? "Admin beenden" : "Admin-Login"}
              </button>

              {/* Admin Settings - Only visible in admin mode */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowProfileEditModal(true);
                    setShowAdminMenu(false);
                  }}
                  className={`w-full p-3 text-left text-sm flex items-center gap-3 transition-colors duration-300 rounded-b-xl ${
                    isDarkMode 
                      ? 'hover:bg-gray-700/50 text-gray-300' 
                      : 'hover:bg-gray-100/50 text-gray-700'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Website-Profil
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close menu */}
      {showAdminMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowAdminMenu(false)}
        />
      )}
    </div>
  );
}

export default App;
