'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Lobby, Track, TavernMember, TavernActivity, UserSession, PlaybackSyncPayload, AudioChannelType, ChannelState } from '@/types/tavern';
import { getUserSession, setDisplayName as saveDisplayName } from '@/lib/tavern/userSession';
import { TavernAudioManager, computeServerPosition } from '@/lib/tavern/audioSync';
import { TavernService, hashPassword } from '@/lib/tavern/tavernService';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TavernContextType {
  userSession: UserSession;
  updateDisplayName: (name: string) => void;
  activeLobby: Lobby | null;
  tracks: Track[];
  activeTrack: Track | null;
  isHost: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  isAutoplayBlocked: boolean;
  unlockAutoplay: () => void;
  members: TavernMember[];
  activities: TavernActivity[];
  visualizerData: number[];
  loopMode: 'off' | 'track' | 'all';
  toggleLoopMode: () => void;
  // 3-Channel Layered Audio Controls (Music, Ambience, Atmosphere)
  channels: Record<AudioChannelType, ChannelState>;
  setChannelTrack: (type: AudioChannelType, track: { id: string | null; title: string; url: string | null }) => void;
  toggleChannelPlay: (type: AudioChannelType) => void;
  seekChannel: (type: AudioChannelType, position: number) => void;
  setChannelVolume: (type: AudioChannelType, val: number) => void;
  toggleChannelMute: (type: AudioChannelType) => void;
  isConnecting: boolean;
  pendingPasswordLobby: Lobby | null;
  setPendingPasswordLobby: (lobby: Lobby | null) => void;
  hearthSoundActive: boolean;
  toggleHearthSound: () => void;
  joinLobby: (codeOrId: string, password?: string) => Promise<boolean>;
  leaveLobby: () => void;
  createLobby: (name: string, description?: string, password?: string) => Promise<Lobby>;
  hostPlay: () => Promise<void>;
  hostPause: () => Promise<void>;
  hostSeek: (position: number) => Promise<void>;
  hostSelectTrack: (trackId: string) => Promise<void>;
  hostNextTrack: () => Promise<void>;
  hostPrevTrack: () => Promise<void>;
  hostUploadTrack: (file: File, title: string, artist?: string) => Promise<Track>;
  hostDeleteTrack: (trackId: string) => Promise<void>;
  hostTransfer: (newHostSessionId: string, newHostName: string) => Promise<void>;
  hostRenameLobby: (newName: string) => Promise<void>;
  hostCloseLobby: () => Promise<void>;
  rollDualityDice: () => void;
  sendTavernToast: (msg: string) => void;
  refreshLobby: () => Promise<void>;
}

const TavernContext = createContext<TavernContextType | null>(null);

