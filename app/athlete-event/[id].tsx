import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import {
  ArrowLeft,
  Calendar,
  Clock3,
  MapPin,
  ShieldAlert,
  Target,
  Ticket,
  Zap,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../../src/components/neon/GlowingButtonNative'
import { ReviewEmptyState, ReviewSurfaceCard } from '../../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../../src/lib/auth'
import { saveAthleteEventPrep } from '../../src/lib/athlete-event-prep'
import {
  fetchAthleteEventDetail,
  type AthleteEventDetail,
} from '../../src/lib/mobile-api'

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function AthleteEventDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const eventId = normalizeParam(params.id)
  const { session, user } = useMobileAuth()
  const [event, setEvent] = useState<AthleteEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingPrep, setSavingPrep] = useState(false)
  const [prepMessage, setPrepMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadEvent() {
    if (!session?.access_token || !eventId) {
      setLoading(false)
      if (!eventId) setError('Missing athlete event id.')
      return
    }

    try {
      setLoading(true)
      const response = await fetchAthleteEventDetail(session.access_token, eventId)
      setEvent(response.event)
      setError(null)
    } catch (eventError) {
      setError(
        eventError instanceof Error
          ? eventError.message
          : 'Failed to load athlete event detail.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvent()
  }, [eventId, session?.access_token])

  async function handleStartPrep() {
    if (!event) return

    try {
      setSavingPrep(true)
      await saveAthleteEventPrep({
        eventId: event.id,
        eventName: event.eventName,
        focus: event.prepPlan.focus,
        date: event.eventDate,
      })
      setPrepMessage(`Training metrics recalibrated for ${event.eventName}.`)
      setTimeout(() => {
        router.replace('/(tabs)')
      }, 900)
    } catch (prepError) {
      setPrepMessage(
        prepError instanceof Error
          ? prepError.message
          : 'Could not save event prep state.'
      )
    } finally {
      setSavingPrep(false)
    }
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'athlete') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Athlete event detail is athlete-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your current mobile role is {user.profile.role}, so this event route is not available on
          this account.
        </Text>
      </View>
    )
  }

  if (loading && !event && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading athlete event detail...
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120, paddingTop: 64 }}>
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        {error ? <ReviewEmptyState title="Event unavailable" body={error} /> : null}

        {!event ? (
          <ReviewEmptyState
            title="No athlete event found"
            body="This event no longer exists or your mobile account cannot access it."
          />
        ) : null}

        {event ? (
          <>
            <ReviewSurfaceCard watermark="EVT">
              <View className="flex-row flex-wrap gap-2">
                <View className="rounded-full bg-[#00E5FF]/15 px-3 py-2">
                  <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-chakra-neon">
                    {event.eventType}
                  </Text>
                </View>
                <View className="rounded-full bg-white/[0.05] px-3 py-2">
                  <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
                    {event.skillLevel}
                  </Text>
                </View>
              </View>

              <Text className="mt-5 text-4xl font-black tracking-tight text-white">
                {event.eventName}
              </Text>

              <View className="mt-4 flex-row flex-wrap gap-3">
                <View className="flex-row items-center gap-2">
                  <MapPin color="#94A3B8" size={10} />
                  <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                    {event.location}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Calendar color="#94A3B8" size={10} />
                  <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                    {formatEventDate(event.eventDate)}
                  </Text>
                </View>
              </View>

              <Text className="mt-5 text-sm leading-6 text-white/60">
                {event.description ||
                  'Join athletes from around the region for this upcoming competitive event.'}
              </Text>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Target color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Prepare For This Event
                </Text>
              </View>

              <View className="mt-5 rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                <View className="flex-row items-center gap-3">
                  <View className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
                    <Clock3 color="#6EE7B7" size={20} />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">
                      Timeline Countdown
                    </Text>
                    <Text className="mt-1 text-2xl font-black tracking-tight text-white">
                      {event.weeksLeft} weeks open
                    </Text>
                  </View>
                </View>

                <View className="mt-6 gap-4">
                  <View>
                    <View className="flex-row items-center gap-2">
                      <Zap color="#6EE7B7" size={10} />
                      <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">
                        Suggested Focus
                      </Text>
                    </View>
                    <Text className="mt-2 text-lg font-black tracking-tight text-white">
                      {event.prepPlan.focus}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-white/70">
                      {event.prepPlan.description}
                    </Text>
                  </View>

                  <View className="rounded-[22px] border border-white/5 bg-black/20 p-4">
                    <View className="flex-row items-center gap-2">
                      <ShieldAlert color="#FFB68F" size={10} />
                      <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFD2BF]">
                        Primary Injury Risk
                      </Text>
                    </View>
                    <Text className="mt-2 text-sm font-semibold leading-6 text-white/80">
                      {event.prepPlan.risk}
                    </Text>
                  </View>
                </View>
              </View>
            </ReviewSurfaceCard>

            {prepMessage ? (
              <ReviewSurfaceCard>
                <Text className="text-sm leading-6 text-chakra-neon">{prepMessage}</Text>
              </ReviewSurfaceCard>
            ) : null}

            <ReviewSurfaceCard>
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Action Loop
              </Text>
              <Text className="mt-4 text-sm leading-6 text-white/60">
                Start prep to pin this event focus into your athlete mobile flow, or open the
                official registration link directly from CREEDA.
              </Text>

              <View className="mt-6 gap-3">
                <GlowingButtonNative
                  title={savingPrep ? 'Saving Prep...' : 'Start Prep'}
                  variant="chakra"
                  onPress={() => {
                    void handleStartPrep()
                  }}
                  disabled={savingPrep}
                />
                {event.registrationLink ? (
                  <GlowingButtonNative
                    title="Register"
                    variant="saffron"
                    onPress={() => {
                      void Linking.openURL(event.registrationLink!)
                    }}
                    icon={<Ticket color="#FF5F1F" size={16} />}
                  />
                ) : null}
                <GlowingButtonNative
                  title="Back To Events"
                  variant="saffron"
                  onPress={() => router.replace('/athlete-events')}
                />
              </View>
            </ReviewSurfaceCard>
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
