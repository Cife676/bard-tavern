# 🍻 Bard's Tavern — Real-Time Multiplayer Music for Daggerheart

> **"Gather round the hearth, adventurer, and listen to the bard's lute in perfect harmony."**

**Bard's Tavern** is a complete, publicly accessible, real-time multiplayer music listening web application built specifically for **Daggerheart** and tabletop RPG campaigns.

It allows Dungeon Masters, GMs, and players to establish atmospheric tavern halls, upload and manage shared musical scrolls (MP3/WAV), and listen to synchronized soundtrack playlists in real-time across any distance with zero registration.

---

## ⚔️ Key Features

1. **Zero Registration Adventurer Monikers**
   - Jump straight in with a fantasy moniker (e.g. *Lyra the Moon-Harper*, *Corvo Quillweaver*).
   - Saved locally to your browser (`localStorage`).
   - One-click random fantasy name generator tailored to the Daggerheart universe.
2. **Real-Time Active Tavern Halls (Lobbies)**
   - Browse active tavern tables with live player count, host badge, currently playing track, and atmospheric notes.
   - Anyone can create, join, and leave tables with friendly codes (e.g. `TAV-8421`).
   - Direct shareable links (`/?lobby=TAV-8421`) for tabletop party members.
   - Optional password protection (guarded by passphrase) with client-side hashing.
3. **Host-Controlled Synchronized Playback**
   - Host uploads MP3/WAV/OGG audio directly to Supabase Storage.
   - Host commands Play, Pause, Track Selection, and Seekbar Scrubbing.
   - **Server-Timestamp Synchronization**: New players sync immediately to the exact second of playback.
   - Dynamic drift correction algorithm guarantees jitter-free, click-free audio without skips.
   - Local-only volume control and individual mute per listener.
4. **Host Authority & Automatic Succession**
   - Host session protection prevents guest impersonation.
   - Manual host transfer to any player at the table.
   - Automatic host succession if the host leaves or disconnects unexpectedly.
5. **Daggerheart Atmosphere & Interactive Table**
   - Dark medieval tavern aesthetics: deep burgundy, roasted charcoal, burnished gold, and parchment styling.
   - Google Fonts: *Cinzel*, *MedievalSharp*, and *Cinzel Decorative*.
   - Live Candlelight Waveform visualizer powered by the Web Audio API.
   - Built-in cozy hearthfire ambient crackle toggle.
   - **Interactive Duality Dice Roller**: Roll Hope & Fear d12s with live table feedback.
   - Live Tavern Chronicles & Toast chat feed.

---

## 🏛️ Architecture & Synchronization Engine

```
       [Host Browser]
             │
             │ (Upload Audio)  ──►  Supabase Storage ('bard-tracks')
             │
             │ (Play / Pause / Seek)
             ▼
      [Supabase Database]
        └─ lobbies (playback_position, playback_updated_at, is_playing)
             │
             ├──► Supabase Realtime (postgres_changes + Broadcast + Presence)
             │
     ┌───────┴───────┐
     ▼               ▼
[Player A]      [Player B]
(Calculates server position & aligns HTML5 Audio with drift threshold)
```

### Server-Timestamp Sync Formula
```ts
computed_position = is_playing 
  ? playback_position + ((now() - playback_updated_at) * playback_rate) 
  : playback_position;
```
If `Math.abs(audio.currentTime - computed_position) > 1.2s`, the player snaps smoothly to the target position, ensuring tight group synchronization during climactic battle encounters!

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ (tested on Node 22)
- A free account at [Supabase](https://supabase.com) (or use local hearth mode for offline testing)

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your Supabase API credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Apply the Database Migration to Supabase
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Click **New Query**.
3. Open `supabase/schema.sql` from this repository, paste its contents into the editor, and click **Run**.
4. This script automatically:
   - Creates the `lobbies` and `tracks` tables.
   - Sets up Row Level Security (RLS) policies.
   - Enables the `supabase_realtime` publication.
   - Creates and configures the public `bard-tracks` storage bucket with audio upload permissions.
   - Creates the `cleanup_stale_lobbies()` function.

### 4. Run the Application
```bash
# Run in development mode
npm run dev

# Or build and run in production mode
npm run build
npm start
```
Visit `http://localhost:3000` in your browser.

---

## 🌐 Public Deployment (Vercel / Netlify / Render)

### Deploying to Vercel (Recommended)
1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **Add New Project** -> Import your repository.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://your-project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `your-anon-key`
4. Click **Deploy**. Your Bard's Tavern will be live and publicly shareable across the globe!

---

## 📜 Tabletop Features for Daggerheart GMs
- **Shareable Links**: Click the code badge (`TAV-XXXX`) in any room to copy a direct invite link with `?lobby=TAV-XXXX`.
- **Duality Dice**: Click "Roll Hope & Fear" to roll the signature Daggerheart d12s with Hope (gold) and Fear (crimson) resolution!
- **Hearth Ambience**: Toggle the warm fireplace sound at any time for extra tabletop roleplaying immersion.
- **GM Soundboard Integration**: Easily switch between the multiplayer Bard's Tavern and the local GM Soundboard/Discord voice console via the top banner.