export const TavernProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userSession, setUserSession] = useState<UserSession>({
    sessionId: '',
    displayName: 'Wandering Bard',
  });

  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMutedState] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [members, setMembers] = useState<TavernMember[]>([]);
  const [activities, setActivities] = useState<TavernActivity[]>([]);
  const [visualizerData, setVisualizerData] = useState<number[]>(Array(16).fill(0));
  const [loopMode, setLoopMode] = useState<'off' | 'track' | 'all'>('all');
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingPasswordLobby, setPendingPasswordLobby] = useState<Lobby | null>(null);
  const [hearthSoundActive, setHearthSoundActive] = useState(false);

  // 3-Channel Layered Audio State (Music, Ambience, Atmosphere)
  const [channels, setChannels] = useState<Record<AudioChannelType, ChannelState>>({
    music: {
      id: 'music',
      name: 'Main Score',
      trackId: null,
      trackTitle: 'Waiting for Bard...',
      trackUrl: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      isMuted: false,
      loop: false,
    },
    ambience: {
      id: 'ambience',
      name: 'Environmental Ambience',
      trackId: 'amb_rain',
      trackTitle: 'Drenching Mountain Rain',
      trackUrl: 'https://cdn.freesound.org/previews/536/536108_5674468-lq.mp3',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      isMuted: false,
      loop: true,
    },
    atmosphere: {
      id: 'atmosphere',
      name: 'Hearth & Atmosphere',
      trackId: 'atm_hearth',
      trackTitle: 'Crackling Hearthfire',
      trackUrl: 'https://cdn.freesound.org/previews/415/415209_5121236-lq.mp3',
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.6,
      isMuted: false,
      loop: true,
    },
  });

  // Audio Manager Singleton
  const audioManagerRef = useRef<TavernAudioManager | null>(null);
  // Realtime Channel
  const channelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const hearthAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stale closure guards for realtime listeners
  const activeLobbyRef = useRef<Lobby | null>(activeLobby);
  activeLobbyRef.current = activeLobby;
  const tracksRef = useRef<Track[]>(tracks);
  tracksRef.current = tracks;
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  const toggleLoopMode = () => {
    setLoopMode((prev) => {
      const next = prev === 'off' ? 'track' : prev === 'track' ? 'all' : 'off';
      return next;
    });
  };

  // Initialize User Session and Audio Manager
  useEffect(() => {
    const session = getUserSession();
    setUserSession(session);

    const manager = new TavernAudioManager();
    audioManagerRef.current = manager;

    setVolumeState(manager.getVolume());
    setIsMutedState(manager.getIsMuted());

    const channelKeys: AudioChannelType[] = ['music', 'ambience', 'atmosphere'];
    channelKeys.forEach((type) => {
      manager.setOnChannelTimeUpdate(type, (time, dur) => {
        setChannels((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            currentTime: time,
            duration: dur > 0 ? dur : prev[type].duration,
          },
        }));
        if (type === 'music') {
          setCurrentTime(time);
          if (dur > 0) setDuration(dur);
        }
      });
    });

    manager.setOnAutoplayBlocked((blocked) => {
      setIsAutoplayBlocked(blocked);
    });

    return () => {
      manager.cleanup();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      if (hearthAudioRef.current) {
        hearthAudioRef.current.pause();
      }
    };
  }, []);

  const updateDisplayName = (name: string) => {
    const saved = saveDisplayName(name);
    setUserSession((prev) => ({ ...prev, displayName: saved }));
  };

  const isHost = Boolean(activeLobby && activeLobby.host_session_id === userSession.sessionId);
  const isPlaying = Boolean(activeLobby?.is_playing);
  const activeTrack = tracks.find((t) => t.id === activeLobby?.current_track_id) || null;

  // Visualizer loop
  useEffect(() => {
    let animId: number;
    const updateVisualizer = () => {
      if (audioManagerRef.current && isPlaying) {
        setVisualizerData(audioManagerRef.current.getVisualizerData());
      } else {
        setVisualizerData((prev) => prev.map((v) => Math.max(0, v - 8)));
      }
      animId = requestAnimationFrame(updateVisualizer);
    };
    animId = requestAnimationFrame(updateVisualizer);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Handle Hearth crackle background sound
  const toggleHearthSound = () => {
    if (!hearthAudioRef.current && typeof window !== 'undefined') {
      const hearth = new Audio('https://cdn.freesound.org/previews/415/415209_5121236-lq.mp3');
      hearth.loop = true;
      hearth.volume = 0.25;
      hearthAudioRef.current = hearth;
    }

    if (hearthAudioRef.current) {
      if (hearthSoundActive) {
        hearthAudioRef.current.pause();
        setHearthSoundActive(false);
      } else {
        hearthAudioRef.current.play().then(() => setHearthSoundActive(true)).catch(() => {});
      }
    }
  };

  // Sync Audio playback initially when active track or playing state changes
  useEffect(() => {
    if (!activeLobby || !audioManagerRef.current) return;

    const track = tracks.find((t) => t.id === activeLobby.current_track_id);
    const trackUrl = track ? track.audio_url : null;

    if (!trackUrl) {
      audioManagerRef.current.syncPlayback(null, 0, false);
      return;
    }

    const targetPos = computeServerPosition(
      activeLobby.playback_position,
      activeLobby.playback_updated_at,
      activeLobby.is_playing,
      activeLobby.playback_rate,
      track?.duration
    );

    audioManagerRef.current.syncPlayback(
      trackUrl,
      targetPos,
      activeLobby.is_playing,
      activeLobby.playback_rate
    );

    // Keep music channel state in sync
    setChannels((prev) => ({
      ...prev,
      music: {
        ...prev.music,
        trackId: track?.id || null,
        trackTitle: track?.title || 'Waiting for Bard...',
        trackUrl: trackUrl,
        isPlaying: activeLobby.is_playing,
        loop: loopMode !== 'off',
      },
    }));
  }, [activeLobby?.current_track_id, activeLobby?.is_playing, tracks, loopMode]);

  // Realtime Setup when joining a lobby
  const setupRealtime = useCallback((lobby: Lobby) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
    }

    // Broadcast message processor for both Supabase Realtime & cross-tab BroadcastChannel
    const handleBroadcastMessage = (type: string, data: any) => {
      if (type === 'seek') {
        audioManagerRef.current?.seek(data.position);
      } else if (type === 'activity') {
        setActivities((prev) => [data, ...prev.slice(0, 49)]);
      } else if (type === 'hall_closed') {
        alert('The Tavern Keeper has closed this hall.');
        leaveLobby();
      } else if (type === 'host_sync_tick') {
        const isCurrentHost = activeLobbyRef.current?.host_session_id === userSession.sessionId;
        if (!isCurrentHost && data.lobby_id === lobby.id) {
          if (data.loop_mode) {
            setLoopMode(data.loop_mode);
          }

          // 3-Channel Layered Multi-Track Synchronization
          if (data.channels) {
            (['music', 'ambience', 'atmosphere'] as AudioChannelType[]).forEach((chType) => {
              const chData = data.channels[chType];
              if (!chData) return;

              setChannels((prev) => ({
                ...prev,
                [chType]: {
                  ...prev[chType],
                  trackId: chData.trackId,
                  trackTitle: chData.trackTitle,
                  trackUrl: chData.trackUrl,
                  isPlaying: chData.isPlaying,
                  loop: chData.loop ?? (chType !== 'music'),
                },
              }));

              if (chType === 'music' && chData.trackId) {
                setActiveLobby((prev) => (prev ? { ...prev, current_track_id: chData.trackId, is_playing: chData.isPlaying } : null));
              }

              audioManagerRef.current?.syncChannel(
                chType,
                chData.trackUrl,
                chData.position,
                chData.isPlaying,
                chData.loop ?? (chType !== 'music')
              );
            });
          } else {
            // Single channel fallback
            if (data.track_id && activeLobbyRef.current?.current_track_id !== data.track_id) {
              setActiveLobby((prev) => (prev ? { ...prev, current_track_id: data.track_id, is_playing: data.is_playing } : null));
              const targetTrack = tracksRef.current.find((t) => t.id === data.track_id);
              if (targetTrack) {
                audioManagerRef.current?.syncPlayback(targetTrack.audio_url, data.position, data.is_playing);
              }
            } else {
              const currentAudiencePos = audioManagerRef.current?.getCurrentTime() || 0;
              if (Math.abs(currentAudiencePos - data.position) > 1.2) {
                audioManagerRef.current?.seek(data.position);
              }
              if (data.is_playing) {
                audioManagerRef.current?.playAudio();
              } else {
                audioManagerRef.current?.pauseAudio();
              }
            }
          }
        }
      }
    };

    // Local tab broadcast channel for zero-config multi-tab testing
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`bards_tavern_${lobby.id}`);
      broadcastChannelRef.current = bc;
      bc.onmessage = (event) => {
        const { type, data } = event.data || {};
        if (type === 'playback_sync') {
          setActiveLobby((prev) => (prev ? { ...prev, ...data } : null));
        } else if (type === 'tracks_updated') {
          TavernService.getTracks(lobby.id).then(setTracks);
        } else {
          handleBroadcastMessage(type, data);
        }
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      // Local fallback members
      setMembers([
        {
          session_id: userSession.sessionId,
          display_name: userSession.displayName,
          is_host: lobby.host_session_id === userSession.sessionId,
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        },
      ]);
      return;
    }

    const channelName = `tavern_room_${lobby.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userSession.sessionId,
        },
      },
    });

    // 1. Database row changes on lobbies
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'lobbies',
        filter: `id=eq.${lobby.id}`,
      },
      (payload) => {
        const updated = payload.new as Lobby;
        setActiveLobby((prev) => (prev ? { ...prev, ...updated } : null));
      }
    );

    // 2. Database changes on tracks
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tracks',
        filter: `lobby_id=eq.${lobby.id}`,
      },
      () => {
        TavernService.getTracks(lobby.id).then(setTracks);
      }
    );

    // 3. Realtime Presence for Player Roster & Automatic Host Election
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const currentMembers: TavernMember[] = [];

      Object.values(presenceState).forEach((presences) => {
        (presences as unknown as Array<{
          session_id: string;
          display_name: string;
          is_host: boolean;
          joined_at: string;
        }>).forEach((p) => {
          currentMembers.push({
            session_id: p.session_id,
            display_name: p.display_name,
            is_host: p.is_host,
            joined_at: p.joined_at,
            last_seen_at: new Date().toISOString(),
          });
        });
      });

      setMembers(currentMembers);

      // Automatic host migration if the active host disconnected
      setActiveLobby((currentLobby) => {
        if (!currentLobby) return null;
        const hostStillPresent = currentMembers.some(
          (m) => m.session_id === currentLobby.host_session_id
        );

        // If host left and there are players remaining, longest standing player inherits the mantle!
        if (!hostStillPresent && currentMembers.length > 0) {
          const sorted = [...currentMembers].sort((a, b) => (a.joined_at > b.joined_at ? 1 : -1));
          const newHost = sorted[0];
          if (newHost) {
            // Claim host if it is this user
            if (newHost.session_id === userSession.sessionId) {
              TavernService.transferHost({
                lobbyId: currentLobby.id,
                currentHostSessionId: currentLobby.host_session_id,
                newHostSessionId: newHost.session_id,
                newHostName: newHost.display_name,
              }).then(() => {
                setActiveLobby((prev) =>
                  prev
                    ? {
                        ...prev,
                        host_session_id: newHost.session_id,
                        host_name: newHost.display_name,
                      }
                    : null
                );
              });
            }
          }
        }
        return currentLobby;
      });
    });

    // 4. Realtime Broadcast for instant sync / seek / toast / dice rolls / hall close
    channel.on('broadcast', { event: 'tavern_event' }, (payload) => {
      const { type, data } = payload.payload;
      handleBroadcastMessage(type, data);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          session_id: userSession.sessionId,
          display_name: userSession.displayName,
          is_host: lobby.host_session_id === userSession.sessionId,
          joined_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;
  }, [userSession.displayName, userSession.sessionId]);

  // Log activity
  const addActivity = useCallback((activity: Omit<TavernActivity, 'id' | 'timestamp'>) => {
    const full: TavernActivity = {
      ...activity,
      id: crypto.randomUUID ? crypto.randomUUID() : `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [full, ...prev.slice(0, 49)]);

    // Broadcast
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'tavern_event',
        payload: { type: 'activity', data: full },
      });
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'activity', data: full });
    }
  }, []);

  // Join a lobby
  const joinLobby = async (codeOrId: string, password?: string): Promise<boolean> => {
    setIsConnecting(true);
    try {
      const lobby = await TavernService.getLobbyByCode(codeOrId);
      if (!lobby) {
        alert('Tavern lobby not found or has been closed.');
        setIsConnecting(false);
        return false;
      }

      if (lobby.has_password && lobby.password_hash) {
        if (!password) {
          setPendingPasswordLobby(lobby);
          setIsConnecting(false);
          return false;
        }
        const inputHash = await hashPassword(password);
        if (inputHash !== lobby.password_hash) {
          alert('Incorrect tavern passphrase.');
          setIsConnecting(false);
          return false;
        }
      }

      const fetchedTracks = await TavernService.getTracks(lobby.id);
      setTracks(fetchedTracks);
      setActiveLobby(lobby);
      setupRealtime(lobby);

      addActivity({
        type: 'join',
        author: userSession.displayName,
        text: 'entered the tavern and took a seat near the hearth.',
      });

      setIsConnecting(false);
      return true;
    } catch (err) {
      console.error('Join lobby error:', err);
      setIsConnecting(false);
      return false;
    }
  };

  // Leave active lobby - if no one is left, delete/erase the table completely
  const leaveLobby = () => {
    if (activeLobby) {
      if (members.length <= 1) {
        TavernService.deleteLobby(activeLobby.id);
      } else {
        addActivity({
          type: 'leave',
          author: userSession.displayName,
          text: 'stepped out into the night mist.',
        });
      }
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
      broadcastChannelRef.current = null;
    }
    audioManagerRef.current?.syncPlayback(null, 0, false);
    setActiveLobby(null);
    setTracks([]);
    setMembers([]);
  };

  // Create lobby
  const createLobby = async (name: string, description?: string, password?: string): Promise<Lobby> => {
    setIsConnecting(true);
    try {
      const newLobby = await TavernService.createLobby({
        name,
        description,
        password,
        hostSessionId: userSession.sessionId,
        hostName: userSession.displayName,
      });

      const fetchedTracks = await TavernService.getTracks(newLobby.id);
      setTracks(fetchedTracks);
      setActiveLobby(newLobby);
      setupRealtime(newLobby);

      addActivity({
        type: 'join',
        author: userSession.displayName,
        text: `founded the tavern hall "${name}"!`,
      });

      setIsConnecting(false);
      return newLobby;
    } catch (err) {
      console.error('Create lobby error:', err);
      setIsConnecting(false);
      throw err;
    }
  };

  // Refresh lobby
  const refreshLobby = async () => {
    if (!activeLobby) return;
    const refreshed = await TavernService.getLobbyByCode(activeLobby.id);
    if (refreshed) {
      setActiveLobby(refreshed);
      const fetchedTracks = await TavernService.getTracks(refreshed.id);
      setTracks(fetchedTracks);
    }
  };

  // --- Host Playback Controls ---

  const syncPlaybackToAll = async (updates: Partial<PlaybackSyncPayload>) => {
    if (!activeLobby || !isHost) return;

    const payload: PlaybackSyncPayload = {
      lobby_id: activeLobby.id,
      current_track_id: updates.current_track_id !== undefined ? updates.current_track_id : activeLobby.current_track_id,
      is_playing: updates.is_playing !== undefined ? updates.is_playing : activeLobby.is_playing,
      playback_position: updates.playback_position !== undefined ? updates.playback_position : currentTime,
      playback_updated_at: new Date().toISOString(),
      playback_rate: 1.0,
      host_session_id: userSession.sessionId,
    };

    setActiveLobby((prev) => (prev ? { ...prev, ...payload } : null));

    // Broadcast immediately to tabs
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'playback_sync', data: payload });
    }

    await TavernService.updatePlayback(payload);
  };

  const hostPlay = async () => {
    if (!isHost || !activeLobby) return;
    audioManagerRef.current?.initWebAudioContext();

    let targetTrackId = activeLobby.current_track_id;
    if (!targetTrackId && tracks.length > 0) {
      targetTrackId = tracks[0].id;
    }

    await syncPlaybackToAll({
      current_track_id: targetTrackId,
      is_playing: true,
      playback_position: currentTime,
    });

    const track = tracks.find((t) => t.id === targetTrackId);
    addActivity({
      type: 'playback',
      author: userSession.displayName,
      text: `struck a chord and began playing "${track?.title || 'a song'}".`,
    });
  };

  const hostPause = async () => {
    if (!isHost || !activeLobby) return;
    await syncPlaybackToAll({
      is_playing: false,
      playback_position: currentTime,
    });

    addActivity({
      type: 'playback',
      author: userSession.displayName,
      text: 'paused the tavern melodies.',
    });
  };

  const hostSeek = async (position: number) => {
    if (!isHost || !activeLobby) return;
    audioManagerRef.current?.seek(position);
    setCurrentTime(position);

    await syncPlaybackToAll({
      playback_position: position,
    });

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'tavern_event',
        payload: { type: 'seek', data: { position } },
      });
    }
  };

  const hostSelectTrack = async (trackId: string) => {
    if (!isHost || !activeLobby) return;
    audioManagerRef.current?.initWebAudioContext();

    await syncPlaybackToAll({
      current_track_id: trackId,
      is_playing: true,
      playback_position: 0,
    });

    const track = tracks.find((t) => t.id === trackId);
    addActivity({
      type: 'track_change',
      author: userSession.displayName,
      text: `swapped the tavern scroll to "${track?.title || 'Unknown Track'}".`,
    });
  };

  const hostNextTrack = async () => {
    if (!isHost || !activeLobby || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === activeLobby.current_track_id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    await hostSelectTrack(tracks[nextIndex].id);
  };

  const hostPrevTrack = async () => {
    if (!isHost || !activeLobby || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === activeLobby.current_track_id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    await hostSelectTrack(tracks[prevIndex].id);
  };

  // Wire up auto-advance and loop mode when a track finishes playing (Host only)
  useEffect(() => {
    if (!audioManagerRef.current) return;
    audioManagerRef.current.setOnEnded(() => {
      if (isHost && activeLobby && tracks.length > 0) {
        if (loopMode === 'track') {
          hostSeek(0);
          hostPlay();
        } else if (loopMode === 'all') {
          hostNextTrack();
        } else {
          const currentIndex = tracks.findIndex((t) => t.id === activeLobby.current_track_id);
          if (currentIndex < tracks.length - 1) {
            hostNextTrack();
          } else {
            hostPause();
          }
        }
      }
    });
  }, [isHost, activeLobby?.id, activeLobby?.current_track_id, tracks, loopMode]);

  // Host continuous real-time broadcast tick (every 1s) to enforce exact sub-second sync across all listeners
  useEffect(() => {
    if (!isHost || !activeLobby) return;

    const interval = setInterval(() => {
      const currentPos = audioManagerRef.current?.getCurrentTime() || 0;
      const payload = {
        type: 'host_sync_tick',
        data: {
          lobby_id: activeLobby.id,
          track_id: activeLobby.current_track_id,
          position: currentPos,
          is_playing: activeLobby.is_playing,
          loop_mode: loopMode,
          channels: {
            music: {
              trackId: channelsRef.current.music.trackId,
              trackTitle: channelsRef.current.music.trackTitle,
              trackUrl: channelsRef.current.music.trackUrl,
              position: audioManagerRef.current?.getChannelTime('music') || currentPos,
              isPlaying: channelsRef.current.music.isPlaying,
              loop: channelsRef.current.music.loop,
            },
            ambience: {
              trackId: channelsRef.current.ambience.trackId,
              trackTitle: channelsRef.current.ambience.trackTitle,
              trackUrl: channelsRef.current.ambience.trackUrl,
              position: audioManagerRef.current?.getChannelTime('ambience') || 0,
              isPlaying: channelsRef.current.ambience.isPlaying,
              loop: channelsRef.current.ambience.loop,
            },
            atmosphere: {
              trackId: channelsRef.current.atmosphere.trackId,
              trackTitle: channelsRef.current.atmosphere.trackTitle,
              trackUrl: channelsRef.current.atmosphere.trackUrl,
              position: audioManagerRef.current?.getChannelTime('atmosphere') || 0,
              isPlaying: channelsRef.current.atmosphere.isPlaying,
              loop: channelsRef.current.atmosphere.loop,
            },
          },
        },
      };

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'tavern_event',
          payload,
        });
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage(payload);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, activeLobby?.id, activeLobby?.current_track_id, activeLobby?.is_playing, loopMode]);

  // Cleanup abandoned / empty table when user closes browser
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeLobby && members.length <= 1) {
        TavernService.deleteLobby(activeLobby.id);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeLobby?.id, members.length]);

  const hostUploadTrack = async (file: File, title: string, artist?: string): Promise<Track> => {
    if (!isHost || !activeLobby) {
      throw new Error('Host only');
    }

    const newTrack = await TavernService.uploadTrack({
      lobbyId: activeLobby.id,
      file,
      title,
      artist,
      hostSessionId: userSession.sessionId,
      addedBy: userSession.displayName,
    });

    const updatedTracks = await TavernService.getTracks(activeLobby.id);
    setTracks(updatedTracks);

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'tracks_updated' });
    }

    addActivity({
      type: 'track_change',
      author: userSession.displayName,
      text: `added a new score: "${newTrack.title}" (${newTrack.artist}) to the tavern repertoire!`,
    });

    return newTrack;
  };

  const hostDeleteTrack = async (trackId: string) => {
    if (!isHost || !activeLobby) return;
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;

    await TavernService.deleteTrack(
      activeLobby.id,
      trackId,
      track.storage_path,
      userSession.sessionId
    );

    const updated = tracks.filter((t) => t.id !== trackId);
    setTracks(updated);

    if (activeLobby.current_track_id === trackId) {
      if (updated.length > 0) {
        await hostSelectTrack(updated[0].id);
      } else {
        await syncPlaybackToAll({
          current_track_id: null,
          is_playing: false,
          playback_position: 0,
        });
      }
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'tracks_updated' });
    }
  };

  const hostTransfer = async (newHostSessionId: string, newHostName: string) => {
    if (!isHost || !activeLobby) return;
    const ok = await TavernService.transferHost({
      lobbyId: activeLobby.id,
      currentHostSessionId: userSession.sessionId,
      newHostSessionId,
      newHostName,
    });

    if (ok) {
      setActiveLobby((prev) =>
        prev
          ? {
              ...prev,
              host_session_id: newHostSessionId,
              host_name: newHostName,
            }
          : null
      );

      addActivity({
        type: 'host_transfer',
        author: userSession.displayName,
        text: `passed the Tavern Keeper mantle to ${newHostName}!`,
      });
    }
  };

  const hostRenameLobby = async (newName: string) => {
    if (!isHost || !activeLobby) return;
    const ok = await TavernService.renameLobby(activeLobby.id, newName, userSession.sessionId);
    if (ok) {
      setActiveLobby((prev) => (prev ? { ...prev, name: newName } : null));
    }
  };

  const hostCloseLobby = async () => {
    if (!isHost || !activeLobby) return;
    const lobbyId = activeLobby.id;
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'tavern_event',
        payload: { type: 'hall_closed', data: { lobby_id: lobbyId } },
      });
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'hall_closed', data: { lobby_id: lobbyId } });
    }
    await TavernService.deleteLobby(lobbyId);
    leaveLobby();
  };

  // Local Volume & Autoplay Controls
  const setVolume = (val: number) => {
    audioManagerRef.current?.setVolume(val);
    setVolumeState(val);
  };

  const toggleMute = () => {
    if (audioManagerRef.current) {
      const muted = audioManagerRef.current.toggleMute();
      setIsMutedState(muted);
    }
  };

  const unlockAutoplay = () => {
    if (audioManagerRef.current) {
      audioManagerRef.current.initWebAudioContext();
      audioManagerRef.current.playAudio().then(() => {
        setIsAutoplayBlocked(false);
      });
    }
  };

  // 3-Channel Layered Multi-Track Controls (Music, Ambience, Atmosphere)
  const setChannelTrack = useCallback(
    (type: AudioChannelType, track: { id: string | null; title: string; url: string | null }) => {
      setChannels((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          trackId: track.id,
          trackTitle: track.title,
          trackUrl: track.url,
          currentTime: 0,
        },
      }));

      if (type === 'music' && track.id) {
        hostSelectTrack(track.id);
      } else {
        const isPlaying = channelsRef.current[type].isPlaying;
        audioManagerRef.current?.syncChannel(
          type,
          track.url,
          0,
          isPlaying,
          type !== 'music'
        );

        if (isHost && activeLobby) {
          const tickPayload = {
            type: 'host_sync_tick',
            data: {
              lobby_id: activeLobby.id,
              track_id: activeLobby.current_track_id,
              position: audioManagerRef.current?.getCurrentTime() || 0,
              is_playing: activeLobby.is_playing || false,
              loop_mode: loopMode,
              channels: {
                music: {
                  trackId: channelsRef.current.music.trackId,
                  trackTitle: channelsRef.current.music.trackTitle,
                  trackUrl: channelsRef.current.music.trackUrl,
                  position: audioManagerRef.current?.getChannelTime('music') || 0,
                  isPlaying: channelsRef.current.music.isPlaying,
                  loop: channelsRef.current.music.loop,
                },
                ambience: {
                  trackId: type === 'ambience' ? track.id : channelsRef.current.ambience.trackId,
                  trackTitle: type === 'ambience' ? track.title : channelsRef.current.ambience.trackTitle,
                  trackUrl: type === 'ambience' ? track.url : channelsRef.current.ambience.trackUrl,
                  position: 0,
                  isPlaying: channelsRef.current.ambience.isPlaying,
                  loop: channelsRef.current.ambience.loop,
                },
                atmosphere: {
                  trackId: type === 'atmosphere' ? track.id : channelsRef.current.atmosphere.trackId,
                  trackTitle: type === 'atmosphere' ? track.title : channelsRef.current.atmosphere.trackTitle,
                  trackUrl: type === 'atmosphere' ? track.url : channelsRef.current.atmosphere.trackUrl,
                  position: 0,
                  isPlaying: channelsRef.current.atmosphere.isPlaying,
                  loop: channelsRef.current.atmosphere.loop,
                },
              },
            },
          };
          channelRef.current?.send({
            type: 'broadcast',
            event: 'tavern_event',
            payload: tickPayload,
          });
          broadcastChannelRef.current?.postMessage(tickPayload);
        }
      }
    },
    [isHost, activeLobby, loopMode, hostSelectTrack]
  );

  const toggleChannelPlay = useCallback(
    (type: AudioChannelType) => {
      audioManagerRef.current?.initWebAudioContext();
      const currentCh = channelsRef.current[type];
      const nextPlaying = !currentCh.isPlaying;

      setChannels((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          isPlaying: nextPlaying,
        },
      }));

      if (type === 'music') {
        if (nextPlaying) {
          hostPlay();
        } else {
          hostPause();
        }
      } else {
        if (nextPlaying) {
          audioManagerRef.current?.playChannel(type);
        } else {
          audioManagerRef.current?.pauseChannel(type);
        }

        if (isHost && activeLobby) {
          const tickPayload = {
            type: 'host_sync_tick',
            data: {
              lobby_id: activeLobby.id,
              track_id: activeLobby.current_track_id,
              position: audioManagerRef.current?.getCurrentTime() || 0,
              is_playing: activeLobby.is_playing,
              loop_mode: loopMode,
              channels: {
                music: {
                  trackId: channelsRef.current.music.trackId,
                  trackTitle: channelsRef.current.music.trackTitle,
                  trackUrl: channelsRef.current.music.trackUrl,
                  position: audioManagerRef.current?.getChannelTime('music') || 0,
                  isPlaying: channelsRef.current.music.isPlaying,
                  loop: channelsRef.current.music.loop,
                },
                ambience: {
                  trackId: channelsRef.current.ambience.trackId,
                  trackTitle: channelsRef.current.ambience.trackTitle,
                  trackUrl: channelsRef.current.ambience.trackUrl,
                  position: audioManagerRef.current?.getChannelTime('ambience') || 0,
                  isPlaying: type === 'ambience' ? nextPlaying : channelsRef.current.ambience.isPlaying,
                  loop: channelsRef.current.ambience.loop,
                },
                atmosphere: {
                  trackId: channelsRef.current.atmosphere.trackId,
                  trackTitle: channelsRef.current.atmosphere.trackTitle,
                  trackUrl: channelsRef.current.atmosphere.trackUrl,
                  position: audioManagerRef.current?.getChannelTime('atmosphere') || 0,
                  isPlaying: type === 'atmosphere' ? nextPlaying : channelsRef.current.atmosphere.isPlaying,
                  loop: channelsRef.current.atmosphere.loop,
                },
              },
            },
          };
          channelRef.current?.send({
            type: 'broadcast',
            event: 'tavern_event',
            payload: tickPayload,
          });
          broadcastChannelRef.current?.postMessage(tickPayload);
        }
      }
    },
    [isHost, activeLobby, loopMode, hostPlay, hostPause]
  );

  const seekChannel = useCallback(
    (type: AudioChannelType, position: number) => {
      if (type === 'music') {
        hostSeek(position);
      } else {
        audioManagerRef.current?.seekChannel(type, position);
        setChannels((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            currentTime: position,
          },
        }));
      }
    },
    [hostSeek]
  );

  const setChannelVolume = useCallback((type: AudioChannelType, val: number) => {
    audioManagerRef.current?.setChannelVolume(type, val);
    setChannels((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        volume: val,
      },
    }));
  }, []);

  const toggleChannelMute = useCallback((type: AudioChannelType) => {
    if (audioManagerRef.current) {
      const muted = audioManagerRef.current.toggleChannelMute(type);
      setChannels((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          isMuted: muted,
        },
      }));
    }
  }, []);

  // Interactive Daggerheart Duality Dice Roller (Hope & Fear d12)
  const rollDualityDice = () => {
    const hope = Math.floor(Math.random() * 12) + 1;
    const fear = Math.floor(Math.random() * 12) + 1;
    const outcome =
      hope === fear
        ? 'CRITICAL SUCCESS with Hope & Fear in balance!'
        : hope > fear
        ? `SUCCESS with HOPE (Hope ${hope} vs Fear ${fear})`
        : `ROLL with FEAR (Hope ${hope} vs Fear ${fear})`;

    addActivity({
      type: 'dice_roll',
      author: userSession.displayName,
      text: `rolled the Daggerheart Duality Dice: ${outcome}`,
      metadata: { hope, fear },
    });
  };

  const sendTavernToast = (msg: string) => {
    if (!msg.trim()) return;
    addActivity({
      type: 'chat',
      author: userSession.displayName,
      text: msg,
    });
  };

  return (
    <TavernContext.Provider
      value={{
        userSession,
        updateDisplayName,
        activeLobby,
        tracks,
        activeTrack,
        isHost,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        setVolume,
        toggleMute,
        isAutoplayBlocked,
        unlockAutoplay,
        members,
        activities,
        visualizerData,
        loopMode,
        toggleLoopMode,
        channels,
        setChannelTrack,
        toggleChannelPlay,
        seekChannel,
        setChannelVolume,
        toggleChannelMute,
        isConnecting,
        pendingPasswordLobby,
        setPendingPasswordLobby,
        hearthSoundActive,
        toggleHearthSound,
        joinLobby,
        leaveLobby,
        createLobby,
        hostPlay,
        hostPause,
        hostSeek,
        hostSelectTrack,
        hostNextTrack,
        hostPrevTrack,
        hostUploadTrack,
        hostDeleteTrack,
        hostTransfer,
        hostRenameLobby,
        hostCloseLobby,
        rollDualityDice,
        sendTavernToast,
        refreshLobby,
      }}
    >
      {children}
    </TavernContext.Provider>
  );
};

export const useTavern = () => {
  const context = useContext(TavernContext);
  if (!context) {
    throw new Error('useTavern must be used within a TavernProvider');
  }
  return context;
};
