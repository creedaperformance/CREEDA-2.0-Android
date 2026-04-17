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
  ArrowRight,
  BarChart3,
  ClipboardList,
  Database,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import {
  ReviewEmptyState,
  ReviewIdentityMetricList,
  ReviewInsightCard,
  ReviewMetricTile,
  ReviewSurfaceCard,
  ReviewTonePill,
  ReviewTrendPanel,
} from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'
import {
  fetchCoachAnalytics,
  type CoachWeeklyReview,
} from '../src/lib/mobile-api'

function getSuggestionTone(priority: string) {
  if (priority === 'High') return 'critical' as const
  if (priority === 'Watch') return 'warning' as const
  return 'build' as const
}

function getPriorityTone(priority: string) {
  if (priority === 'Critical') return 'critical' as const
  if (priority === 'Warning') return 'warning' as const
  return 'info' as const
}

function getQueueTone(queueType: string) {
  return queueType === 'intervention' ? ('critical' as const) : ('info' as const)
}

export default function CoachAnalyticsScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [analytics, setAnalytics] = useState<CoachWeeklyReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadAnalytics(showRefreshState = false) {
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

      const response = await fetchCoachAnalytics(session.access_token)
      setAnalytics(response.analytics)
      setError(null)
    } catch (analyticsError) {
      setError(
        analyticsError instanceof Error
          ? analyticsError.message
          : 'Failed to load coach analytics.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAnalytics()
  }, [session?.access_token])

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'coach') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Coach analytics is coach-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This route mirrors the coach analytics layer from web, and your current mobile role is {user.profile.role}.
        </Text>
      </View>
    )
  }

  if (loading && !analytics && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading coach analytics...
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
              void loadAnalytics(true)
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
            Coach Analytics
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Squad trends, pressure, and planning signals
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            The mobile app now carries the same coach analytics lens as web: where the squad is holding up, where pressure is concentrated, and what the next microcycle should protect.
          </Text>
        </View>

        {error ? <ReviewEmptyState title="Coach analytics unavailable" body={error} /> : null}

        {!analytics && !error ? (
          <ReviewEmptyState
            title="No analytics yet"
            body="Invite athletes and let the daily loop run so CREEDA can build a believable squad pattern."
          />
        ) : null}

        {analytics ? (
          <>
            <ReviewSurfaceCard watermark="CO">
              <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-chakra-neon">
                Analytics Snapshot
              </Text>
              <Text className="mt-4 text-3xl font-black tracking-tight text-white">
                {analytics.periodLabel}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                {analytics.biggestWin}
              </Text>

              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile label="Average readiness" value={`${analytics.averageReadiness}`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Squad compliance" value={`${analytics.squadCompliancePct}%`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Live interventions" value={`${analytics.activeInterventions}`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Objective coverage" value={`${analytics.objectiveCoveragePct}%`} />
                </View>
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <TrendingUp color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  7-day readiness trajectory
                </Text>
              </View>
              <ReviewTrendPanel points={analytics.trend} />

              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Delta"
                    value={`${analytics.readinessDelta >= 0 ? '+' : ''}${analytics.readinessDelta}`}
                    compact
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Resolved" value={`${analytics.resolvedThisWeek}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Low-data" value={`${analytics.lowDataCount}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Objective declines"
                    value={`${analytics.objectiveDecliningCount}`}
                    compact
                  />
                </View>
              </View>
            </ReviewSurfaceCard>

            <View className="mt-2 gap-2">
              <ReviewInsightCard
                icon={TriangleAlert}
                eyebrow="Pressure"
                title="Where the squad is getting squeezed"
                body={analytics.bottleneck}
              />
              <ReviewInsightCard
                icon={ShieldCheck}
                eyebrow="Stability"
                title="What is holding up well"
                body={analytics.biggestWin}
                color="#00E5FF"
              />
              <ReviewInsightCard
                icon={Users}
                eyebrow="Cluster"
                title="Where to look first"
                body={analytics.highestRiskCluster}
              />
            </View>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <BarChart3 color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Team comparison
                </Text>
              </View>

              {analytics.teamSummaries.length ? (
                <View className="mt-6 gap-3">
                  {analytics.teamSummaries.map((team) => (
                    <View
                      key={team.teamId}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-xl font-black tracking-tight text-white">
                            {team.teamName}
                          </Text>
                          <Text className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                            {team.athleteCount} athletes • {team.objectiveCoveragePct}% objective coverage
                          </Text>
                        </View>
                        <ReviewTonePill
                          label={`${team.highRiskCount} high-risk`}
                          tone={team.highRiskCount > 0 ? 'critical' : 'neutral'}
                        />
                      </View>

                      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
                        <View className="w-[48%]">
                          <ReviewMetricTile label="Readiness" value={`${team.averageReadiness}`} compact />
                        </View>
                        <View className="w-[48%]">
                          <ReviewMetricTile label="Compliance" value={`${team.compliancePct}%`} compact />
                        </View>
                        <View className="w-[48%]">
                          <ReviewMetricTile label="Interventions" value={`${team.interventionCount}`} compact />
                        </View>
                        <View className="w-[48%]">
                          <ReviewMetricTile label="Low-data" value={`${team.lowDataCount}`} compact />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-6">
                  <ReviewEmptyState
                    title="No team analytics yet"
                    body="Invite athletes and let the daily loop run so CREEDA can compare teams with real signal quality."
                  />
                </View>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Database color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Actionable patterns
                </Text>
              </View>

              <View className="mt-6 gap-3">
                {analytics.groupSuggestions.map((suggestion) => (
                  <View
                    key={suggestion.title}
                    className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                  >
                    <View className="flex-row flex-wrap items-center gap-2">
                      <ReviewTonePill
                        label={suggestion.priority}
                        tone={getSuggestionTone(suggestion.priority)}
                      />
                      <Text className="text-lg font-black tracking-tight text-white">
                        {suggestion.title}
                      </Text>
                    </View>
                    <Text className="mt-3 text-sm leading-6 text-white/60">
                      {suggestion.detail}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="mt-6 rounded-[24px] border border-white/5 bg-white/[0.03] p-4">
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Next weekly focus
                </Text>
                <Text className="mt-3 text-xl font-black tracking-tight text-white">
                  {analytics.nextWeekFocus}
                </Text>
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <ClipboardList color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Top live priorities
                </Text>
              </View>

              {analytics.topPriorityAthletes.length ? (
                <View className="mt-6 gap-3">
                  {analytics.topPriorityAthletes.map((item) => (
                    <View
                      key={`${item.teamId}-${item.athleteId}-${item.queueType}`}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-lg font-black tracking-tight text-white">
                          {item.athleteName}
                        </Text>
                        <ReviewTonePill label={item.priority} tone={getPriorityTone(item.priority)} />
                        <ReviewTonePill
                          label={item.queueType === 'intervention' ? 'Intervention' : 'Low Data'}
                          tone={getQueueTone(item.queueType)}
                        />
                      </View>
                      <Text className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                        {item.teamName}
                      </Text>
                      <Text className="mt-3 text-sm leading-6 text-white/60">
                        {item.recommendation}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-6">
                  <ReviewEmptyState
                    title="No active pressure points"
                    body="The current intervention view is quiet enough that no single athlete is dominating squad planning."
                  />
                </View>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Users color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Squad identity
                </Text>
              </View>
              <Text className="mt-4 text-2xl font-black tracking-tight text-white">
                The traits the squad is actually reinforcing
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                This is the layer beneath readiness. It shows whether the group is becoming more resilient, more reliable, and easier to coach with confidence.
              </Text>
              <ReviewIdentityMetricList metrics={analytics.identityMetrics} squadContext />
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-start gap-3">
                <ArrowRight color="#00E5FF" size={18} />
                <View className="flex-1">
                  <Text className="text-lg font-black tracking-tight text-white">
                    Move from monitoring to planning
                  </Text>
                  <Text className="mt-3 text-sm leading-6 text-white/60">
                    The dashboard tells you who needs attention today. Analytics tells you whether the next block should protect recovery, clean up signal quality, or press a quality window.
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
                  title="Academy Ops"
                  variant="saffron"
                  onPress={() => router.push('/coach-academy')}
                />
              </View>
            </ReviewSurfaceCard>
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
