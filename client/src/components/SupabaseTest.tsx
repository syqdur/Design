import React, { useState, useEffect } from 'react'
import { testSupabaseConnection, uploadMediaToSupabase, getSupabaseMediaItems } from '../services/supabaseMediaService'
import { Loader2, Upload, Database, CheckCircle, XCircle } from 'lucide-react'

interface SupabaseTestProps {
  userName: string
  deviceId: string
  isDarkMode: boolean
}

export const SupabaseTest: React.FC<SupabaseTestProps> = ({
  userName,
  deviceId,
  isDarkMode
}) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [mediaCount, setMediaCount] = useState(0)
  const [uploadResult, setUploadResult] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
    loadMediaCount()
  }, [])

  const checkConnection = async () => {
    console.log('🔍 Testing Supabase connection...')
    const connected = await testSupabaseConnection()
    setIsConnected(connected)
  }

  const loadMediaCount = async () => {
    try {
      const items = await getSupabaseMediaItems()
      setMediaCount(items.length)
    } catch (error) {
      console.error('Failed to load media count:', error)
    }
  }

  const handleTestUpload = async () => {
    setIsUploading(true)
    setUploadResult(null)
    
    try {
      // Create a test image file
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100
      const ctx = canvas.getContext('2d')!
      
      // Draw a simple test pattern
      ctx.fillStyle = '#4F46E5'
      ctx.fillRect(0, 0, 100, 100)
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '12px Arial'
      ctx.fillText('TEST', 35, 55)
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png')
      })
      
      // Create file
      const testFile = new File([blob], `test-${Date.now()}.png`, { type: 'image/png' })
      
      // Upload to Supabase
      const result = await uploadMediaToSupabase(testFile, userName, deviceId, 'Supabase test upload')
      
      setUploadResult(`✅ Success! ID: ${result.id}`)
      await loadMediaCount() // Refresh count
      
    } catch (error) {
      console.error('Upload test failed:', error)
      setUploadResult(`❌ Failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`
      p-6 rounded-2xl border backdrop-blur-sm
      ${isDarkMode 
        ? 'bg-gray-900/80 border-gray-700 text-white' 
        : 'bg-white/80 border-gray-200 text-gray-900'
      }
    `}>
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-blue-500" />
        <h3 className="text-lg font-semibold">Supabase Migration Test</h3>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium">Connection Status:</span>
        {isConnected === null ? (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Testing...</span>
          </div>
        ) : isConnected ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">Failed</span>
          </div>
        )}
      </div>

      {/* Media Count */}
      <div className="mb-4">
        <span className="text-sm">
          <strong>Media Items in Supabase:</strong> {mediaCount}
        </span>
      </div>

      {/* Test Upload */}
      <button
        onClick={handleTestUpload}
        disabled={!isConnected || isUploading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          transition-colors duration-200
          ${!isConnected || isUploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isDarkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }
        `}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Testing Upload...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Test Upload</span>
          </>
        )}
      </button>

      {/* Upload Result */}
      {uploadResult && (
        <div className="mt-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <span className="text-sm font-mono">{uploadResult}</span>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>This tests the new Supabase database and storage.</p>
        <p>User: {userName} | Device: {deviceId.slice(-8)}</p>
      </div>
    </div>
  )
}