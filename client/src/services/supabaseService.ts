import { supabase } from '../lib/supabase'

// User Profile Service
export const userProfileService = {
  async createProfile(profile: {
    user_name: string
    device_id: string
    display_name?: string
    profile_picture?: string
    bio?: string
  }) {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert([{
        user_name: profile.user_name,
        device_id: profile.device_id,
        display_name: profile.display_name,
        profile_picture: profile.profile_picture,
        bio: profile.bio
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getProfile(userName: string, deviceId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_name', userName)
      .eq('device_id', deviceId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async getAllProfiles() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async updateProfile(userName: string, deviceId: string, updates: {
    display_name?: string
    profile_picture?: string
    bio?: string
  }) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_name', userName)
      .eq('device_id', deviceId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteProfile(userName: string, deviceId: string) {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_name', userName)
      .eq('device_id', deviceId)

    if (error) throw error
  }
}

// Media Service
export const mediaService = {
  async uploadMedia(file: File, userName: string, deviceId: string, note?: string) {
    // Upload file to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('wedding-media')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wedding-media')
      .getPublicUrl(filePath)

    // Create media record
    const { data, error } = await supabase
      .from('media_items')
      .insert([{
        url: publicUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        uploaded_by: userName,
        uploaded_by_device_id: deviceId,
        note: note || null
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getMedia() {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async deleteMedia(mediaId: string) {
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', mediaId)

    if (error) throw error
  },

  async updateMediaNote(mediaId: string, note: string) {
    const { data, error } = await supabase
      .from('media_items')
      .update({
        note,
        updated_at: new Date().toISOString()
      })
      .eq('id', mediaId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Comments Service
export const commentsService = {
  async addComment(mediaId: string, userName: string, deviceId: string, text: string) {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        media_id: mediaId,
        user_name: userName,
        user_device_id: deviceId,
        text
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getComments(mediaId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('media_id', mediaId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getAllComments() {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async deleteComment(commentId: string) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  }
}

// Likes Service
export const likesService = {
  async toggleLike(mediaId: string, userName: string, deviceId: string) {
    // Check if like exists
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('media_id', mediaId)
      .eq('user_name', userName)
      .eq('user_device_id', deviceId)
      .single()

    if (existingLike) {
      // Remove like
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id)

      if (error) throw error
      return false
    } else {
      // Add like
      const { error } = await supabase
        .from('likes')
        .insert([{
          media_id: mediaId,
          user_name: userName,
          user_device_id: deviceId
        }])

      if (error) throw error
      return true
    }
  },

  async getLikes(mediaId: string) {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('media_id', mediaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getAllLikes() {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}

// Stories Service
export const storiesService = {
  async uploadStory(file: File, userName: string, deviceId: string) {
    // Upload file to storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
    const filePath = `stories/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('wedding-media')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wedding-media')
      .getPublicUrl(filePath)

    // Create story record
    const { data, error } = await supabase
      .from('stories')
      .insert([{
        url: publicUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        uploaded_by: userName,
        uploaded_by_device_id: deviceId
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getStories() {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async deleteStory(storyId: string) {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)

    if (error) throw error
  }
}

// Live Users Service
export const liveUsersService = {
  async updatePresence(userName: string, deviceId: string) {
    const { data, error } = await supabase
      .from('live_users')
      .upsert([{
        user_name: userName,
        device_id: deviceId,
        last_seen: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getActiveUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('live_users')
      .select('*')
      .gt('last_seen', fiveMinutesAgo)
      .eq('is_active', true)
      .order('last_seen', { ascending: false })

    if (error) throw error
    return data || []
  },

  async setOffline(userName: string, deviceId: string) {
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
}

// Site Status Service
export const siteStatusService = {
  async getSiteStatus() {
    const { data, error } = await supabase
      .from('site_status')
      .select('*')
      .limit(1)
      .single()

    if (error) throw error
    return data
  },

  async updateSiteStatus(updates: {
    gallery_enabled?: boolean
    stories_enabled?: boolean
    music_enabled?: boolean
    challenges_enabled?: boolean
  }) {
    const { data, error } = await supabase
      .from('site_status')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Real-time Subscriptions
export const subscriptions = {
  subscribeToMedia(callback: (payload: any) => void) {
    return supabase
      .channel('media-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_items' }, callback)
      .subscribe()
  },

  subscribeToComments(callback: (payload: any) => void) {
    return supabase
      .channel('comments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, callback)
      .subscribe()
  },

  subscribeToLikes(callback: (payload: any) => void) {
    return supabase
      .channel('likes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, callback)
      .subscribe()
  },

  subscribeToLiveUsers(callback: (payload: any) => void) {
    return supabase
      .channel('live-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_users' }, callback)
      .subscribe()
  },

  subscribeToStories(callback: (payload: any) => void) {
    return supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, callback)
      .subscribe()
  },

  unsubscribe(subscription: any) {
    return supabase.removeChannel(subscription)
  }
}

// File upload helper function
export const uploadFile = async (file: File, folder: string = 'uploads'): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('wedding-media')
      .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wedding-media')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// File deletion helper function
export const deleteFile = async (url: string) => {
  try {
    // Extract file path from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from('wedding-media')
      .remove([filePath]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}