export type Provider = 'spotify' | 'google';
export type TrackSource = 'spotify' | 'yt';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface ConnectedAccount {
  id: string;
  user_id: string;
  provider: Provider;
  access_token_enc: string;
  refresh_token_enc: string;
  expires_at: number; // Unix timestamp in seconds
  updated_at: string;
}

export interface UserTrack {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  playlist_name: string;
  source: TrackSource;
  external_id: string;
  synced_at: string;
}

export interface SearchRequest {
  query: string;
  mode: 'text' | 'ai';
}

export interface SearchResponse {
  query: string;
  mode: 'text' | 'ai';
  tracks: UserTrack[];
  total: number;
  reason?: string;
  message?: string;
}

export interface SyncResponse {
  success: boolean;
  user_id: string;
  synced_total: number;
  new_tracks: number;
  providers: {
    spotify?: { playlists: number; tracks: number; error?: string };
    google?: { playlists: number; tracks: number; error?: string };
  };
}

export interface AccountStatus {
  spotify: boolean;
  google: boolean;
  tracks_count: number;
  last_sync: string | null;
}
