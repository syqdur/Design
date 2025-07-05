import React, { useState, useEffect } from 'react';
import { 
  Camera, Check, CheckCircle2, Circle, Users, Heart, Star, Coffee, Music, MapPin, Clock, Trophy, 
  Gift, Sparkles, Crown, Laugh, Cake, Church, PartyPopper, Flower, Wine, Sun, Moon, 
  Zap, Mic, Glasses, Footprints, Gamepad2, Smile, Fingerprint, Target,
  Medal, Award, TrendingUp, UserCheck, RotateCcw, Crown as Crown2,
  // Beautiful icons
  Gem, Diamond, Shirt, Building, Baby, Utensils, 
  Handshake, Palette, Volume2, ChefHat, Disc3, Play, Shuffle
} from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserName, getDeviceId } from '../utils/deviceId';

interface PhotoChallengesProps {
  isDarkMode: boolean;
  isAdmin?: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'reception' | 'fun' | 'group' | 'romantic';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ChallengeCompletion {
  id: string;
  challengeId: string;
  userName: string;
  deviceId: string;
  completedAt: string;
}

const defaultChallenges: Challenge[] = [
  // Reception Challenges
  {
    id: 'dance-floor-energy',
    title: 'Tanzflächen-Power',
    description: 'Fotografiere die ausgelassene Stimmung auf der Tanzfläche',
    icon: Music,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'toast-moment',
    title: 'Anstoß-Moment',
    description: 'Halte einen besonderen Toast oder Anstoß fest',
    icon: Wine,
    category: 'reception',
    difficulty: 'medium'
  },
  {
    id: 'wedding-dress',
    title: 'Das Brautkleid',
    description: 'Fotografiere das wunderschöne Brautkleid im Detail',
    icon: Crown,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'party-venue',
    title: 'Feier-Location',
    description: 'Mache ein Foto der geschmückten Feier-Location',
    icon: PartyPopper,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'dj-action',
    title: 'DJ im Einsatz',
    description: 'Fotografiere den DJ beim Auflegen',
    icon: Disc3,
    category: 'reception',
    difficulty: 'medium'
  },
  {
    id: 'wedding-flowers',
    title: 'Brautstrauß',
    description: 'Ein Detailfoto des Brautstraußes',
    icon: Flower,
    category: 'reception',
    difficulty: 'easy'
  },

  // Reception Challenges
  {
    id: 'first-dance',
    title: 'Erster Tanz',
    description: 'Fotografiere den romantischen ersten Tanz des Brautpaars',
    icon: Music,
    category: 'reception',
    difficulty: 'medium'
  },
  {
    id: 'wedding-cake',
    title: 'Hochzeitstorte',
    description: 'Mache ein Foto beim feierlichen Anschneiden der Torte',
    icon: Cake,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'dancing-guests',
    title: 'Tanzende Gäste',
    description: 'Fotografiere die ausgelassenen Gäste beim Tanzen',
    icon: PartyPopper,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'toast-speech',
    title: 'Hochzeitsrede',
    description: 'Halte eine emotionale Rede oder einen Toast fest',
    icon: Volume2,
    category: 'reception',
    difficulty: 'medium'
  },
  {
    id: 'dinner-table',
    title: 'Festtafel',
    description: 'Fotografiere die wunderschön gedeckte Hochzeitstafel',
    icon: Utensils,
    category: 'reception',
    difficulty: 'easy'
  },
  {
    id: 'band-performance',
    title: 'Live-Musik',
    description: 'Mache ein Foto der Band oder des DJs während der Show',
    icon: Disc3,
    category: 'reception',
    difficulty: 'medium'
  },

  // Group Challenges
  {
    id: 'group-selfie',
    title: 'Mega-Gruppen-Selfie',
    description: 'Mache ein Selfie mit mindestens 8 Gästen',
    icon: Camera,
    category: 'group',
    difficulty: 'medium'
  },
  {
    id: 'family-photo',
    title: 'Großes Familienfoto',
    description: 'Versammle beide Familien für ein gemeinsames Foto',
    icon: Users,
    category: 'group',
    difficulty: 'medium'
  },
  {
    id: 'bridesmaids',
    title: 'Brautjungfern-Squad',
    description: 'Ein Foto aller Brautjungfern zusammen',
    icon: Crown2,
    category: 'group',
    difficulty: 'easy'
  },
  {
    id: 'groomsmen',
    title: 'Trauzeugen-Team',
    description: 'Fotografiere alle Trauzeugen in einer coolen Pose',
    icon: Handshake,
    category: 'group',
    difficulty: 'easy'
  },
  {
    id: 'kids-table',
    title: 'Kindertisch-Chaos',
    description: 'Mache ein lustiges Foto vom Kindertisch',
    icon: Baby,
    category: 'group',
    difficulty: 'easy'
  },

  // Fun Challenges
  {
    id: 'candid-laugh',
    title: 'Herzhaftes Lachen',
    description: 'Fange jemanden beim herzhaften Lachen ein',
    icon: Laugh,
    category: 'fun',
    difficulty: 'medium'
  },
  {
    id: 'photobomb',
    title: 'Photobomb-Meister',
    description: 'Erstelle ein lustiges Photobomb-Foto',
    icon: Zap,
    category: 'fun',
    difficulty: 'hard'
  },
  {
    id: 'weird-dance',
    title: 'Verrückter Tanz',
    description: 'Fotografiere jemanden bei einem lustigen Tanzschritt',
    icon: Shuffle,
    category: 'fun',
    difficulty: 'medium'
  },
  {
    id: 'food-art',
    title: 'Kulinarische Kunst',
    description: 'Mache ein künstlerisches Foto vom Hochzeitsessen',
    icon: ChefHat,
    category: 'fun',
    difficulty: 'medium'
  },
  {
    id: 'mirror-selfie',
    title: 'Spiegel-Selfie',
    description: 'Nutze einen Spiegel für ein kreatives Selfie',
    icon: Palette,
    category: 'fun',
    difficulty: 'hard'
  },

  // Romantic Challenges
  {
    id: 'couple-silhouette',
    title: 'Romantische Silhouette',
    description: 'Erstelle eine romantische Silhouette des Brautpaars',
    icon: Moon,
    category: 'romantic',
    difficulty: 'hard'
  },
  {
    id: 'sunset-couple',
    title: 'Sonnenuntergangs-Romantik',
    description: 'Fotografiere das Paar bei Sonnenuntergang',
    icon: Sun,
    category: 'romantic',
    difficulty: 'medium'
  },
  {
    id: 'kiss-moment',
    title: 'Der perfekte Kuss',
    description: 'Halte einen romantischen Kuss-Moment fest',
    icon: Heart,
    category: 'romantic',
    difficulty: 'medium'
  },
  {
    id: 'holding-hands',
    title: 'Händchen halten',
    description: 'Ein Detail-Foto der sich haltenden Hände',
    icon: Handshake,
    category: 'romantic',
    difficulty: 'easy'
  },
  {
    id: 'love-letters',
    title: 'Liebesbotschaft',
    description: 'Fotografiere ein Liebesgedicht oder eine süße Nachricht',
    icon: Gift,
    category: 'romantic',
    difficulty: 'medium'
  }
];

const categoryColors = {
  reception: 'from-blue-500 to-cyan-500',
  fun: 'from-yellow-500 to-orange-500',
  group: 'from-green-500 to-emerald-500',
  romantic: 'from-red-500 to-rose-500'
};

const categoryNames = {
  reception: 'Feier',
  fun: 'Spaß',
  group: 'Gruppe',
  romantic: 'Romantik'
};

const difficultyColors = {
  easy: 'text-green-500',
  medium: 'text-yellow-500',
  hard: 'text-red-500'
};

const difficultyNames = {
  easy: 'Einfach',
  medium: 'Mittel',
  hard: 'Schwer'
};

export const PhotoChallenges: React.FC<PhotoChallengesProps> = ({ isDarkMode, isAdmin = false }) => {
  const [challenges] = useState<Challenge[]>(defaultChallenges);
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentUser] = useState(getUserName() || '');
  const [currentDeviceId] = useState(getDeviceId() || '');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const [leaderboardApiData, setLeaderboardApiData] = useState<Array<{ userName: string; deviceId: string; completedCount: number }>>([]);

