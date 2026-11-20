import { UserSession } from '@/types/tavern';

const SESSION_KEY = 'bards_tavern_session_id';
const USERNAME_KEY = 'bards_tavern_username';

const FANTASY_FIRST_NAMES = [
  'Rowan', 'Lyra', 'Bramble', 'Finnigan', 'Theron', 'Vesper', 'Corvo', 'Aurelia',
  'Gideon', 'Mira', 'Balthazar', 'Seraphina', 'Elowen', 'Kaelen', 'Orion', 'Caelum',
  'Zephyr', 'Isolde', 'Fennic', 'Dorian', 'Morrigan', 'Talon', 'Briar', 'Ignis'
];

const FANTASY_TITLES = [
  'the Hearth-Harper', 'of the Whispering Pines', 'the Ale-Blessed', 'the Shadow-Strider',
  'Dawnseeker', 'Stoutale', 'the Wandering Skald', 'of the Velvet Strings',
  'the Dagger-Dancer', 'Moon-Chaser', 'the Lore-Keeper', 'of Sable Peak',
  'the Silver-Tongued', 'Hearthkeeper', 'of the Golden Lyre', 'Brambleborn'
];

export function generateFantasyName(): string {
  const first = FANTASY_FIRST_NAMES[Math.floor(Math.random() * FANTASY_FIRST_NAMES.length)];
  const title = FANTASY_TITLES[Math.floor(Math.random() * FANTASY_TITLES.length)];
  return `${first} ${title}`;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getUserSession(): UserSession {
  if (typeof window === 'undefined') {
    return {
      sessionId: 'server-session',
      displayName: 'Wandering Bard',
    };
  }

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  let displayName = localStorage.getItem(USERNAME_KEY);
  if (!displayName || displayName.trim().length === 0) {
    displayName = generateFantasyName();
    localStorage.setItem(USERNAME_KEY, displayName);
  }

  return { sessionId, displayName };
}

export function setDisplayName(name: string): string {
  if (typeof window === 'undefined') return name;
  const clean = name.trim() || generateFantasyName();
  localStorage.setItem(USERNAME_KEY, clean);
  return clean;
}
