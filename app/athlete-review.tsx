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
  Brain,
  CalendarRange,
  Flame,
  ShieldCheck,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import {
  ReviewBadgeChip,
  ReviewEmptyState,
  ReviewIdentityMetricList,
  ReviewInsightCard,
  ReviewMetricTile,
  ReviewSurfaceCard,
  ReviewTrendPanel,
} from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'
import {
  fetchAthleteWeeklyReview,
  type AthleteWeeklyReview,
} from '../src/lib/mobile-api'

export default function AthleteReviewScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [review, setReview] = useState<AthleteWeeklyReview | null>(null)
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

      const response = await fetchAthleteWeeklyReview(session.access_token)
      setReview(response.review)
      setError(null)
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Failed to load your athlete weekly review.'
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

  if (user && user.profile.role !== 'athlete') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Athlete review is athlete-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This route matches the athlete weekly review on web, and your current mobile role is{' '}
          {user.profile.role}.
        </Text>
      </View>
    )
  }

  if (loading && !review) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Building your athlete weekly review...
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
            Athlete Weekly Review
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            What this week did to your readiness
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This is the same weekly review layer your web athlete flow uses, now rendered natively in Expo.
          </Text>
        </View>

        {error ? (
          <ReviewEmptyState
            title="Weekly review unavailable"
            body={error}
          />
        ) : null}

        {!review ? (
          <ReviewEmptyState
            title="No athlete review yet"
            body="Log a few real days so CREEDA can turn trend, trust, and recovery into a weekly story."
          />
        ) : null}

        {review ? (
          <>
            <ReviewSurfaceCard watermark="ATH">
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
                <ReviewBadgeChip
                  icon={Target}
                  text={review.decision?.decision || 'Review'}
                  color="#00E5FF"
                />
                <ReviewBadgeChip
                  icon={ShieldCheck}
                  text={
                    review.trustSummary
                      ? `${review.trustSummary.confidenceLevel} confidence`
                      : 'Confidence building'
                  }
                />
                <ReviewBadgeChip
                  icon={BarChart3}
                  text={`${review.readinessDelta >= 0 ? '+' : ''}${review.readinessDelta} readiness`}
                />
                <ReviewBadgeChip
                  icon={Brain}
                  text={`${review.contextSummary?.loadLabel || 'Low'} context`}
                />
                <ReviewBadgeChip
                  icon={Timer}
                  text={
                    review.objectiveTest?.latestValidatedScoreMs
                      ? `${review.objectiveTest.latestValidatedScoreMs}ms objective`
                      : 'Objective test optional'
                  }
                />
              </View>

              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile label="Average readiness" value={`${review.averageReadiness}`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Adherence" value={`${review.adherencePct}%`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Training load" value={`${review.loadMinutes} min`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Training days" value={`${review.trainingDays}`} />
                </View>
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <TrendingUp color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Readiness trend
                </Text>
              </View>
              <ReviewTrendPanel points={review.trend} />
            </ReviewSurfaceCard>

            <View className="mt-2 gap-2">
              <ReviewInsightCard
                icon={Flame}
                eyebrow="Bottleneck"
                title="What held the week back"
                body={review.bottleneck}
              />
              <ReviewInsightCard
                icon={ShieldCheck}
                eyebrow="Win"
                title="What actually moved forward"
                body={review.biggestWin}
                color="#00E5FF"
              />
              <ReviewInsightCard
                icon={ArrowRight}
                eyebrow="Next week"
                title="What to focus on next"
                body={review.nextWeekFocus}
                color="#00E5FF"
              />
              <ReviewInsightCard
                icon={Timer}
                eyebrow="Objective"
                title={review.objectiveTest?.classification || 'Measured signal'}
                body={
                  review.objectiveTest?.summary ||
                  'Objective testing is optional. Add it only if you want CREEDA to compare your subjective readiness with one measured phone-based anchor.'
                }
              />
            </View>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Brain color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Identity this week
                </Text>
              </View>
              <Text className="mt-4 text-2xl font-black tracking-tight text-white">
                The deeper patterns your week is building
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                Readiness shows today. These identity metrics show what your habits, recovery, and training rhythm are turning you into over time.
              </Text>
              <ReviewIdentityMetricList metrics={review.identityMetrics} />
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <CalendarRange color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Trust this week
                </Text>
              </View>
              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Confidence"
                    value={
                      review.trustSummary
                        ? `${review.trustSummary.confidenceLevel} ${review.trustSummary.confidenceScore}`
                        : 'N/A'
                    }
                    compact
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Data quality"
                    value={review.trustSummary?.dataQuality || 'WEAK'}
                    compact
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Completeness"
                    value={
                      review.trustSummary
                        ? `${review.trustSummary.dataCompleteness}%`
                        : '0%'
                    }
                    compact
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Objective"
                    value={
                      review.objectiveTest?.latestValidatedScoreMs
                        ? `${review.objectiveTest.latestValidatedScoreMs}ms`
                        : 'Not recent'
                    }
                    compact
                  />
                </View>
              </View>

              <View className="mt-6 gap-3">
                {(review.trustSummary?.nextBestInputs || [
                  'Keep logging daily inputs so next week has stronger signal quality.',
                ])
                  .slice(0, 3)
                  .map((item) => (
                    <View
                      key={item}
                      className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4"
                    >
                      <Text className="text-sm leading-6 text-white/65">{item}</Text>
                    </View>
                  ))}
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                Close the loop
              </Text>
              <Text className="mt-4 text-2xl font-black tracking-tight text-white">
                Turn this review into a better next week
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                Reviews only matter if they change the next decision. Use this summary to tighten recovery, improve logging quality, and make the next training call more believable.
              </Text>

              <View className="mt-6 gap-3">
                <GlowingButtonNative
                  title="Daily Check-In"
                  variant="chakra"
                  onPress={() => router.push('/check-in')}
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
