import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  History,
  Search,
  Video,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../neon/GlowingButtonNative'
import {
  ReviewEmptyState,
  ReviewMetricTile,
  ReviewSurfaceCard,
  ReviewTonePill,
} from '../review/ReviewPrimitives'
import { useMobileAuth } from '../../lib/auth'
import {
  fetchMobileVideoAnalysisHub,
  type MobileVideoAnalysisReport,
  type MobileVideoAnalysisRole,
  type MobileVideoAnalysisSportOption,
} from '../../lib/mobile-api'

const GENERIC_CAPTURE_TIPS = [
  'Keep the full body visible, including foot strike and landing.',
  'Stable side or 45-degree footage gives CREEDA the cleanest joint reads.',
  'Use 2-4 repetitions of the same movement instead of one rushed attempt.',
]

function getStatusTone(status: MobileVideoAnalysisReport['summary']['status']) {
  if (status === 'clean') return 'success' as const
  if (status === 'watch') return 'warning' as const
  return 'critical' as const
}

function formatReportDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getReportRoute(role: MobileVideoAnalysisRole, reportId: string) {
  return role === 'athlete'
    ? `/athlete-scan-report/${reportId}`
    : `/individual-scan-report/${reportId}`
}

function SportCard({
  sport,
  selected,
  onPress,
}: {
  sport: MobileVideoAnalysisSportOption
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-[24px] border p-4 ${
        selected ? 'border-[#FF5F1F]/35 bg-[#FF5F1F]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <View className="flex-row items-start gap-3">
        <Text className="text-2xl">{sport.emoji}</Text>
        <View className="flex-1">
          <Text className="text-sm font-black tracking-tight text-white">{sport.sportLabel}</Text>
          <Text className="mt-2 text-sm leading-6 text-white/55">{sport.shortPrompt}</Text>
          <Text className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            {sport.captureView}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

export function VideoAnalysisHubNative({
  expectedRole,
}: {
  expectedRole: MobileVideoAnalysisRole
}) {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [sports, setSports] = useState<MobileVideoAnalysisSportOption[]>([])
  const [recentReports, setRecentReports] = useState<MobileVideoAnalysisReport[]>([])
  const [preferredSport, setPreferredSport] = useState<string | null>(null)
  const [selectedSport, setSelectedSport] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadHub(showRefreshState = false) {
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

      const response = await fetchMobileVideoAnalysisHub(session.access_token)
      setSports(response.hub.sports)
      setRecentReports(response.hub.recentReports)
      setPreferredSport(response.hub.preferredSport)
      setSelectedSport((currentSport) => {
        if (
          currentSport &&
          response.hub.sports.some((sport) => sport.sportId === currentSport)
        ) {
          return currentSport
        }

        if (
          response.hub.preferredSport &&
          response.hub.sports.some((sport) => sport.sportId === response.hub.preferredSport)
        ) {
          return response.hub.preferredSport
        }

        return response.hub.sports[0]?.sportId ?? null
      })
      setError(null)
    } catch (hubError) {
      setError(
        hubError instanceof Error
          ? hubError.message
          : 'Failed to load the mobile scan hub.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadHub()
  }, [session?.access_token])

  const filteredSports = useMemo(() => {
    if (!query.trim()) return sports

    const normalizedQuery = query.trim().toLowerCase()
    return sports.filter((sport) =>
      `${sport.sportLabel} ${sport.shortPrompt} ${sport.captureView}`
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [query, sports])

  const selectedSportMeta =
    sports.find((sport) => sport.sportId === selectedSport) ||
    sports.find((sport) => sport.sportId === preferredSport) ||
    null

  function openAnalyzer() {
    if (!selectedSportMeta) return

    router.push(
      `/${expectedRole}-scan-analyze?sport=${encodeURIComponent(selectedSportMeta.sportId)}`
    )
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== expectedRole) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          {expectedRole === 'athlete' ? 'Athlete scan' : 'Movement scan'} is role-locked
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your current mobile role is {user.profile.role}, so this scan hub is not available on
          this account.
        </Text>
      </View>
    )
  }

  if (loading && !sports.length && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading your scan hub...
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
              void loadHub(true)
            }}
            tintColor="#FF5F1F"
          />
        }
      >
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="mb-8">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            {expectedRole === 'athlete' ? 'Athlete Scan' : 'Movement Scan'}
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Scan hub and report history
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            The report stack is native in Expo, and the exact CREEDA analyzer now runs inside the
            app instead of bouncing you out to the browser.
          </Text>
        </View>

        {error ? (
          <ReviewEmptyState title="Scan hub unavailable" body={error} />
        ) : null}

        <ReviewSurfaceCard watermark="SCAN">
          <View className="flex-row items-start gap-3">
            <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
              <Video color="#FF5F1F" size={16} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-chakra-neon">
                Selected Sport
              </Text>
              <Text className="mt-2 text-2xl font-black tracking-tight text-white">
                {selectedSportMeta?.sportLabel || 'Choose a sport'}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                {selectedSportMeta?.shortPrompt ||
                  'Pick the sport or movement context you want CREEDA to audit.'}
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
            <View className="w-[48%]">
              <ReviewMetricTile
                label="Capture angle"
                value={selectedSportMeta?.captureView || 'Pending'}
                compact
              />
            </View>
            <View className="w-[48%]">
              <ReviewMetricTile label="Recent reports" value={`${recentReports.length}`} compact />
            </View>
          </View>

          <View className="mt-6 gap-3">
            <GlowingButtonNative
              title="Launch In-App Analyzer"
              variant="chakra"
              onPress={() => {
                openAnalyzer()
              }}
              disabled={!selectedSportMeta}
            />
            <Text className="text-sm leading-6 text-white/55">
              This loads the exact CREEDA web analyzer inside the mobile app, preloaded with your
              selected sport, so the scan flow no longer has to jump out to the browser.
            </Text>
          </View>
        </ReviewSurfaceCard>

        <ReviewSurfaceCard>
          <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            Select Sport
          </Text>

          <View className="mt-4 rounded-[24px] border border-white/5 bg-white/[0.03] px-4 py-1">
            <View className="flex-row items-center gap-3">
              <Search color="#94A3B8" size={16} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search sports"
                placeholderTextColor="rgba(255,255,255,0.25)"
                className="flex-1 py-3 text-sm text-white"
              />
            </View>
          </View>

          <View className="mt-5 gap-3">
            {filteredSports.length ? (
              filteredSports.map((sport) => (
                <SportCard
                  key={sport.sportId}
                  sport={sport}
                  selected={sport.sportId === selectedSportMeta?.sportId}
                  onPress={() => setSelectedSport(sport.sportId)}
                />
              ))
            ) : (
              <Text className="text-sm leading-6 text-white/55">
                No scan profiles matched your search.
              </Text>
            )}
          </View>
        </ReviewSurfaceCard>

        <ReviewSurfaceCard>
          <View className="flex-row items-center gap-2">
            <History color="#00E5FF" size={16} />
            <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Recent Reports
            </Text>
          </View>

          {recentReports.length ? (
            <View className="mt-5 gap-3">
              {recentReports.map((report) => (
                <Pressable
                  key={report.id}
                  onPress={() => router.push(getReportRoute(expectedRole, report.id))}
                  className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                >
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-base font-black tracking-tight text-white">
                        {report.sportLabel}
                      </Text>
                      <Text className="mt-2 text-sm leading-6 text-white/60">
                        {report.summary.headline}
                      </Text>
                      <Text className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                        {formatReportDate(report.createdAt)}
                      </Text>
                    </View>

                    <View className="items-end gap-2">
                      <Text className="text-3xl font-black tracking-tight text-white">
                        {report.summary.score}%
                      </Text>
                      <ReviewTonePill
                        label={report.summary.status}
                        tone={getStatusTone(report.summary.status)}
                      />
                    </View>
                  </View>

                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-sm leading-6 text-white/55">
                      {report.warnings} corrections • {report.positive} positives
                    </Text>
                    <ChevronRight color="#94A3B8" size={16} />
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="mt-4 text-sm leading-6 text-white/55">
              Your first scan report will appear here with movement score, tracked faults, and next
              step drills.
            </Text>
          )}
        </ReviewSurfaceCard>

        <ReviewSurfaceCard>
          <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            Best Capture Tips
          </Text>
          <View className="mt-4 gap-3">
            {GENERIC_CAPTURE_TIPS.map((tip) => (
              <View key={tip} className="flex-row items-start gap-3">
                <Camera color="#FF5F1F" size={14} style={{ marginTop: 4 }} />
                <Text className="flex-1 text-sm leading-6 text-white/60">{tip}</Text>
              </View>
            ))}
          </View>
        </ReviewSurfaceCard>
      </ScrollView>
    </View>
  )
}
