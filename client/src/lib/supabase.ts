import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zmrrykndtravddnjtuch.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcnJ5a25kdHJhdmRkbmp0dWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDM4ODIsImV4cCI6MjA2NzU3OTg4Mn0.MmCLnAJlUNNDao8wu9tERht_m33WWJj7GDqwMFKzgCw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for Supabase data
export interface UserProfile {
  id: string
  user_name: string
  device_id: string
  display_name?: string
  profile_picture?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface MediaItem {
  id: string
  url: string
  type: 'image' | 'video'
  uploaded_by: string
  uploaded_by_device_id: string
  note?: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  media_id: string
  user_name: string
  user_device_id: string
  text: string
  created_at: string
}

export interface Like {
  id: string
  media_id: string
  user_name: string
  user_device_id: string
  created_at: string
}

export interface Story {
  id: string
  url: string
  type: 'image' | 'video'
  uploaded_by: string
  uploaded_by_device_id: string
  thumbnail_url?: string
  created_at: string
  expires_at: string
}

export interface LiveUser {
  id: string
  user_name: string
  device_id: string
  last_seen: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  date: string
  location?: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_by: string
  created_by_device_id: string
  created_at: string
  updated_at: string
}

export interface MediaTag {
  id: string
  media_id: string
  tagged_user_name: string
  tagged_user_device_id: string
  tagged_by: string
  tagged_by_device_id: string
  created_at: string
}

export interface LocationTag {
  id: string
  media_id: string
  location_name: string
  location_address?: string
  latitude?: number
  longitude?: number
  created_by: string
  created_by_device_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_name: string
  user_device_id: string
  type: 'tag' | 'comment' | 'like'
  message: string
  media_id?: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_by: string
  created_by_device_id: string
  is_read: boolean
  created_at: string
}

export interface SiteStatus {
  id: string
  gallery_enabled: boolean
  stories_enabled: boolean
  music_enabled: boolean
  challenges_enabled: boolean
  updated_at: string
}

// Database Types
export interface UserProfile {
  id: string
  user_name: string
  device_id: string
  display_name?: string
  profile_picture?: string
  bio?: string
  created_at: string
  updated_at: string
}

export interface MediaItem {
  id: string
  url: string
  type: 'image' | 'video'
  uploaded_by: string
  uploaded_by_device_id: string
  note?: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  media_id: string
  user_name: string
  user_device_id: string
  text: string
  created_at: string
}

export interface Like {
  id: string
  media_id: string
  user_name: string
  user_device_id: string
  created_at: string
}

export interface Story {
  id: string
  url: string
  type: 'image' | 'video'
  uploaded_by: string
  uploaded_by_device_id: string
  thumbnail_url?: string
  created_at: string
  expires_at: string
}

export interface LiveUser {
  id: string
  user_name: string
  device_id: string
  last_seen: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  date: string
  location?: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_by: string
  created_by_device_id: string
  created_at: string
  updated_at: string
}

export interface MediaTag {
  id: string
  media_id: string
  tagged_user_name: string
  tagged_user_device_id: string
  tagged_by: string
  tagged_by_device_id: string
  created_at: string
}

export interface LocationTag {
  id: string
  media_id: string
  location_name: string
  location_address?: string
  latitude?: number
  longitude?: number
  created_by: string
  created_by_device_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_name: string
  user_device_id: string
  type: 'tag' | 'comment' | 'like'
  message: string
  media_id?: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_by: string
  created_by_device_id: string
  is_read: boolean
  created_at: string
}

export interface SiteStatus {
  id: string
  gallery_enabled: boolean
  stories_enabled: boolean
  music_enabled: boolean
  challenges_enabled: boolean
  updated_at: string
}