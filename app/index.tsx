import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useUserStore } from '@store/useUserStore';
import { colors } from '@constants/colors';

export default function Index() {
  const { user, isLoading } = useUserStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (!user.onboardingComplete) return <Redirect href="/(onboarding)/sport" />;
  return <Redirect href="/(tabs)" />;
}
