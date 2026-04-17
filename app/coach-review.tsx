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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarRange,
  ClipboardList,
  Database,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import {
  ReviewBadgeChip,
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
  fetchCoachWeeklyReview,
  type CoachWeeklyReview,
} from '../src/lib/mobile-api'

function getPriorityTone(priority: string) {
  if (priority === 'Critical') return 'critical' as const
  if (priority === 'Warning') return 'warning' as const
  return 'info' as const
}

function getSuggestionTone(priority: string) {
  if (priority === 'High') return 'critical' as const
  if (priority === 'Watch') return 'warning' as const
  return 'build' as const
}

function getQueueTone(queueType: string) {
  return queueType === 'intervention' ? ('critical' as const) : ('info' as const)
}

export default function CoachReviewScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [review, setReview] = useState<CoachWeeklyReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadReview(showRefreshState = false) {
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

      const response = await fetchCoachWeeklyReview(session.access_token)
      setReview(response.review)
      setError(null)
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Failed to load your coach weekly review.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadReview()
  }, [session?.access_token])

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'coach') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Coach review is coach-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This route matches the coach weekly review on web, and your current mobile role is {user.profile.role}.
        </Text>
      </View>
    )
  }

  if (loading && !review) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Building your coach weekly review...
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
              void loadReview(true)
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
            Coach Weekly Review
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            What the squad needs next week
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This native screen now carries the same coach weekly review that the web app builds from your live teams, interventions, and signal quality.
          </Text>
        </View>

        {error ? <ReviewEmptyState title="Weekly review unavailable" body={error} /> : null}

        {!review ? (
          <ReviewEmptyState
            title="No coach review yet"
            body="Invite athletes, let the daily loop run, and CREEDA will start building a believable squad review."
          />
        ) : null}

        {review ? (
          <>
            <ReviewSurfaceCard watermark="CO">
              <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-chakra-neon">
                Weekly Review
              </Text>
              <Text className="mt-4 text-3xl font-black tracking-tight text-white">
                {review.periodLabel}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                {review.biggestWin} {review.bottleneck}
              </Text>

              <View className="mt-6 flex-row flex-wrap gap-2">
                <ReviewBadgeChip icon={Users} text={`${review.athleteCount} athletes`} />
                <ReviewBadgeChip
                  icon={ShieldCheck}
                  text={`${review.activeInterventions} live interventions`}
                />
                <ReviewBadgeChip
                  icon={Database}
                  text={`${review.lowDataCount} low-data items`}
                />
                <ReviewBadgeChip
                  icon={BarChart3}
                  text={`${review.squadCompliancePct}% compliance`}
                />
              </View>

              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile label="Average readiness" value={`${review.averageReadiness}`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Readiness delta"
                    value={`${review.readinessDelta >= 0 ? '+' : ''}${review.readinessDelta}`}
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Resolved this week" value={`${review.resolvedThisWeek}`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Objective coverage" value={`${review.objectiveCoveragePct}%`} />
                </View>
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <TrendingUp color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Squad readiness trend
                </Text>
              </View>
              <ReviewTrendPanel points={review.trend} />

              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile label="Teams" value={`${review.teamCount}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Athletes" value={`${review.athleteCount}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Interventions" value={`${review.activeInterventions}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Objective declines"
                    value={`${review.objectiveDecliningCount}`}
                    compact
                  />
                </View>
              </View>
            </ReviewSurfaceCard>

            <View className="mt-2 gap-2">
              <ReviewInsightCard
                icon={AlertTriangle}
                eyebrow="Bottleneck"
                title="What held the squad back"
                body={review.bottleneck}
              />
              <ReviewInsightCard
                icon={ShieldCheck}
                eyebrow="Win"
                title="What moved forward"
                body={review.biggestWin}
                color="#00E5FF"
              />
              <ReviewInsightCard
                icon={Users}
                eyebrow="Risk cluster"
                title="Where the pressure is concentrated"
                body={review.highestRiskCluster}
              />
              <ReviewInsightCard
                icon={ArrowRight}
                eyebrow="Next week"
                title="What to change first"
                body={review.nextWeekFocus}
                color="#00E5FF"
              />
            </View>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <ClipboardList color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Top priority athletes
                </Text>
              </View>

              {review.topPriorityAthletes.length ? (
                <View className="mt-6 gap-3">
                  {review.topPriorityAthletes.map((item) => (
                    <View
                      key={`${item.teamId}-${item.athleteId}-${item.queueType}`}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row flex-wrap items-center gap-2">
                        <Text className="text-lg font-black tracking-tight text-white">
                          {item.athleteName}
                        </Text>
                        <ReviewTonePill
                          label={item.priority}
                          tone={getPriorityTone(item.priority)}
                        />
                        <ReviewTonePill
                          label={item.queueType === 'intervention' ? 'Intervention' : 'Low Data'}
                          tone={getQueueTone(item.queueType)}
                        />
                      </View>
                      <Text className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                        {item.teamName}
                      </Text>
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        {item.reasons.map((reason) => (
                          <ReviewTonePill
                            key={`${item.athleteId}-${reason}`}
                            label={reason}
                            tone="neutral"
                          />
                        ))}
                      </View>
                      <Text className="mt-3 text-sm leading-6 text-white/60">
                        {item.recommendation}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-6">
                  <ReviewEmptyState
                    title="No live priority athletes right now"
                    body="The queue is currently clear enough that no athlete is demanding immediate squad-level escalation."
                  />
                </View>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <CalendarRange color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Group suggestions
                </Text>
              </View>
              <View className="mt-6 gap-3">
                {review.groupSuggestions.map((suggestion) => (
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
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <ShieldCheck color="#00E5FF" size={16} />
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
              <ReviewIdentityMetricList metrics={review.identityMetrics} squadContext />
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Users color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Team summaries
                </Text>
              </View>

              {review.teamSummaries.length ? (
                <View className="mt-6 gap-3">
                  {review.teamSummaries.map((team) => (
                    <View
                      key={team.teamId}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <Text className="text-xl font-black tracking-tight text-white">
                        {team.teamName}
                      </Text>
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
                          <ReviewMetricTile label="High-risk" value={`${team.highRiskCount}`} compact />
                        </View>
                        <View className="w-[48%]">
                          <ReviewMetricTile
                            label="Consistency"
                            value={team.consistencyScore !== null ? `${team.consistencyScore}` : 'N/A'}
                            compact
                          />
                        </View>
                        <View className="w-[48%]">
                          <ReviewMetricTile
                            label="Reliability"
                            value={team.reliabilityScore !== null ? `${team.reliabilityScore}` : 'N/A'}
                            compact
                          />
                        </View>
                      </View>
                      <Text className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                        {team.athleteCount} athletes - {team.objectiveCoveragePct}% optional objective coverage
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-6">
                  <ReviewEmptyState
                    title="No team summaries yet"
                    body="Invite athletes and let the daily loop run so CREEDA can compare teams with real signal quality."
                  />
                </View>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                Use the review
              </Text>
              <Text className="mt-4 text-2xl font-black tracking-tight text-white">
                Move from monitoring to planning
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                The dashboard tells you who needs attention today. The weekly review tells you whether the next block should protect recovery, clean up signal quality, or press a quality window.
              </Text>

              <View className="mt-6 gap-3">
                <GlowingButtonNative
                  title="Coach Analytics"
                  variant="chakra"
                  onPress={() => router.push('/coach-analytics')}
                />
                <GlowingButtonNative
                  title="Academy Ops"
                  variant="saffron"
                  onPress={() => router.push('/coach-academy')}
                />
                <GlowingButtonNative
                  title="Coach Reports"
                  variant="chakra"
                  onPress={() => router.push('/coach-reports')}
                />
                <GlowingButtonNative
                  title="Back To Home"
                  variant="saffron"
                  onPress={() => router.replace('/(tabs)')}
                />
              </View>
            </ReviewSurfaceCard>
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
