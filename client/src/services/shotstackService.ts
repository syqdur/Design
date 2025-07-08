import axios from 'axios';

interface ShotstackConfig {
  apiKey: string;
  environment: 'stage' | 'v1';
}

interface MediaFile {
  url: string;
  type: 'video' | 'image';
  duration?: number;
}

interface RecapOptions {
  title?: string;
  totalDuration?: number;
  background?: string;
  resolution?: 'preview' | 'mobile' | 'sd' | 'hd' | 'fhd';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
}

interface RenderResponse {
  success: boolean;
  renderId?: string;
  error?: string;
}

interface RenderStatus {
  status: 'queued' | 'fetching' | 'rendering' | 'done' | 'failed';
  progress?: number;
  url?: string;
  error?: string;
}

export class ShotstackService {
  private config: ShotstackConfig;
  private baseUrl: string;

  constructor(apiKey: string, environment: 'stage' | 'v1' = 'stage') {
    this.config = {
      apiKey,
      environment
    };
    this.baseUrl = `https://api.shotstack.io/${environment}`;
  }

  /**
   * Create a wedding recap video from media files
   */
  async createRecapVideo(
    mediaFiles: MediaFile[],
    options: RecapOptions = {}
  ): Promise<RenderResponse> {
    try {
      const {
        title = 'Unsere Hochzeit',
        totalDuration = 30,
        background = '#000000',
        resolution = 'hd',
        aspectRatio = '16:9'
      } = options;

      if (mediaFiles.length === 0) {
        return { success: false, error: 'Keine Mediendateien zum Erstellen des Recaps gefunden' };
      }

      // Calculate clip duration based on number of media files
      const clipDuration = Math.max(2, totalDuration / mediaFiles.length);
      
      // Create clips from media files
      const clips = this.createClipsFromMedia(mediaFiles, clipDuration);
      
      // Create title clip
      const titleClip = this.createTitleClip(title);
      
      // Create audio background (optional)
      const audioClip = this.createBackgroundAudio();

      // Build timeline
      const timeline = {
        background,
        tracks: [
          {
            clips: clips
          },
          {
            clips: [titleClip]
          },
          ...(audioClip ? [{
            clips: [audioClip]
          }] : [])
        ]
      };

      // Output configuration
      const output = {
        format: 'mp4',
        resolution,
        aspectRatio,
        fps: 25,
        quality: 'medium'
      };

      // Create edit request
      const editRequest = {
        timeline,
        output
      };

      console.log('🎬 Sending wedding recap request to Shotstack...');
      console.log(`📊 Media files: ${mediaFiles.length}`);
      console.log(`⏱️ Total duration: ${totalDuration}s`);
      console.log(`🎞️ Clip duration: ${clipDuration}s each`);

      const response = await axios.post(
        `${this.baseUrl}/render`,
        editRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey
          }
        }
      );

      if (response.data?.response?.id) {
        console.log(`✅ Recap render started: ${response.data.response.id}`);
        return {
          success: true,
          renderId: response.data.response.id
        };
      } else {
        return {
          success: false,
          error: 'Unerwartete Antwort von Shotstack API'
        };
      }

    } catch (error: any) {
      console.error('❌ Shotstack recap creation failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Fehler beim Erstellen des Recaps'
      };
    }
  }

  /**
   * Check the status of a render job
   */
  async checkRenderStatus(renderId: string): Promise<RenderStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/render/${renderId}`,
        {
          headers: {
            'x-api-key': this.config.apiKey
          }
        }
      );

      const data = response.data?.response;
      
      return {
        status: data.status,
        progress: data.data?.progress || 0,
        url: data.url,
        error: data.data?.error
      };

    } catch (error: any) {
      console.error('❌ Failed to check render status:', error);
      return {
        status: 'failed',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Create clips from media files
   */
  private createClipsFromMedia(mediaFiles: MediaFile[], clipDuration: number) {
    let currentStart = 0;
    
    return mediaFiles.map((media, index) => {
      const asset = media.type === 'video' ? {
        type: 'video',
        src: media.url,
        trim: 2 // Skip first 2 seconds
      } : {
        type: 'image',
        src: media.url
      };

      const clip = {
        asset,
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
   * Create title clip
   */
  private createTitleClip(title: string) {
    return {
      asset: {
        type: 'title',
        text: title,
        style: 'title3d',
        color: '#ffffff',
        size: 'x-large',
        background: 'rgba(0,0,0,0.5)',
        position: 'center'
      },
      start: 0,
      length: 4,
      transition: {
        in: 'fade',
        out: 'fade'
      }
    };
  }

  /**
   * Create background audio (optional)
   */
  private createBackgroundAudio() {
    // You can add wedding music here
    return null;
  }

  /**
   * Poll render status until completion
   */
  async waitForRender(renderId: string, onProgress?: (progress: number) => void): Promise<string | null> {
    const maxAttempts = 60; // 5 minutes maximum
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.checkRenderStatus(renderId);
      
      if (onProgress && status.progress) {
        onProgress(status.progress);
      }

      if (status.status === 'done' && status.url) {
        return status.url;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Render failed');
      }

      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Render timeout - taking too long to complete');
  }

  /**
   * Get media files from Firebase Storage
   */
  async getMediaFilesFromFirebase(mediaItems: any[]): Promise<MediaFile[]> {
    const mediaFiles: MediaFile[] = [];

    for (const item of mediaItems) {
      if (item.type === 'video') {
        mediaFiles.push({
          url: item.url,
          type: 'video'
        });
      } else if (item.type === 'image') {
        mediaFiles.push({
          url: item.url,
          type: 'image'
        });
      }
    }

    return mediaFiles;
  }

  /**
   * Probe media file to get metadata
   */
  async probeMedia(url: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/probe`,
        {
          params: { url },
          headers: {
            'x-api-key': this.config.apiKey
          }
        }
      );

      return response.data?.response?.metadata;
    } catch (error: any) {
      console.error('❌ Failed to probe media:', error);
      return null;
    }
  }
}

// Default instance (will need API key)
export const shotstackService = new ShotstackService('');

// Helper function to set API key
export const setShotstackApiKey = (apiKey: string) => {
  (shotstackService as any).config.apiKey = apiKey;
};