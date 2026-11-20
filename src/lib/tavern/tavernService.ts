import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Lobby, Track, TavernMember, PlaybackSyncPayload } from '@/types/tavern';

const DEMO_LOBBIES_KEY = 'bards_tavern_demo_lobbies';
const DEMO_TRACKS_KEY = 'bards_tavern_demo_tracks';

// Helper to hash password client-side
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`bards_salt_${password}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generates a short tavern code e.g. TAV-4921
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TAV-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Built-in starter tracks for demo/offline mode
export const STARTER_BARDS_TRACKS = [
  {
    title: 'The Wandering Bard\'s Tale',
    artist: 'Highland Minstrel',
    duration: 184,
    audio_url: 'https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3',
    storage_path: 'starter/wandering_bard.mp3',
    mime_type: 'audio/mpeg',
  },
  {
    title: 'Hearthfire & Frothy Ale',
    artist: 'Tavern Lute Ensemble',
    duration: 142,
    audio_url: 'https://cdn.freesound.org/previews/612/612087_5674468-lq.mp3',
    storage_path: 'starter/hearthfire.mp3',
    mime_type: 'audio/mpeg',
  },
  {
    title: 'Shadows over the Wilds',
    artist: 'Daggerheart Soundscape',
    duration: 210,
    audio_url: 'https://cdn.freesound.org/previews/536/536108_5674468-lq.mp3',
    storage_path: 'starter/shadows_wilds.mp3',
    mime_type: 'audio/mpeg',
  }
];

export class TavernService {
  /**
   * List active lobbies
   */
  static async listActiveLobbies(): Promise<Lobby[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('lobbies')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching lobbies from Supabase:', error);
        return this.getLocalDemoLobbies();
      }

      return (data || []).map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description || '',
        host_session_id: row.host_session_id,
        host_name: row.host_name,
        has_password: Boolean(row.password_hash),
        password_hash: row.password_hash,
        is_locked: row.is_locked,
        current_track_id: row.current_track_id,
        is_playing: row.is_playing,
        playback_position: row.playback_position,
        playback_rate: row.playback_rate || 1.0,
        playback_updated_at: row.playback_updated_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_heartbeat_at: row.last_heartbeat_at,
        status: row.status,
        member_count: 1,
        current_track: null,
      }));
    }

    return this.getLocalDemoLobbies();
  }

  /**
   * Get single lobby by Code or ID
   */
  static async getLobbyByCode(codeOrId: string): Promise<Lobby | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const clean = codeOrId.trim();
      const isUUID = clean.length === 36 && clean.includes('-');
      let query = supabase.from('lobbies').select('*');
      if (isUUID) {
        query = query.eq('id', clean);
      } else {
        query = query.ilike('code', clean);
      }

      const { data, error } = await query.maybeSingle();
      if (error || !data) {
        return this.getLocalDemoLobbyByCode(codeOrId);
      }

      return {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || '',
        host_session_id: data.host_session_id,
        host_name: data.host_name,
        has_password: Boolean(data.password_hash),
        password_hash: data.password_hash,
        is_locked: data.is_locked,
        current_track_id: data.current_track_id,
        is_playing: data.is_playing,
        playback_position: data.playback_position,
        playback_rate: data.playback_rate || 1.0,
        playback_updated_at: data.playback_updated_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_heartbeat_at: data.last_heartbeat_at,
        status: data.status,
      };
    }

    return this.getLocalDemoLobbyByCode(codeOrId);
  }

  /**
   * Create a new tavern lobby
   */
  static async createLobby(params: {
    name: string;
    description?: string;
    password?: string;
    hostSessionId: string;
    hostName: string;
  }): Promise<Lobby> {
    const code = generateLobbyCode();
    const passwordHash = params.password ? await hashPassword(params.password) : null;
    const nowIso = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('lobbies')
        .insert({
          code,
          name: params.name,
          description: params.description || '',
          host_session_id: params.hostSessionId,
          host_name: params.hostName,
          password_hash: passwordHash,
          is_locked: Boolean(passwordHash),
          is_playing: false,
          playback_position: 0,
          playback_rate: 1.0,
          playback_updated_at: nowIso,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase create lobby error:', error);
        throw new Error(error.message);
      }

      // Add starter tracks to this newly created lobby in Supabase
      try {
        const starterInserts = STARTER_BARDS_TRACKS.map((t, idx) => ({
          lobby_id: data.id,
          title: t.title,
          artist: t.artist,
          audio_url: t.audio_url,
          storage_path: t.storage_path,
          duration: t.duration,
          file_size: 2500000,
          mime_type: t.mime_type,
          order_index: idx,
          added_by: params.hostName,
        }));
        await supabase.from('tracks').insert(starterInserts);
      } catch (err) {
        console.warn('Could not seed starter tracks:', err);
      }

      return {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description || '',
        host_session_id: data.host_session_id,
        host_name: data.host_name,
        has_password: Boolean(passwordHash),
        password_hash: passwordHash,
        is_locked: Boolean(passwordHash),
        current_track_id: null,
        is_playing: false,
        playback_position: 0,
        playback_rate: 1.0,
        playback_updated_at: nowIso,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_heartbeat_at: data.last_heartbeat_at,
        status: 'active',
      };
    }

    // Local demo fallback
    const localLobby: Lobby = {
      id: crypto.randomUUID ? crypto.randomUUID() : `lobby_${Date.now()}`,
      code,
      name: params.name,
      description: params.description || '',
      host_session_id: params.hostSessionId,
      host_name: params.hostName,
      has_password: Boolean(passwordHash),
      password_hash: passwordHash,
      is_locked: Boolean(passwordHash),
      current_track_id: null,
      is_playing: false,
      playback_position: 0,
      playback_rate: 1.0,
      playback_updated_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
      last_heartbeat_at: nowIso,
      status: 'active',
    };

    this.saveLocalDemoLobby(localLobby);
    // Seed starter tracks for local demo
    const starterTracks: Track[] = STARTER_BARDS_TRACKS.map((t, idx) => ({
      id: `track_${localLobby.id}_${idx}`,
      lobby_id: localLobby.id,
      title: t.title,
      artist: t.artist,
      audio_url: t.audio_url,
      storage_path: t.storage_path,
      duration: t.duration,
      file_size: 2500000,
      mime_type: t.mime_type,
      order_index: idx,
      added_by: params.hostName,
      created_at: nowIso,
    }));
    this.saveLocalDemoTracks(localLobby.id, starterTracks);

    return localLobby;
  }

  /**
   * Fetch tracks for a lobby
   */
  static async getTracks(lobbyId: string): Promise<Track[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('order_index', { ascending: true });

      if (!error && data) {
        return data;
      }
    }
    return this.getLocalDemoTracks(lobbyId);
  }

  /**
   * Upload audio file to Supabase Storage and insert track record
   */
  static async uploadTrack(params: {
    lobbyId: string;
    file: File;
    title: string;
    artist?: string;
    hostSessionId: string;
    addedBy: string;
  }): Promise<Track> {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a'];
    if (!allowedTypes.includes(params.file.type) && !params.file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      throw new Error('Only MP3, WAV, and OGG audio files are allowed.');
    }

    if (params.file.size > 50 * 1024 * 1024) {
      throw new Error('File exceeds the 50MB limit.');
    }

    const supabase = getSupabaseClient();
    const sanitizedFileName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${params.lobbyId}/${Date.now()}_${sanitizedFileName}`;

    let publicUrl = '';

    if (supabase) {
      // Upload to bucket 'bard-tracks'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bard-tracks')
        .upload(storagePath, params.file, {
          cacheControl: '3600',
          upsert: false,
          contentType: params.file.type || 'audio/mpeg',
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('bard-tracks')
        .getPublicUrl(uploadData.path);

      publicUrl = urlData.publicUrl;

      // Extract duration or default
      const duration = await this.probeAudioDuration(params.file);

      // Fetch track count for order index
      const { count } = await supabase
        .from('tracks')
        .select('*', { count: 'exact', head: true })
        .eq('lobby_id', params.lobbyId);

      const { data: trackData, error: trackError } = await supabase
        .from('tracks')
        .insert({
          lobby_id: params.lobbyId,
          title: params.title || params.file.name.replace(/\.[^/.]+$/, ''),
          artist: params.artist || 'Bard',
          audio_url: publicUrl,
          storage_path: uploadData.path,
          duration,
          file_size: params.file.size,
          mime_type: params.file.type || 'audio/mpeg',
          order_index: count || 0,
          added_by: params.addedBy,
        })
        .select()
        .single();

      if (trackError) {
        throw new Error(trackError.message);
      }

      return trackData;
    }

    // Local Demo / Offline Fallback (uses Blob URL for instant playback)
    const blobUrl = URL.createObjectURL(params.file);
    const duration = await this.probeAudioDuration(params.file);
    const existing = this.getLocalDemoTracks(params.lobbyId);

    const newTrack: Track = {
      id: `local_track_${Date.now()}`,
      lobby_id: params.lobbyId,
      title: params.title || params.file.name.replace(/\.[^/.]+$/, ''),
      artist: params.artist || 'Bard',
      audio_url: blobUrl,
      storage_path: storagePath,
      duration,
      file_size: params.file.size,
      mime_type: params.file.type || 'audio/mpeg',
      order_index: existing.length,
      added_by: params.addedBy,
      created_at: new Date().toISOString(),
    };

    existing.push(newTrack);
    this.saveLocalDemoTracks(params.lobbyId, existing);
    return newTrack;
  }

  /**
   * Delete track (Host only)
   */
  static async deleteTrack(lobbyId: string, trackId: string, storagePath: string, hostSessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      // Verify host permission
      const { data: lobby } = await supabase
        .from('lobbies')
        .select('host_session_id')
        .eq('id', lobbyId)
        .single();

      if (!lobby || lobby.host_session_id !== hostSessionId) {
        throw new Error('Unauthorized: Only the Tavern Host can delete tracks.');
      }

      // Delete storage file
      if (storagePath && !storagePath.startsWith('starter/')) {
        await supabase.storage.from('bard-tracks').remove([storagePath]);
      }

      // Delete track record
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId)
        .eq('lobby_id', lobbyId);

      return !error;
    }

    // Local demo
    const tracks = this.getLocalDemoTracks(lobbyId).filter(t => t.id !== trackId);
    this.saveLocalDemoTracks(lobbyId, tracks);
    return true;
  }

  /**
   * Update shared playback state (Host only)
   */
  static async updatePlayback(payload: PlaybackSyncPayload): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('lobbies')
        .update({
          current_track_id: payload.current_track_id,
          is_playing: payload.is_playing,
          playback_position: payload.playback_position,
          playback_updated_at: payload.playback_updated_at,
          playback_rate: payload.playback_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.lobby_id)
        .eq('host_session_id', payload.host_session_id);

      if (error) {
        console.error('Failed to update playback state in Supabase:', error);
        return false;
      }
      return true;
    }

    // Local demo
    const lobby = this.getLocalDemoLobbyById(payload.lobby_id);
    if (lobby) {
      lobby.current_track_id = payload.current_track_id;
      lobby.is_playing = payload.is_playing;
      lobby.playback_position = payload.playback_position;
      lobby.playback_updated_at = payload.playback_updated_at;
      lobby.playback_rate = payload.playback_rate;
      this.saveLocalDemoLobby(lobby);
    }
    return true;
  }

  /**
   * Transfer host to another adventurer
   */
  static async transferHost(params: {
    lobbyId: string;
    currentHostSessionId: string;
    newHostSessionId: string;
    newHostName: string;
  }): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('lobbies')
        .update({
          host_session_id: params.newHostSessionId,
          host_name: params.newHostName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.lobbyId)
        .eq('host_session_id', params.currentHostSessionId);

      if (error) {
        console.error('Host transfer failed:', error);
        return false;
      }
      return true;
    }

    // Local demo
    const lobby = this.getLocalDemoLobbyById(params.lobbyId);
    if (lobby && lobby.host_session_id === params.currentHostSessionId) {
      lobby.host_session_id = params.newHostSessionId;
      lobby.host_name = params.newHostName;
      this.saveLocalDemoLobby(lobby);
      return true;
    }
    return false;
  }

  /**
   * Rename lobby (Host only)
   */
  static async renameLobby(lobbyId: string, newName: string, hostSessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('lobbies')
        .update({
          name: newName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lobbyId)
        .eq('host_session_id', hostSessionId);

      return !error;
    }

    const lobby = this.getLocalDemoLobbyById(lobbyId);
    if (lobby && lobby.host_session_id === hostSessionId) {
      lobby.name = newName;
      this.saveLocalDemoLobby(lobby);
      return true;
    }
    return false;
  }

  /**
   * Close lobby (Host only)
   */
  static async closeLobby(lobbyId: string, hostSessionId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase
        .from('lobbies')
        .update({
          status: 'closed',
          is_playing: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lobbyId)
        .eq('host_session_id', hostSessionId);

      return !error;
    }

    const lobby = this.getLocalDemoLobbyById(lobbyId);
    if (lobby && lobby.host_session_id === hostSessionId) {
      lobby.status = 'closed';
      lobby.is_playing = false;
      this.saveLocalDemoLobby(lobby);
      return true;
    }
    return false;
  }

  // --- Helpers for Audio Duration & Demo Storage ---

  private static probeAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const tempAudio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      tempAudio.src = objectUrl;
      tempAudio.addEventListener('loadedmetadata', () => {
        const dur = Math.round(tempAudio.duration) || 0;
        URL.revokeObjectURL(objectUrl);
        resolve(dur);
      });
      tempAudio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      });
    });
  }

  private static getLocalDemoLobbies(): Lobby[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(DEMO_LOBBIES_KEY);
      if (raw) {
        const list: Lobby[] = JSON.parse(raw);
        return list.filter(l => l.status === 'active');
      }
    } catch {
      // ignore
    }
    // Default initial tavern
    const defaultLobby: Lobby = {
      id: 'demo-tavern-hearth',
      code: 'TAV-GOLD',
      name: 'The Gilded Goblet',
      description: 'Cozy roadside inn where adventurers rest between perilous dungeons.',
      host_session_id: 'host-default-skald',
      host_name: 'Corvo Quillweaver',
      has_password: false,
      is_locked: false,
      current_track_id: 'starter_0',
      is_playing: false,
      playback_position: 0,
      playback_rate: 1.0,
      playback_updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_heartbeat_at: new Date().toISOString(),
      status: 'active',
    };
    this.saveLocalDemoLobby(defaultLobby);
    const starterTracks: Track[] = STARTER_BARDS_TRACKS.map((t, idx) => ({
      id: `starter_${idx}`,
      lobby_id: defaultLobby.id,
      title: t.title,
      artist: t.artist,
      audio_url: t.audio_url,
      storage_path: t.storage_path,
      duration: t.duration,
      file_size: 2500000,
      mime_type: t.mime_type,
      order_index: idx,
      added_by: 'Corvo Quillweaver',
      created_at: new Date().toISOString(),
    }));
    this.saveLocalDemoTracks(defaultLobby.id, starterTracks);
    return [defaultLobby];
  }

  private static getLocalDemoLobbyByCode(codeOrId: string): Lobby | null {
    const list = this.getLocalDemoLobbies();
    const clean = codeOrId.toUpperCase().trim();
    return list.find(l => l.code.toUpperCase() === clean || l.id === codeOrId) || null;
  }

  private static getLocalDemoLobbyById(id: string): Lobby | null {
    const list = this.getLocalDemoLobbies();
    return list.find(l => l.id === id) || null;
  }

  private static saveLocalDemoLobby(lobby: Lobby) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DEMO_LOBBIES_KEY);
      const list: Lobby[] = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(l => l.id === lobby.id);
      if (idx >= 0) {
        list[idx] = lobby;
      } else {
        list.unshift(lobby);
      }
      localStorage.setItem(DEMO_LOBBIES_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  private static getLocalDemoTracks(lobbyId: string): Track[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${DEMO_TRACKS_KEY}_${lobbyId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }

  private static saveLocalDemoTracks(lobbyId: string, tracks: Track[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${DEMO_TRACKS_KEY}_${lobbyId}`, JSON.stringify(tracks));
    } catch {
      // ignore
    }
  }
}
