export interface Lobby {
  id: string;
  code: string;
  name: string;
  description: string;
  host_session_id: string;
  host_name: string;
  has_password: boolean;
  password_hash?: string | null;
  is_locked: boolean;
  current_track_id: string | null;
  is_playing: boolean;
  playback_position: number; // in seconds
  playback_rate: number;
  playback_updated_at: string; // ISO string server timestamp
  loop_mode?: 'off' | 'track' | 'all';
  created_at: string;
  updated_at: string;
  last_heartbeat_at: string;
  status: 'active' | 'closed';
  member_count?: number;
  current_track?: Track | null;
}

export interface Track {
  id: string;
  lobby_id: string;
  title: string;
  artist: string;
  audio_url: string;
  storage_path: string;
  duration: number; // in seconds
  file_size: number; // in bytes
  mime_type: string;
  order_index: number;
  added_by: string;
  created_at: string;
}

export interface TavernMember {
  session_id: string;
  display_name: string;
  is_host: boolean;
  joined_at: string;
  last_seen_at: string;
  is_muted?: boolean;
}

export interface PlaybackSyncPayload {
  lobby_id: string;
  current_track_id: string | null;
  is_playing: boolean;
  playback_position: number;
  playback_updated_at: string;
  playback_rate: number;
  loop_mode?: 'off' | 'track' | 'all';
  host_session_id: string;
}

export interface TavernActivity {
  id: string;
  type: 'join' | 'leave' | 'track_change' | 'playback' | 'host_transfer' | 'dice_roll' | 'chat';
  author: string;
  text: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UserSession {
  sessionId: string;
  displayName: string;
}
