import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import {
  ArrowLeft,
  MapPin,
  Navigation2,
  Ticket,
} from 'lucide-react-native'

import { ReviewEmptyState, ReviewSurfaceCard } from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'
import {
  fetchAthleteEvents,
  type AthleteEventSummary,
} from '../src/lib/mobile-api'

const EVENT_FILTERS = [
  'All Events',
  'Running',
  'Functional Fitness',
  'Combat',
  'Cycling',
  'Endurance',
] as const

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function getDaysLeft(value: string) {
  const diff = new Date(value).getTime() - Date.now()
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function filterEvents(events: AthleteEventSummary[], activeFilter: string) {
  return events.filter((event) => {
    if (activeFilter === 'All Events') return true
    if (activeFilter === 'Combat') {
      return event.eventType === 'Grappling' || event.eventType === 'Boxing'
    }
    if (activeFilter === 'Endurance') {
      return (
        event.eventType === 'Triathlon' ||
        event.eventType === 'Open Water Swimming' ||
        event.eventType === 'Mountaineering'
      )
    }

    return event.eventType.toLowerCase().includes(activeFilter.toLowerCase())
  })
}

export default function AthleteEventsScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [events, setEvents] = useState<AthleteEventSummary[]>([])
  const [activeFilter, setActiveFilter] = useState<(typeof EVENT_FILTERS)[number]>('All Events')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadEvents(showRefreshState = false) {
    if (!session?.access_token) {
      setLoading(false)
      return
    }

    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetchAthleteEvents(session.access_token)
      setEvents(response.events)
      setError(null)
    } catch (eventsError) {
      setError(
        eventsError instanceof Error ? eventsError.message : 'Failed to load athlete events.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [session?.access_token])

  const filteredEvents = useMemo(
    () => filterEvents(events, activeFilter),
    [activeFilter, events]
  )

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'athlete') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Athlete events are athlete-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your current mobile role is {user.profile.role}, so this events route is not available on
          this account.
        </Text>
      </View>
    )
  }

  if (loading && !events.length && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Scanning event radar...
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120, paddingTop: 64 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadEvents(true)
            }}
            tintColor="#FF5F1F"
          />
        }
      >
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="mb-6">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Athlete Events
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Event radar
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            The web event discovery flow is now available in mobile, including filters, detail, and
            event prep activation.
          </Text>
        </View>

        {error ? <ReviewEmptyState title="Events unavailable" body={error} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {EVENT_FILTERS.map((filter) => {
              const active = activeFilter === filter
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-3 ${
                    active ? 'bg-[#00E5FF]/15' : 'border border-white/10 bg-white/[0.04]'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                      active ? 'text-chakra-neon' : 'text-white/55'
                    }`}
                  >
                    {filter}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>

        {!error && !filteredEvents.length ? (
          <ReviewSurfaceCard>
            <View className="items-center py-8">
              <Navigation2 color="#64748B" size={28} />
              <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                No events found
              </Text>
              <Text className="mt-3 text-center text-sm leading-6 text-white/55">
                Expand your filters or check back later for the next challenge.
              </Text>
            </View>
          </ReviewSurfaceCard>
        ) : null}

        {filteredEvents.map((event) => (
          <ReviewSurfaceCard key={event.id}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="rounded-[20px] bg-[#00E5FF]/12 px-3 py-3">
                <Text className="text-[9px] font-black uppercase tracking-[0.16em] text-chakra-neon">
                  Start
                </Text>
                <Text className="mt-1 text-lg font-black tracking-tight text-white">
                  {formatEventDate(event.eventDate)}
                </Text>
              </View>

              <View className="flex-1">
                <View className="flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-white/[0.05] px-3 py-1.5">
                    <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
                      {event.eventType}
                    </Text>
                  </View>
                  <View className="rounded-full bg-[#FF5F1F]/10 px-3 py-1.5">
                    <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FFD2BF]">
                      {getDaysLeft(event.eventDate)} days left
                    </Text>
                  </View>
                </View>

                <Text className="mt-4 text-2xl font-black tracking-tight text-white">
                  {event.eventName}
                </Text>
                <Text className="mt-3 text-sm leading-6 text-white/60">
                  {event.description ||
                    'Join athletes from around the region for this upcoming competitive event.'}
                </Text>

                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="flex-row items-center gap-2 rounded-full bg-white/[0.05] px-3 py-2">
                    <MapPin color="#94A3B8" size={10} />
                    <Text className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
                      {event.location}
                    </Text>
                  </View>
                  <View className="rounded-full bg-white/[0.05] px-3 py-2">
                    <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-chakra-neon">
                      {event.skillLevel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View className="mt-6 gap-3">
              <Pressable
                onPress={() => router.push(`/athlete-event/${event.id}`)}
                className="items-center rounded-2xl bg-white px-4 py-4"
              >
                <Text className="text-[11px] font-black uppercase tracking-[0.18em] text-black">
                  View Details
                </Text>
              </Pressable>

              {event.registrationLink ? (
                <Pressable
                  onPress={() => {
                    void Linking.openURL(event.registrationLink!)
                  }}
                  className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#00E5FF]/15 px-4 py-4"
                >
                  <Ticket color="#00E5FF" size={16} />
                  <Text className="text-[11px] font-black uppercase tracking-[0.18em] text-chakra-neon">
                    Register
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ReviewSurfaceCard>
        ))}
      </ScrollView>
    </View>
  )
}
