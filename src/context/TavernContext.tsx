'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Lobby, Track, TavernMember, TavernActivity, UserSession, PlaybackSyncPayload } from '@/types/tavern';
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingPasswordLobby, setPendingPasswordLobby] = useState<Lobby | null>(null);
  const [hearthSoundActive, setHearthSoundActive] = useState(false);

  // Audio Manager Singleton
  const audioManagerRef = useRef<TavernAudioManager | null>(null);
  // Realtime Channel
  const channelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const hearthAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize User Session and Audio Manager
  useEffect(() => {
    const session = getUserSession();
    setUserSession(session);

    const manager = new TavernAudioManager();
    audioManagerRef.current = manager;

    setVolumeState(manager.getVolume());
    setIsMutedState(manager.getIsMuted());

    manager.setOnTimeUpdate((time, dur) => {
      setCurrentTime(time);
      if (dur > 0) setDuration(dur);
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

  // Sync Audio playback whenever activeLobby state changes
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
      activeLobby.playback_rate
    );

    audioManagerRef.current.syncPlayback(
      trackUrl,
      targetPos,
      activeLobby.is_playing,
      activeLobby.playback_rate
    );
  }, [activeLobby?.current_track_id, activeLobby?.is_playing, activeLobby?.playback_updated_at, tracks]);

  // Periodic drift check (every 1s) to ensure tight multi-user sync
  useEffect(() => {
    if (!activeLobby || !activeLobby.is_playing || !audioManagerRef.current) return;

    const interval = setInterval(() => {
      const track = tracks.find((t) => t.id === activeLobby.current_track_id);
      if (!track) return;

      const targetPos = computeServerPosition(
        activeLobby.playback_position,
        activeLobby.playback_updated_at,
        activeLobby.is_playing,
        activeLobby.playback_rate
      );

      audioManagerRef.current?.syncPlayback(
        track.audio_url,
        targetPos,
        activeLobby.is_playing,
        activeLobby.playback_rate
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLobby, tracks]);

  // Realtime Setup when joining a lobby
  const setupRealtime = useCallback((lobby: Lobby) => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
    }

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
        } else if (type === 'activity') {
          setActivities((prev) => [data, ...prev.slice(0, 49)]);
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

    // 4. Realtime Broadcast for instant seek/toast/dice rolls
    channel.on('broadcast', { event: 'tavern_event' }, (payload) => {
      const { type, data } = payload.payload;
      if (type === 'seek') {
        audioManagerRef.current?.seek(data.position);
      } else if (type === 'activity') {
        setActivities((prev) => [data, ...prev.slice(0, 49)]);
      }
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

  // Leave active lobby
  const leaveLobby = () => {
    if (activeLobby) {
      addActivity({
        type: 'leave',
        author: userSession.displayName,
        text: 'stepped out into the night mist.',
      });
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

  // Wire up auto-advance when a track finishes playing (Host only)
  useEffect(() => {
    if (!audioManagerRef.current) return;
    audioManagerRef.current.setOnEnded(() => {
      if (isHost && activeLobby && tracks.length > 0) {
        hostNextTrack();
      }
    });
  }, [isHost, activeLobby, tracks]);

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
    await TavernService.closeLobby(activeLobby.id, userSession.sessionId);
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
