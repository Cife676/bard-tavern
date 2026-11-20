import { TavernDashboard } from '@/components/tavern/TavernDashboard';

export const metadata = {
  title: "Bard's Tavern | Daggerheart Real-Time Campaign Audio",
  description: "Real-time multiplayer music listening tavern for your Daggerheart tabletop RPG campaign.",
};

export default function TavernPage() {
  return <TavernDashboard showGMCockpitToggle={false} />;
}
