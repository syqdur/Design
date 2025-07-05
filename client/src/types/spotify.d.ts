// Global SpotifyApi types declaration
declare global {
  namespace SpotifyApi {
    interface PlaylistObjectSimplified {
      id: string;
      name: string;
      images: Array<{ url: string; height: number; width: number }>;
      tracks: { total: number };
      owner: { display_name: string };
    }

    interface CurrentUsersProfileResponse {
      id: string;
      display_name: string;
      email: string;
      images: Array<{ url: string; height: number; width: number }>;
    }

    interface PlaylistTrackObject {
      added_at: string;
      added_by: {
        id: string;
        type: string;
        uri: string;
        href: string;
        external_urls: { spotify: string };
      };
      is_local: boolean;
      track: {
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        album: {
          name: string;
          images: Array<{ url: string; height: number; width: number }>;
        };
        uri: string;
        external_urls: { spotify: string };
      };
    }
  }
}

export {};