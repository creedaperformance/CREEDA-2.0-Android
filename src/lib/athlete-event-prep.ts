import AsyncStorage from '@react-native-async-storage/async-storage'

const ATHLETE_EVENT_PREP_KEY = 'creeda_event_prep'

export interface AthleteEventPrepState {
  eventId: string
  eventName: string
  focus: string
  date: string
}

export async function saveAthleteEventPrep(state: AthleteEventPrepState) {
  await AsyncStorage.setItem(ATHLETE_EVENT_PREP_KEY, JSON.stringify(state))
}

export async function loadAthleteEventPrep() {
  const raw = await AsyncStorage.getItem(ATHLETE_EVENT_PREP_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<AthleteEventPrepState>
    if (
      typeof parsed.eventId !== 'string' ||
      typeof parsed.eventName !== 'string' ||
      typeof parsed.focus !== 'string' ||
      typeof parsed.date !== 'string'
    ) {
      return null
    }

    return parsed as AthleteEventPrepState
  } catch {
    return null
  }
}

export async function clearAthleteEventPrep() {
  await AsyncStorage.removeItem(ATHLETE_EVENT_PREP_KEY)
}
