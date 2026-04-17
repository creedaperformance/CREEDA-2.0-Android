import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_VERSION = 'v1';

function getFitStartDraftKey(userId: string) {
  return `creeda_mobile_fitstart_${STORAGE_VERSION}_${userId}`;
}

export async function loadFitStartDraft<T>(userId: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(getFitStartDraftKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveFitStartDraft<T>(userId: string, draft: T) {
  await AsyncStorage.setItem(getFitStartDraftKey(userId), JSON.stringify(draft));
}

export async function clearFitStartDraft(userId: string) {
  await AsyncStorage.removeItem(getFitStartDraftKey(userId));
}
