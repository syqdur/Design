import { supabase } from '../config/supabase'
import type { 
  MediaItem, 
  Comment, 
  Like, 
  Story, 
  LiveUser, 
  UserProfile, 
  TimelineEvent,
  MediaTag,
  LocationTag,
  Notification,
  SiteStatus,
  StoryView
} from '../config/supabase'

// Storage service
export const uploadFile = async (file: File, folder: string): Promise<string> => {
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `${folder}/${fileName}`
  
  const { data, error } = await supabase.storage
    .from('wedding-media')
    .upload(filePath, file)
  
  if (error) {
    console.error('Upload error:', error)
    throw error
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('wedding-media')
    .getPublicUrl(filePath)
  
  return publicUrl
}

export const deleteFile = async (url: string): Promise<void> => {
  const urlParts = url.split('/')
  const filePath = urlParts.slice(-2).join('/')
  
  const { error } = await supabase.storage
    .from('wedding-media')
    .remove([filePath])
  
  if (error) {
    console.error('Delete error:', error)
    throw error
  }
}

// Media items service
export const getMediaItems = async (): Promise<MediaItem[]> => {
  const { data, error } = await supabase
    .from('media_items')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const addMediaItem = async (item: Omit<MediaItem, 'id' | 'created_at' | 'updated_at'>): Promise<MediaItem> => {
  const { data, error } = await supabase
    .from('media_items')
    .insert([item])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateMediaItem = async (id: string, updates: Partial<MediaItem>): Promise<void> => {
  const { error } = await supabase
    .from('media_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw error
}

export const deleteMediaItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Comments service
export const getComments = async (): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data || []
}

export const addComment = async (comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment> => {
  const { data, error } = await supabase
    .from('comments')
    .insert([comment])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteComment = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Likes service
export const getLikes = async (): Promise<Like[]> => {
  const { data, error } = await supabase
    .from('likes')
    .select('*')
  
  if (error) throw error
  return data || []
}

export const toggleLike = async (mediaId: string, userName: string, deviceId: string): Promise<void> => {
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('media_id', mediaId)
    .eq('user_name', userName)
    .eq('user_device_id', deviceId)
    .single()
  
  if (existing) {
    await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id)
  } else {
    await supabase
      .from('likes')
      .insert([{
        media_id: mediaId,
        user_name: userName,
        user_device_id: deviceId
      }])
  }
}

// Stories service
export const getStories = async (): Promise<Story[]> => {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const addStory = async (story: Omit<Story, 'id' | 'created_at' | 'expires_at'>): Promise<Story> => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('stories')
    .insert([{ ...story, expires_at: expiresAt }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteStory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Story views service
export const getStoryViews = async (): Promise<StoryView[]> => {
  const { data, error } = await supabase
    .from('story_views')
    .select('*')
  
  if (error) throw error
  return data || []
}

export const addStoryView = async (storyId: string, viewerName: string, deviceId: string): Promise<void> => {
  const { error } = await supabase
    .from('story_views')
    .insert([{
      story_id: storyId,
      viewer_name: viewerName,
      viewer_device_id: deviceId
    }])
  
  if (error && !error.message.includes('duplicate')) throw error
}

// Live users service
export const getLiveUsers = async (): Promise<LiveUser[]> => {
  const { data, error } = await supabase
    .from('live_users')
    .select('*')
    .order('last_seen', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const updateUserPresence = async (userName: string, deviceId: string): Promise<void> => {
  const { error } = await supabase
    .from('live_users')
    .upsert({
      user_name: userName,
      device_id: deviceId,
      last_seen: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString()
    })
  
  if (error) throw error
}

export const setUserOffline = async (userName: string, deviceId: string): Promise<void> => {
  const { error } = await supabase
    .from('live_users')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_name', userName)
    .eq('device_id', deviceId)
  
  if (error) throw error
}

// User profiles service
export const getUserProfiles = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const getUserProfile = async (userName: string, deviceId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_name', userName)
    .eq('device_id', deviceId)
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export const updateUserProfile = async (userName: string, deviceId: string, updates: Partial<UserProfile>): Promise<void> => {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_name: userName,
      device_id: deviceId,
      ...updates,
      updated_at: new Date().toISOString()
    })
  
  if (error) throw error
}

export const deleteUserProfile = async (userName: string, deviceId: string): Promise<void> => {
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('user_name', userName)
    .eq('device_id', deviceId)
  
  if (error) throw error
}

// Timeline events service
export const getTimelineEvents = async (): Promise<TimelineEvent[]> => {
  const { data, error } = await supabase
    .from('timeline_events')
    .select('*')
    .order('date', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const addTimelineEvent = async (event: Omit<TimelineEvent, 'id' | 'created_at' | 'updated_at'>): Promise<TimelineEvent> => {
  const { data, error } = await supabase
    .from('timeline_events')
    .insert([event])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateTimelineEvent = async (id: string, updates: Partial<TimelineEvent>): Promise<void> => {
  const { error } = await supabase
    .from('timeline_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw error
}

export const deleteTimelineEvent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('timeline_events')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Media tags service
export const getMediaTags = async (): Promise<MediaTag[]> => {
  const { data, error } = await supabase
    .from('media_tags')
    .select('*')
  
  if (error) throw error
  return data || []
}

export const addMediaTag = async (tag: Omit<MediaTag, 'id' | 'created_at'>): Promise<MediaTag> => {
  const { data, error } = await supabase
    .from('media_tags')
    .insert([tag])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteMediaTag = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('media_tags')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Location tags service
export const getLocationTags = async (): Promise<LocationTag[]> => {
  const { data, error } = await supabase
    .from('location_tags')
    .select('*')
  
  if (error) throw error
  return data || []
}

export const addLocationTag = async (tag: Omit<LocationTag, 'id' | 'created_at'>): Promise<LocationTag> => {
  const { data, error } = await supabase
    .from('location_tags')
    .insert([tag])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteLocationTag = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('location_tags')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Notifications service
export const getNotifications = async (userName: string, deviceId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_name', userName)
    .eq('user_device_id', deviceId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export const addNotification = async (notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notification])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const markNotificationAsRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  
  if (error) throw error
}

// Site status service
export const getSiteStatus = async (): Promise<SiteStatus | null> => {
  const { data, error } = await supabase
    .from('site_status')
    .select('*')
    .single()
  
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export const updateSiteStatus = async (updates: Partial<SiteStatus>): Promise<void> => {
  const { error } = await supabase
    .from('site_status')
    .upsert({
      id: 'default',
      ...updates,
      updated_at: new Date().toISOString()
    })
  
  if (error) throw error
}

// Real-time subscriptions
export const subscribeToMediaItems = (callback: (payload: any) => void) => {
  return supabase
    .channel('media_items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'media_items' }, callback)
    .subscribe()
}

export const subscribeToComments = (callback: (payload: any) => void) => {
  return supabase
    .channel('comments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, callback)
    .subscribe()
}

export const subscribeToLikes = (callback: (payload: any) => void) => {
  return supabase
    .channel('likes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, callback)
    .subscribe()
}

export const subscribeToStories = (callback: (payload: any) => void) => {
  return supabase
    .channel('stories')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, callback)
    .subscribe()
}

export const subscribeToLiveUsers = (callback: (payload: any) => void) => {
  return supabase
    .channel('live_users')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_users' }, callback)
    .subscribe()
}

export const subscribeToNotifications = (userName: string, deviceId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`notifications_${userName}_${deviceId}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'notifications',
      filter: `user_name=eq.${userName} AND user_device_id=eq.${deviceId}`
    }, callback)
    .subscribe()
}

// Challenge completions (PostgreSQL integration)
export const getChallengeCompletions = async (userName: string, deviceId: string) => {
  const { data, error } = await supabase
    .from('challenge_completions')
    .select('*')
    .eq('user_name', userName)
    .eq('device_id', deviceId)
  
  if (error) throw error
  return data || []
}

export const toggleChallengeCompletion = async (challengeId: string, userName: string, deviceId: string) => {
  const { data: existing } = await supabase
    .from('challenge_completions')
    .select('id')
    .eq('challenge_id', challengeId)
    .eq('user_name', userName)
    .eq('device_id', deviceId)
    .single()
  
  if (existing) {
    await supabase
      .from('challenge_completions')
      .delete()
      .eq('id', existing.id)
    return false
  } else {
    await supabase
      .from('challenge_completions')
      .insert([{
        challenge_id: challengeId,
        user_name: userName,
        device_id: deviceId
      }])
    return true
  }
}

export const getChallengeLeaderboard = async () => {
  const { data, error } = await supabase
    .from('challenge_completions')
    .select('user_name, device_id')
  
  if (error) throw error
  
  const leaderboard: { [key: string]: number } = {}
  
  data?.forEach(completion => {
    const key = `${completion.user_name}_${completion.device_id}`
    leaderboard[key] = (leaderboard[key] || 0) + 1
  })
  
  return Object.entries(leaderboard)
    .map(([key, count]) => {
      const [userName, deviceId] = key.split('_')
      return { userName, deviceId, completedCount: count }
    })
    .sort((a, b) => b.completedCount - a.completedCount)
}