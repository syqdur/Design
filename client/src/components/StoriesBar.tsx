import React from 'react';
import { Plus } from 'lucide-react';
import { Story } from '../services/liveService';

interface StoriesBarProps {
  stories: Story[];
  currentUser: string;
  deviceId: string;
  onAddStory: () => void;
  onViewStory: (storyIndex: number, userName: string) => void;
  isDarkMode: boolean;
  storiesEnabled?: boolean;
  getUserAvatar?: (userName: string, deviceId?: string) => string | null;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  stories,
  currentUser,
  deviceId,
  onAddStory,
  onViewStory,
  isDarkMode,
  storiesEnabled = true,
  getUserAvatar
}) => {

  // Don't render if stories are disabled
  if (!storiesEnabled) {
    return null;
  }
  console.log(`📱 === STORIES BAR RENDER ===`);
  console.log(`📊 Total stories: ${stories.length}`);
  console.log(`👤 Current user: ${currentUser}`);
  
  // 🔧 FIX: Add more detailed debugging
  if (stories.length > 0) {
    console.log(`📋 Stories details:`);
    stories.forEach((story, index) => {
      console.log(`  ${index + 1}. ID: ${story.id}, User: ${story.userName}, Type: ${story.mediaType}, Created: ${story.createdAt}`);
    });
  }
  
  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userName]) {
      acc[story.userName] = [];
    }
    acc[story.userName].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  console.log(`👥 Grouped stories:`, Object.keys(groupedStories).map(user => `${user}: ${groupedStories[user].length}`));

  // Get unique users with their latest story
  const userStories = Object.entries(groupedStories).map(([userName, userStoriesArray]) => ({
    userName,
    stories: userStoriesArray,
    latestStory: userStoriesArray[userStoriesArray.length - 1],
    // 🎯 NEW: Check if user has viewed ALL stories from this user
    hasUnviewed: userStoriesArray.some(story => !story.views.includes(deviceId))
  }));

  // Sort: unviewed stories first, then viewed stories at the end
  userStories.sort((a, b) => {
    // Primary sorting: unviewed stories always first, viewed stories always last
    if (a.hasUnviewed && !b.hasUnviewed) return -1; // a has unviewed, b fully viewed -> a first
    if (!a.hasUnviewed && b.hasUnviewed) return 1;  // a fully viewed, b has unviewed -> b first
    
    // Within unviewed stories: current user first, then by time
    if (a.hasUnviewed && b.hasUnviewed) {
      if (a.userName === currentUser) return -1;
      if (b.userName === currentUser) return 1;
      return new Date(b.latestStory.createdAt).getTime() - new Date(a.latestStory.createdAt).getTime();
    }
    
    // Within viewed stories: sort by oldest first (already viewed stories stay at back)
    if (!a.hasUnviewed && !b.hasUnviewed) {
      return new Date(a.latestStory.createdAt).getTime() - new Date(b.latestStory.createdAt).getTime();
    }
    
    return 0;
  });

  console.log(`📋 User stories sorted:`, userStories.map(us => `${us.userName} (${us.stories.length} stories, unviewed: ${us.hasUnviewed})`));
  console.log(`👥 Will render ${userStories.length} user story buttons`);

  const getAvatarUrl = (username: string) => {
    // First try to get user's custom profile picture
    const customAvatar = getUserAvatar?.(username);
    if (customAvatar) return customAvatar;
    
    // Fallback to generated avatars
    const weddingAvatars = [
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1070850/pexels-photo-1070850.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1444424/pexels-photo-1444424.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1729799/pexels-photo-1729799.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1444443/pexels-photo-1444443.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    ];
    
    const hash = username.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return weddingAvatars[Math.abs(hash) % weddingAvatars.length];
  };

  const handleStoryClick = (userName: string) => {
    console.log(`🎯 Story clicked for user: ${userName}`);
    
    // Find the first story index for this user in the original stories array
    const firstStoryIndex = stories.findIndex(story => story.userName === userName);
    console.log(`📍 First story index for ${userName}: ${firstStoryIndex}`);
    
    if (firstStoryIndex !== -1) {
      onViewStory(firstStoryIndex, userName);
    } else {
      console.error(`❌ Could not find story for user: ${userName}`);
    }
  };

  // 🔧 FIX: Always show Stories Bar, even if no stories exist
  return (
    <div className={`mx-4 my-4 p-4 rounded-2xl transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gray-800/30 border border-gray-700/20 backdrop-blur-xl' 
        : 'bg-white/50 border border-gray-200/30 backdrop-blur-xl'
    }`}>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory scroll-smooth">
        {/* Add Story Button - Always visible */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 snap-start">
          <button
            onClick={onAddStory}
            className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 ${
              isDarkMode 
                ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <Plus className={`w-6 h-6 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
          </button>
          <span className={`text-xs text-center transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Deine Story
          </span>
        </div>

        {/* User Stories - Only show if stories exist */}
        {userStories.map((userStory) => (
          <div key={userStory.userName} className="flex flex-col items-center gap-2 flex-shrink-0 snap-start">
            <button
              onClick={() => handleStoryClick(userStory.userName)}
              className="relative"
            >
              {/* 🎯 NEW: Story Ring - Only glows if there are unviewed stories */}
              <div className={`w-16 h-16 rounded-full p-0.5 transition-all duration-300 ${
                userStory.hasUnviewed
                  ? 'bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500'
                  : isDarkMode
                    ? 'bg-gray-600'
                    : 'bg-gray-300'
              }`}>
                <div className={`w-full h-full rounded-full overflow-hidden border-2 transition-colors duration-300 ${
                  isDarkMode ? 'border-gray-800' : 'border-white'
                }`}>
                  {/* Use profile picture as primary, story thumbnail as fallback */}
                  <img 
                    src={getAvatarUrl(userStory.userName)}
                    alt={`${userStory.userName}'s profile`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to story thumbnail if profile picture fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = userStory.latestStory.mediaUrl;
                    }}
                  />
                </div>
              </div>
              
              {/* Story count indicator */}
              {userStory.stories.length > 1 && (
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-700 text-white border-2 border-gray-800' : 'bg-white text-gray-900 border-2 border-white shadow-sm'
                }`}>
                  {userStory.stories.length}
                </div>
              )}

              {/* Video indicator */}
              {userStory.latestStory.mediaType === 'video' && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[3px] border-l-white border-y-[2px] border-y-transparent ml-0.5"></div>
                </div>
              )}
            </button>
            
            {/* 🎯 NEW: Show username clearly */}
            <span className={`text-xs text-center max-w-[64px] truncate transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {userStory.userName === currentUser ? 'Du' : userStory.userName}
            </span>
          </div>
        ))}

        {/* 🔧 FIX: Better empty state message when no stories exist */}
        {userStories.length === 0 && (
          <div className="flex items-center justify-center flex-1 py-4">
            <div className="text-center max-w-xs">
              <div className={`text-3xl mb-3`}>⚡</div>
              <p className={`text-sm font-medium mb-1 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Noch keine Stories
              </p>
              <p className={`text-xs transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Sei der Erste und teile einen spontanen Moment!
              </p>
              <p className={`text-xs mt-2 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                Stories verschwinden nach 24 Stunden ⏰
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};