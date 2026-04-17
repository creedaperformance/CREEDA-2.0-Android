import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MobileAuthProvider } from '../src/lib/auth';
import '../global.css'; // NativeWind CSS

export default function RootLayout() {
  return (
    <MobileAuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#04070A' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-event/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-events" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-review" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-report" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-scan-analyze" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-scan" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-scan-report/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-tests" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-plans" options={{ headerShown: false }} />
        <Stack.Screen name="athlete-plan-generate" options={{ headerShown: false }} />
        <Stack.Screen name="check-in" options={{ headerShown: false }} />
        <Stack.Screen name="coach-academy" options={{ headerShown: false }} />
        <Stack.Screen name="coach-analytics" options={{ headerShown: false }} />
        <Stack.Screen name="coach-onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="coach-report/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="coach-review" options={{ headerShown: false }} />
        <Stack.Screen name="coach-reports" options={{ headerShown: false }} />
        <Stack.Screen name="individual-log" options={{ headerShown: false }} />
        <Stack.Screen name="individual-review" options={{ headerShown: false }} />
        <Stack.Screen name="individual-scan-analyze" options={{ headerShown: false }} />
        <Stack.Screen name="individual-scan" options={{ headerShown: false }} />
        <Stack.Screen name="individual-scan-report/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="individual-tests" options={{ headerShown: false }} />
        <Stack.Screen name="fitstart" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </MobileAuthProvider>
  );
}
