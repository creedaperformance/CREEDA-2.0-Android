import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_VERSION = 'v1';

function getAthleteOnboardingDraftKey(userId: string) {
  return `creeda_mobile_athlete_onboarding_${STORAGE_VERSION}_${userId}`;
}

export async function loadAthleteOnboardingDraft<T>(userId: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(getAthleteOnboardingDraftKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveAthleteOnboardingDraft<T>(userId: string, draft: T) {
  await AsyncStorage.setItem(getAthleteOnboardingDraftKey(userId), JSON.stringify(draft));
}

export async function clearAthleteOnboardingDraft(userId: string) {
  await AsyncStorage.removeItem(getAthleteOnboardingDraftKey(userId));
}
