export interface SoundscapePreset {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  icon: string;
  channel: 'ambience' | 'atmosphere';
}

export const AMBIENCE_PRESETS: SoundscapePreset[] = [
  {
    id: 'amb_rain',
    title: 'Drenching Mountain Rain',
    artist: 'Weather Soundscape',
    audio_url: 'https://cdn.freesound.org/previews/536/536108_5674468-lq.mp3',
    icon: '🌧️',
    channel: 'ambience',
  },
  {
    id: 'amb_tavern',
    title: 'Bustling Tavern Murmur',
    artist: 'Tavern Crowd',
    audio_url: 'https://cdn.freesound.org/previews/612/612087_5674468-lq.mp3',
    icon: '🍻',
    channel: 'ambience',
  },
  {
    id: 'amb_forest',
    title: 'Whispering Wilds Wind',
    artist: 'Ancient Forest',
    audio_url: 'https://cdn.freesound.org/previews/612/612095_5674468-lq.mp3',
    icon: '🌲',
    channel: 'ambience',
  },
  {
    id: 'amb_dungeon',
    title: 'Dungeon Drips & Eerie Hollow',
    artist: 'Catacombs',
    audio_url: 'https://cdn.freesound.org/previews/415/415209_5121236-lq.mp3',
    icon: '🏰',
    channel: 'ambience',
  },
];

export const ATMOSPHERE_PRESETS: SoundscapePreset[] = [
  {
    id: 'atm_hearth',
    title: 'Crackling Hearthfire',
    artist: 'Warm Embers',
    audio_url: 'https://cdn.freesound.org/previews/415/415209_5121236-lq.mp3',
    icon: '🔥',
    channel: 'atmosphere',
  },
  {
    id: 'atm_river',
    title: 'Riverbank Night Crickets',
    artist: 'Wild River',
    audio_url: 'https://cdn.freesound.org/previews/536/536108_5674468-lq.mp3',
    icon: '🌊',
    channel: 'atmosphere',
  },
  {
    id: 'atm_torch',
    title: 'Sizzling Torches & Draft',
    artist: 'Sentry Keep',
    audio_url: 'https://cdn.freesound.org/previews/612/612087_5674468-lq.mp3',
    icon: '🕯️',
    channel: 'atmosphere',
  },
];
