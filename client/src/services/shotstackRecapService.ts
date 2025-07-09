import axios from 'axios';

interface ShotstackRecapConfig {
  apiKey: string;
  environment: 'stage' | 'v1';
}

interface MediaAsset {
  url: string;
  type: 'video' | 'image';
  duration?: number;
  width?: number;
  height?: number;
}

interface RecapSettings {
  title: string;
  duration: number;
  resolution: 'preview' | 'mobile' | 'sd' | 'hd' | 'fhd';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  includeVideos: boolean;
  includeImages: boolean;
}

interface RenderResult {
  success: boolean;
  renderId?: string;
  error?: string;
  details?: string;
}

interface RenderProgress {
  status: 'queued' | 'fetching' | 'rendering' | 'done' | 'failed';
  progress: number;
  url?: string;
  error?: string;
}

export class ShotstackRecapService {
  private config: ShotstackRecapConfig;
  private baseUrl: string;

  constructor(apiKey: string, environment: 'stage' | 'v1' = 'stage') {
    this.config = { apiKey, environment };
    this.baseUrl = `https://api.shotstack.io/${environment}`;
  }

  /**
   * Create wedding recap video with improved error handling
   */
  async createWeddingRecap(
    mediaAssets: MediaAsset[],
    settings: RecapSettings
  ): Promise<RenderResult> {
    try {
      // Validate inputs
      if (!this.config.apiKey || this.config.apiKey.trim() === '') {
        return { 
          success: false, 
          error: 'API-Schlüssel fehlt',
          details: 'Bitte gib einen gültigen Shotstack API-Schlüssel ein'
        };
      }

      if (mediaAssets.length === 0) {
        return { 
          success: false, 
          error: 'Keine Medien verfügbar',
          details: 'Es wurden keine Bilder oder Videos zum Erstellen des Recaps gefunden'
        };
      }

      // Filter media based on settings
      const filteredMedia = mediaAssets.filter(asset => {
        if (asset.type === 'video' && settings.includeVideos) return true;
        if (asset.type === 'image' && settings.includeImages) return true;
        return false;
      });

      if (filteredMedia.length === 0) {
        return { 
          success: false, 
          error: 'Keine geeigneten Medien',
          details: 'Nach Anwendung der Filter sind keine Medien für das Recap verfügbar'
        };
      }

      // Prepare clips with proper timing
      const clipDuration = Math.max(2, settings.duration / filteredMedia.length);
      const clips = this.createOptimizedClips(filteredMedia, clipDuration);

      // Create title clip
      const titleClip = this.createTitleClip(settings.title);

      // Build timeline with proper structure
      const timeline = {
        background: '#000000',
        tracks: [
          {
            clips: clips
          },
          {
            clips: [titleClip]
          }
        ]
      };

      // Configure output with validated resolution
      const output = {
        format: 'mp4',
        resolution: this.validateResolution(settings.resolution),
        fps: 25,
        quality: 'medium'
      };

      // Create render request
      const renderRequest = {
        timeline,
        output
      };

      console.log('🎬 Shotstack Recap Request:', {
        mediaCount: filteredMedia.length,
        duration: settings.duration,
        clipDuration: clipDuration.toFixed(1),
        resolution: output.resolution
      });

      // Send request to Shotstack
      const response = await axios.post(
        `${this.baseUrl}/render`,
        renderRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey
          },
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.data?.response?.id) {
        console.log(`✅ Recap render queued: ${response.data.response.id}`);
        return {
          success: true,
          renderId: response.data.response.id
        };
      }

      return {
        success: false,
        error: 'Ungültige API-Antwort',
        details: 'Shotstack API hat keine Render-ID zurückgegeben'
      };

    } catch (error: any) {
      console.error('❌ Shotstack Error:', error);

      // Parse specific error types
      if (error.response?.status === 400) {
        return {
          success: false,
          error: 'Bad Request - Ungültige Anfrage',
          details: error.response?.data?.message || 'Die Shotstack API hat die Anfrage abgelehnt. Überprüfe deine Medien-URLs und API-Einstellungen.'
        };
      }

      if (error.response?.status === 401) {
        return {
          success: false,
          error: 'Unauthorized - Ungültiger API-Schlüssel',
          details: 'Der API-Schlüssel ist ungültig oder abgelaufen. Überprüfe deinen Shotstack API-Schlüssel.'
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Rate Limit erreicht',
          details: 'Zu viele Anfragen. Warte einen Moment und versuche es erneut.'
        };
      }

      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Timeout',
          details: 'Die Anfrage an Shotstack hat zu lange gedauert. Versuche es erneut.'
        };
      }

      return {
        success: false,
        error: 'Unbekannter Fehler',
        details: error.message || 'Ein unerwarteter Fehler ist aufgetreten.'
      };
    }
  }

  /**
   * Check render status with enhanced progress tracking
   */
  async checkRenderProgress(renderId: string): Promise<RenderProgress> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/render/${renderId}`,
        {
          headers: {
            'x-api-key': this.config.apiKey
          },
          timeout: 10000
        }
      );

      const data = response.data?.response;
      
      return {
        status: data?.status || 'queued',
        progress: data?.data?.progress || 0,
        url: data?.url,
        error: data?.data?.error
      };

    } catch (error: any) {
      console.error('❌ Failed to check render status:', error);
      return {
        status: 'failed',
        progress: 0,
        error: error.response?.data?.message || error.message || 'Status check failed'
      };
    }
  }

  /**
   * Wait for render completion with progress updates
   */
  async waitForCompletion(
    renderId: string, 
    onProgress?: (progress: RenderProgress) => void
  ): Promise<string> {
    const maxAttempts = 120; // 10 minutes maximum
    let attempts = 0;

    while (attempts < maxAttempts) {
      const progress = await this.checkRenderProgress(renderId);
      
      if (onProgress) {
        onProgress(progress);
      }

      if (progress.status === 'done' && progress.url) {
        return progress.url;
      }

      if (progress.status === 'failed') {
        throw new Error(progress.error || 'Render failed without specific error');
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Render timeout - Video-Erstellung dauerte zu lange');
  }

  /**
   * Create optimized clips from media assets
   */
  private createOptimizedClips(mediaAssets: MediaAsset[], clipDuration: number) {
    let currentStart = 0;
    
    return mediaAssets.map((asset, index) => {
      const validUrl = this.validateAndFixUrl(asset.url);
      
      const clip = {
        asset: asset.type === 'video' ? {
          type: 'video',
          src: validUrl,
          trim: 1 // Skip first second
        } : {
          type: 'image',
          src: validUrl
        },
        start: currentStart,
        length: clipDuration,
        transition: {
          in: 'fade',
          out: 'fade'
        }
      };

      currentStart += clipDuration;
      return clip;
    });
  }

  /**
   * Create title clip for the recap
   */
  private createTitleClip(title: string) {
    return {
      asset: {
        type: 'title',
        text: title,
        style: 'minimal',
        color: '#ffffff',
        size: 'large',
        background: 'rgba(0,0,0,0.7)',
        position: 'center'
      },
      start: 0,
      length: 3,
      transition: {
        in: 'fade',
        out: 'fade'
      }
    };
  }

  /**
   * Validate and fix media URLs for Shotstack compatibility
   */
  private validateAndFixUrl(url: string): string {
    // Fix Firebase Storage URLs
    if (url.includes('firebasestorage.googleapis.com')) {
      if (!url.includes('alt=media')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}alt=media`;
      }
    }

    // Ensure HTTPS
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }

    return url;
  }

  /**
   * Validate resolution setting
   */
  private validateResolution(resolution: string): string {
    const validResolutions = ['preview', 'mobile', 'sd', 'hd', '1080'];
    const resolutionMap: { [key: string]: string } = {
      'preview': 'preview',
      'mobile': 'mobile', 
      'sd': 'sd',
      'hd': 'hd',
      'fhd': '1080'
    };
    
    return resolutionMap[resolution] || 'hd';
  }

  /**
   * Convert media items to assets
   */
  convertMediaItems(mediaItems: any[]): MediaAsset[] {
    return mediaItems
      .filter(item => item.type === 'video' || item.type === 'image')
      .map(item => ({
        url: item.url,
        type: item.type,
        duration: item.duration
      }));
  }
}

// Export a helper function to create service instances
export const createShotstackService = (apiKey: string) => {
  return new ShotstackRecapService(apiKey, 'stage');
};