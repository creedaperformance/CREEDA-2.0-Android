import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { useMobileAuth } from '../src/lib/auth';
import { getPreferredMobileRoute } from '../src/lib/navigation';

export default function Index() {
  const { loading, session, user } = useMobileAuth();
  const params = useLocalSearchParams<{ coach?: string | string[]; invite?: string | string[] }>();
  const coachLockerCode = typeof params.coach === 'string' ? params.coach : undefined;
  const inviteToken = typeof params.invite === 'string' ? params.invite : undefined;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading your CREEDA mobile session...
        </Text>
      </View>
    );
  }

  if (session && !user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading your CREEDA profile...
        </Text>
      </View>
    );
  }

  return (
    <Redirect
      href={
        session
          ? getPreferredMobileRoute(user, { coachLockerCode, inviteToken })
          : coachLockerCode || inviteToken
            ? {
                pathname: '/login',
                params: {
                  ...(coachLockerCode ? { coach: coachLockerCode } : {}),
                  ...(inviteToken ? { invite: inviteToken } : {}),
                },
              }
            : '/login'
      }
    />
  );
}