  // Load completions from Firebase (production-ready)
  useEffect(() => {
    if (!currentUser || !currentDeviceId) return;

    const unsubscribe = onSnapshot(
      collection(db, 'challengeCompletions'),
      (snapshot) => {
        const userCompletions: ChallengeCompletion[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userName === currentUser && data.deviceId === currentDeviceId) {
            userCompletions.push({
              id: doc.id,
              challengeId: data.challengeId,
              userName: data.userName,
              deviceId: data.deviceId,
              completedAt: data.completedAt
            });
          }
        });
        setCompletions(userCompletions);
      },
      (error) => {
        console.error('Error loading challenge completions:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, currentDeviceId]);

  // Load user profiles for profile pictures
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'userProfiles'),
      (snapshot) => {
        const profiles: {[key: string]: any} = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const profileKey = `${data.userName}_${data.deviceId}`;
          profiles[profileKey] = data;
        });
        setUserProfiles(profiles);
      }
    );

    return () => unsubscribe();
  }, []);

  // Load leaderboard data from Firebase (production-ready)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'challengeCompletions'),
      (snapshot) => {
        const leaderboard = new Map<string, { userName: string; deviceId: string; completedCount: number }>();

        snapshot.forEach((doc) => {
          const data = doc.data();
          const userKey = `${data.userName}_${data.deviceId}`;
          const existing = leaderboard.get(userKey);
          
          if (existing) {
            existing.completedCount++;
          } else {
            leaderboard.set(userKey, {
              userName: data.userName,
              deviceId: data.deviceId,
              completedCount: 1
            });
          }
        });

        const sortedLeaderboard = Array.from(leaderboard.values())
          .sort((a, b) => b.completedCount - a.completedCount);
        
        setLeaderboardApiData(sortedLeaderboard);
      },
      (error) => {
        console.error('Error loading leaderboard:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleToggleChallenge = async (challengeId: string) => {
    try {
      // Check if challenge is already completed
      const q = query(
        collection(db, 'challengeCompletions'),
        where('challengeId', '==', challengeId),
        where('userName', '==', currentUser),
        where('deviceId', '==', currentDeviceId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Remove completion (uncomplete the challenge)
        const docToDelete = snapshot.docs[0];
        await deleteDoc(doc(db, 'challengeCompletions', docToDelete.id));
        console.log(`Challenge ${challengeId} unmarked as completed`);
      } else {
        // Add completion (complete the challenge)
        await addDoc(collection(db, 'challengeCompletions'), {
          challengeId,
          userName: currentUser,
          deviceId: currentDeviceId,
          completedAt: new Date().toISOString()
        });
        console.log(`Challenge ${challengeId} marked as completed`);
      }
    } catch (error) {
      console.error('Error toggling challenge:', error);
    }
  };

  // Reset all challenges for a user
  const resetUserChallenges = async (userName: string, deviceId: string) => {
    try {
      console.log(`🔄 Resetting challenges for user: ${userName}`);
      
      const completionsQuery = query(
        collection(db, 'challengeCompletions'),
        where('userName', '==', userName),
        where('deviceId', '==', deviceId)
      );
      const snapshot = await getDocs(completionsQuery);
      
      console.log(`📊 Found ${snapshot.docs.length} completions to delete`);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`✅ Reset ${snapshot.docs.length} challenges for user ${userName}`);
    } catch (error) {
      console.error('❌ Error resetting user challenges:', error);
      throw error;
    }
  };

  const isChallengeCompleted = (challengeId: string) => {
    return completions.some(
      c => c.challengeId === challengeId && c.userName === currentUser && c.deviceId === currentDeviceId
    );
  };

  const getChallengeCompletionCount = (challengeId: string) => {
    return completions.filter(c => c.challengeId === challengeId).length;
  };

  const getUserProfilePicture = (userName: string, deviceId: string) => {
    const profileKey = `${userName}_${deviceId}`;
    const profile = userProfiles[profileKey];
    return profile?.profilePicture || null;
  };

  const getCompletedChallenges = () => {
    return challenges.filter(challenge => isChallengeCompleted(challenge.id));
  };

  // Admin function to reactivate a challenge for a user
  const handleReactivateChallenge = async (challengeId: string, userName: string, deviceId: string) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch('/api/challenges/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId,
          userName,
          deviceId
        })
      });

      if (response.ok) {
        // Reload completions to reflect the change
        const completionsResponse = await fetch(`/api/challenges/completions/${currentUser}/${currentDeviceId}`);
        if (completionsResponse.ok) {
          const userCompletions = await completionsResponse.json();
          setCompletions(userCompletions);
        }
      }
    } catch (error) {
      console.error('Error reactivating challenge:', error);
    }
  };

  // Transform API leaderboard data for display
  const getLeaderboardData = () => {
    return leaderboardApiData.map(entry => ({
      name: entry.userName,
      completions: entry.completedCount,
      points: entry.completedCount, // Simple 1:1 points for now, could be enhanced later
      deviceId: entry.deviceId,
      userName: entry.userName
    }));
  };

  const filteredChallenges = selectedCategory === 'all' 
    ? challenges 
    : challenges.filter(challenge => challenge.category === selectedCategory);

  const categories = ['all', 'reception', 'fun', 'group', 'romantic'];

  const completionPercentage = Math.round((getCompletedChallenges().length / challenges.length) * 100);
  
  const leaderboardData = getLeaderboardData();

  return (
    <div className="mx-4 my-6 space-y-6">
      {/* Header - Mobile Optimized */}
      <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl shadow-black/20' 
          : 'bg-white/70 border border-white/40 backdrop-blur-xl shadow-2xl shadow-gray-500/10'
      }`}>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className={`w-12 h-12 sm:w-16 sm:h-16 p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg flex-shrink-0 ${
                isDarkMode ? 'bg-white/10 border border-white/20 backdrop-blur-sm' : 'bg-white/60 border border-white/40 backdrop-blur-sm'
              }`}>
                <Camera className={`w-full h-full transition-all duration-300 ${
                  isDarkMode ? 'text-white/80' : 'text-gray-700'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`text-lg sm:text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Foto-Challenges
                </h3>
                <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-white/80' : 'text-gray-700'
                }`}>
                  {getCompletedChallenges().length} von {challenges.length} abgeschlossen
                </p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2 sm:gap-3 flex-shrink-0">
              <div className={`text-xl sm:text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {completionPercentage}%
              </div>
              <div className={`hidden sm:flex items-center gap-2 ${
                isDarkMode ? 'text-white/80' : 'text-gray-700'
              }`}>
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">Fortschritt</span>
              </div>
              
              {/* Leaderboard Button - Mobile Optimized */}
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 touch-manipulation ${
                  showLeaderboard
                    ? isDarkMode
                      ? 'bg-white/20 text-white border border-white/30 shadow-lg'
                      : 'bg-gray-200 text-gray-900 border border-gray-300 shadow-lg'
                    : isDarkMode
                      ? 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
                      : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Medal className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Bestenliste</span>
                  <span className="sm:hidden">Liste</span>
                </div>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className={`w-full h-3 rounded-full overflow-hidden ${
            isDarkMode ? 'bg-white/10' : 'bg-gray-200/50'
          }`}>
            <div 
              className={`h-full transition-all duration-500 ease-out ${
                isDarkMode ? 'bg-white/60' : 'bg-gray-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Category Filter - Mobile Optimized */}
      <div className="flex justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 mb-4 sm:mb-6 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
              selectedCategory === category
                ? isDarkMode
                  ? 'bg-white/20 text-white border border-white/30 shadow-lg'
                  : 'bg-gray-200 text-gray-900 border border-gray-300 shadow-lg'
                : isDarkMode
                  ? 'bg-white/10 text-white/70 hover:bg-white/20'
                  : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            {category === 'all' ? 'Alle' : categoryNames[category as keyof typeof categoryNames]}
          </button>
        ))}
      </div>

      {/* Leaderboard Section - Mobile Optimized */}
      {showLeaderboard && (
        <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-xl border transition-all duration-500 ${
          isDarkMode 
            ? 'bg-white/10 border-white/20 shadow-2xl shadow-black/20' 
            : 'bg-white/70 border-white/40 shadow-2xl shadow-gray-500/10'
        }`}>
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 p-2 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg flex-shrink-0 ${
              isDarkMode ? 'bg-white/10 border border-white/20 backdrop-blur-sm' : 'bg-white/60 border border-white/40 backdrop-blur-sm'
            }`}>
              <Trophy className={`w-full h-full transition-all duration-300 ${
                isDarkMode ? 'text-white/80' : 'text-gray-700'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className={`text-lg sm:text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🏆 Bestenliste
              </h4>
              <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-white/80' : 'text-gray-700'
              }`}>
                Punkte: Einfach=1, Mittel=2, Schwer=3
              </p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {leaderboardData.length > 0 ? (
              leaderboardData.slice(0, 10).map((user, index) => (
                <div
                  key={`${user.name}-${user.deviceId}`}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl backdrop-blur-sm transition-all duration-300 ${
                    index === 0
                      ? isDarkMode
                        ? 'bg-white/15 border border-white/30'
                        : 'bg-white/80 border border-white/50'
                      : index === 1
                        ? isDarkMode
                          ? 'bg-white/12 border border-white/25'
                          : 'bg-white/70 border border-white/45'
                        : index === 2
                          ? isDarkMode
                            ? 'bg-white/10 border border-white/20'
                            : 'bg-white/65 border border-white/40'
                          : isDarkMode
                            ? 'bg-white/5 border border-white/10'
                            : 'bg-white/60 border border-white/30'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0">
                      {getUserProfilePicture(user.name, user.deviceId || '') ? (
                        <img
                          src={getUserProfilePicture(user.name, user.deviceId || '')}
                          alt={user.name}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${
                          isDarkMode ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Ranking badge overlay */}
                      <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? 'bg-yellow-500 text-white'
                          : index === 1
                            ? 'bg-gray-400 text-white'
                            : index === 2
                              ? 'bg-amber-600 text-white'
                              : isDarkMode
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-300 text-gray-700'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold text-sm sm:text-base truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.name}
                      </div>
                      <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
                        {user.completions} Challenges
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg sm:text-xl font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {user.points}
                    </div>
                    <div className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                      Punkte
                    </div>
                    {isAdmin && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = window.confirm(
                            `Möchten Sie alle Challenges für ${user.name} zurücksetzen?`
                          );
                          if (confirmed) {
                            try {
                              await resetUserChallenges(user.name, user.deviceId || '');
                              alert(`Challenges für ${user.name} wurden zurückgesetzt.`);
                            } catch (error) {
                              console.error('Error resetting challenges:', error);
                              alert('Fehler beim Zurücksetzen der Challenges.');
                            }
                          }
                        }}
                        className={`mt-1 px-1.5 sm:px-2 py-1 text-xs rounded-lg transition-colors hover:scale-105 touch-manipulation ${
                          isDarkMode ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={`text-center py-8 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Noch keine Teilnehmer</p>
                <p className="text-sm mt-1">Seid die ersten, die Challenges abschließen!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Challenges Grid - Mobile Optimized */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        {filteredChallenges.map((challenge) => {
          const Icon = challenge.icon;
          const isCompleted = isChallengeCompleted(challenge.id);
          const completionCount = getChallengeCompletionCount(challenge.id);

          return (
            <div
              key={challenge.id}
              className={`group relative rounded-2xl backdrop-blur-xl transition-all duration-500 shadow-lg flex flex-col cursor-pointer transform ${
                isCompleted 
                  ? 'p-2 sm:p-3 min-h-[80px] sm:min-h-[100px] scale-75 opacity-60' 
                  : 'p-4 sm:p-6 min-h-[160px] sm:min-h-[180px] scale-100 opacity-100'
              } ${
                isDarkMode 
                  ? 'bg-white/10 border border-white/20 hover:bg-white/15 shadow-black/20' 
                  : 'bg-white/70 border border-white/40 hover:bg-white/85 shadow-gray-500/10'
              } ${isCompleted ? 'ring-2 ring-green-400/60 shadow-green-400/20' : ''}`}
              onClick={() => {
                if (!isCompleted) {
                  if (isAdmin) {
                    handleToggleChallenge(challenge.id);
                  } else {
                    const confirmed = window.confirm(
                      `Möchtest du die Challenge "${challenge.title}" als abgeschlossen markieren?\n\nDu kannst sie später nicht selbst wieder rückgängig machen.`
                    );
                    if (confirmed) {
                      handleToggleChallenge(challenge.id);
                    }
                  }
                } else if (isAdmin) {
                  // Allow admins to toggle completed challenges back to incomplete
                  handleToggleChallenge(challenge.id);
                }
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`relative p-1.5 sm:p-2 rounded-lg transition-transform duration-300 ${
                  isDarkMode 
                    ? 'bg-white/10 border border-white/20' 
                    : 'bg-white/60 border border-white/40'
                }`}>
                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                    isDarkMode ? 'text-white/80' : 'text-gray-700'
                  }`} />
                </div>
                <div className="flex items-center gap-2">
                  {completionCount > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full backdrop-blur-md border font-medium ${
                      isDarkMode 
                        ? 'bg-white/15 border-white/20 text-white/80' 
                        : 'bg-white/50 border-white/60 text-gray-700'
                    }`}>
                      {completionCount}
                    </span>
                  )}
                  {isCompleted ? (
                    <div className="relative">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 drop-shadow-md" />
                    </div>
                  ) : (
                    <Circle className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300 ${
                      isDarkMode ? 'text-white/40' : 'text-gray-400'
                    }`} />
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                <h4 className={`font-semibold text-sm sm:text-base leading-tight ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {challenge.title}
                </h4>

                <p className={`text-xs sm:text-sm leading-relaxed ${
                  isDarkMode ? 'text-white/70' : 'text-gray-600'
                }`}>
                  {challenge.description}
                </p>
              </div>

              <div className="flex items-center justify-between mt-4 gap-2">
                <span className={`text-xs px-2 py-1 rounded-full backdrop-blur-md border font-medium flex-shrink-0 ${
                  isDarkMode 
                    ? 'bg-white/10 border-white/20 text-white/80' 
                    : 'bg-white/40 border-white/50 text-gray-700'
                }`}>
                  {categoryNames[challenge.category]}
                </span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full backdrop-blur-md border flex-shrink-0 ${
                  challenge.difficulty === 'easy' 
                    ? 'bg-green-500/20 border-green-400/30 text-green-400' 
                    : challenge.difficulty === 'medium'
                    ? 'bg-yellow-500/20 border-yellow-400/30 text-yellow-400'
                    : 'bg-red-500/20 border-red-400/30 text-red-400'
                }`}>
                  {difficultyNames[challenge.difficulty]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChallenges.length === 0 && (
        <div className={`text-center py-16 rounded-3xl backdrop-blur-xl border shadow-2xl ${
          isDarkMode 
            ? 'bg-white/10 border-white/20 shadow-black/20' 
            : 'bg-white/70 border-white/40 shadow-gray-500/10'
        }`}>
          <div className="relative mb-6">
            <Camera className={`w-20 h-20 mx-auto ${
              isDarkMode ? 'text-white/60' : 'text-gray-500'
            }`} />
            <div className="absolute inset-0 rounded-full bg-white/10 animate-pulse"></div>
          </div>
          <p className={`text-xl font-semibold ${
            isDarkMode ? 'text-white/90' : 'text-gray-800'
          }`}>
            Keine Challenges in dieser Kategorie
          </p>
        </div>
      )}


    </div>
  );
};