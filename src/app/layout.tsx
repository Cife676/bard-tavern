import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Bard's Tavern | Daggerheart Real-Time Campaign Music",
  description:
    "A real-time multiplayer music listening website for Daggerheart tabletop RPG campaigns. Synchronized audio, shared playlists, candlelit tavern ambience, and zero-registration entry.",
  keywords: [
    'Daggerheart',
    'TTRPG',
    'Tabletop RPG',
    'Bard',
    'Music Tavern',
    'Real-time Audio',
    'Supabase Realtime',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0e070a] text-[#e4e7eb] min-h-screen antialiased selection:bg-[#801b31] selection:text-[#fae5b5]">
        {children}
      </body>
    </html>
  );
}
