import { Redirect } from 'expo-router';
import { useUserStore } from '@store/useUserStore';

/**
 * There is no home screen — the app is the four sport hubs.
 * Entering the tab group always lands on the user's primary sport.
 */
export default function TabsIndex() {
  const user = useUserStore((s) => s.user);
  const primary = user?.primarySport ?? 'nfl';
  return <Redirect href={`/(tabs)/${primary}`} />;
}
