import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Video,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import { ProfileAvatarNative } from '../src/components/profile/ProfileAvatarNative'
import {
  ReviewEmptyState,
  ReviewMetricTile,
  ReviewSurfaceCard,
  ReviewTonePill,
} from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'
import {
  fetchCoachReports,
  type CoachVideoReportSummary,
} from '../src/lib/mobile-api'

function getReportTone(status: string) {
  if (status === 'corrective') return 'critical' as const
  if (status === 'watch') return 'warning' as const
  return 'success' as const
}

export default function CoachReportsScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [reports, setReports] = useState<CoachVideoReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadReports(showRefreshState = false) {
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

      const response = await fetchCoachReports(session.access_token)
      setReports(response.reports)
      setError(null)
    } catch (reportsError) {
      setError(
        reportsError instanceof Error
          ? reportsError.message
          : 'Failed to load your coach reports.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadReports()
  }, [session?.access_token])

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'coach') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Coach reports are coach-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This feed mirrors the coach report list on web, and your current mobile role is {user.profile.role}.
        </Text>
      </View>
    )
  }

  if (loading && !reports.length && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading coach reports...
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
              void loadReports(true)
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
            Coach Reports
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Biomechanical report feed
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            Real biomechanical video reports from athlete scans across your roster, now available inside the mobile coach app.
          </Text>
        </View>

        {error ? <ReviewEmptyState title="Report feed unavailable" body={error} /> : null}

        {!error && reports.length === 0 ? (
          <ReviewEmptyState
            title="No athlete scans yet"
            body="Once your athletes upload movement clips, their reports will appear here with score, faults, and correction plans."
          />
        ) : null}

        {reports.length ? (
          <View className="gap-2">
            {reports.map((report) => (
              <Pressable
                key={report.id}
                onPress={() => router.push(`/coach-report/${report.id}`)}
              >
                <ReviewSurfaceCard>
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1 flex-row items-start gap-4">
                      <ProfileAvatarNative
                        uri={report.athleteAvatarUrl}
                        name={report.athleteName}
                        size={52}
                      />
                      <View className="flex-1">
                        <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                          {report.athleteName}
                        </Text>
                        <Text className="mt-3 text-xl font-black tracking-tight text-white">
                          {report.sportLabel}
                        </Text>
                        <Text className="mt-2 text-sm leading-6 text-white/60">
                          {report.summary.headline}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-3xl font-black tracking-tight text-white">
                        {report.summary.score}%
                      </Text>
                      <View className="mt-2">
                        <ReviewTonePill
                          label={report.summary.status}
                          tone={getReportTone(report.summary.status)}
                        />
                      </View>
                    </View>
                  </View>

                  <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
                    <View className="w-[31%]">
                      <ReviewMetricTile label="Corrections" value={`${report.warnings}`} compact />
                    </View>
                    <View className="w-[31%]">
                      <ReviewMetricTile label="Positives" value={`${report.positive}`} compact />
                    </View>
                    <View className="w-[31%]">
                      <ReviewMetricTile label="Frames" value={`${report.frameCount}`} compact />
                    </View>
                  </View>

                  <View className="mt-5 flex-row flex-wrap gap-2">
                    {report.recommendations.slice(0, 2).map((recommendation) => (
                      <ReviewTonePill
                        key={`${report.id}-${recommendation.title}`}
                        label={recommendation.title}
                        tone={
                          recommendation.priority === 'high'
                            ? 'critical'
                            : recommendation.priority === 'medium'
                              ? 'warning'
                              : 'info'
                        }
                      />
                    ))}
                  </View>

                  <Text className="mt-4 text-sm leading-6 text-white/60">
                    {report.summary.coachSummary}
                  </Text>

                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-white/55">
                      Open full report
                    </Text>
                    <ChevronRight color="#94A3B8" size={16} />
                  </View>
                </ReviewSurfaceCard>
              </Pressable>
            ))}
          </View>
        ) : null}

        <ReviewSurfaceCard>
          <View className="flex-row items-start gap-3">
            <ClipboardList color="#00E5FF" size={18} />
            <View className="flex-1">
              <Text className="text-lg font-black tracking-tight text-white">
                Coach action loop
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                Use these reports to adjust drill emphasis, lower chaos when high-severity faults appear, and re-scan once the movement pattern stabilizes.
              </Text>
            </View>
          </View>

          <View className="mt-6 gap-3">
            <GlowingButtonNative
              title="Weekly Review"
              variant="chakra"
              onPress={() => router.push('/coach-review')}
            />
            <GlowingButtonNative
              title="Back To Home"
              variant="saffron"
              onPress={() => router.replace('/(tabs)')}
            />
          </View>
        </ReviewSurfaceCard>
      </ScrollView>
    </View>
  )
}
