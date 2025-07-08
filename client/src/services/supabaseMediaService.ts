import { supabase } from '../config/supabase'
import { uploadFile, deleteFile } from './supabaseService'

// Convert Firebase media format to Supabase format
export interface SupabaseMediaItem {
  id: string
  url: string
  type: 'image' | 'video'
  uploaded_by: string
  uploaded_by_device_id: string
  note?: string
  created_at: string
  updated_at: string
}

// Upload media to Supabase
export const uploadMediaToSupabase = async (
  file: File, 
  userName: string, 
  deviceId: string, 
  note?: string
): Promise<SupabaseMediaItem> => {
  try {
    console.log('📤 Uploading to Supabase:', file.name)
    
    // Upload file to storage
    const url = await uploadFile(file, 'uploads')
    
    // Create media item record
    const mediaItem = {
      url,
      type: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
      uploaded_by: userName,
      uploaded_by_device_id: deviceId,
      note: note || null
    }
    
    const { data, error } = await supabase
      .from('media_items')
      .insert([mediaItem])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Supabase insert error:', error)
      throw error
    }
    
    console.log('✅ Media uploaded to Supabase:', data.id)
    return data
    
  } catch (error) {
    console.error('💥 Upload failed:', error)
    throw error
  }
}

// Get all media items from Supabase
export const getSupabaseMediaItems = async (): Promise<SupabaseMediaItem[]> => {
  try {
    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
    
  } catch (error) {
    console.error('❌ Failed to fetch media items:', error)
    return []
  }
}

// Delete media item from Supabase
export const deleteSupabaseMediaItem = async (id: string, url: string): Promise<void> => {
  try {
    // Delete from database
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    // Delete from storage
    await deleteFile(url)
    
    console.log('✅ Media deleted from Supabase:', id)
    
  } catch (error) {
    console.error('❌ Failed to delete media:', error)
    throw error
  }
}

// Update media item note
export const updateSupabaseMediaNote = async (id: string, note: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('media_items')
      .update({ 
        note,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    
    if (error) throw error
    
    console.log('✅ Media note updated:', id)
    
  } catch (error) {
    console.error('❌ Failed to update note:', error)
    throw error
  }
}

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Supabase connection...')
    
    // Test database connection
    const { data, error } = await supabase
      .from('media_items')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Database test failed:', error.message)
      return false
    }
    
    // Test storage
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets()
    
    if (storageError) {
      console.log('❌ Storage test failed:', storageError.message)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('📊 Available buckets:', buckets?.map(b => b.name))
    
    return true
    
  } catch (error) {
    console.error('💥 Connection test failed:', error)
    return false
  }
}