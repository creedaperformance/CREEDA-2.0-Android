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
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
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
  fetchIndividualWeeklyReview,
  type IndividualWeeklyReview,
} from '../src/lib/mobile-api'

export default function IndividualReviewScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [review, setReview] = useState<IndividualWeeklyReview | null>(null)
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

      const response = await fetchIndividualWeeklyReview(session.access_token)
      setReview(response.review)
      setError(null)
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Failed to load your individual weekly review.'
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

  if (user && user.profile.role !== 'individual') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Individual review is individual-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This route mirrors the web individual weekly review, and your current mobile role is {user.profile.role}.
        </Text>
      </View>
    )
  }

  if (loading && !review) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Building your individual weekly review...
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
            Individual Weekly Review
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            How your week is shaping the next step
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This native screen now mirrors the same weekly story the individual web app generates from FitStart, logs, and device context.
          </Text>
        </View>

        {error ? (
          <ReviewEmptyState title="Weekly review unavailable" body={error} />
        ) : null}

        {!review ? (
          <ReviewEmptyState
            title="No individual review yet"
            body="Finish FitStart and keep the daily loop moving so CREEDA has enough signal to build a weekly review."
          />
        ) : null}

        {review ? (
          <>
            <ReviewSurfaceCard watermark="IND">
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
                  icon={Sparkles}
                  text={review.decision.directionLabel}
                  color="#00E5FF"
                />
                <ReviewBadgeChip
                  icon={ShieldCheck}
                  text={`${review.trustSummary.confidenceLevel} confidence`}
                />
                <ReviewBadgeChip
                  icon={BarChart3}
                  text={`${review.progressToPeakPct}% to peak`}
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
                  <ReviewMetricTile label="Peak progress" value={`${review.progressToPeakPct}%`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Streak" value={`${review.streakCount} days`} />
                </View>
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <BarChart3 color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Readiness trend
                </Text>
              </View>
              <ReviewTrendPanel points={review.trend} loadCaption={false} />
            </ReviewSurfaceCard>

            <View className="mt-2 gap-2">
              <ReviewInsightCard
                icon={Target}
                eyebrow="Bottleneck"
                title="What deserves attention"
                body={review.bottleneck}
              />
              <ReviewInsightCard
                icon={CheckCircle2}
                eyebrow="Win"
                title="What improved"
                body={review.biggestWin}
                color="#00E5FF"
              />
              <ReviewInsightCard
                icon={ArrowRight}
                eyebrow="Next week"
                title="What to keep doing"
                body={review.nextWeekFocus}
                color="#00E5FF"
              />
              <ReviewInsightCard
                icon={Timer}
                eyebrow="Objective"
                title={review.objectiveTest?.classification || 'Measured signal'}
                body={
                  review.objectiveTest?.summary ||
                  'Objective testing is optional. Add a reaction test only if you want CREEDA to pair your weekly story with one measured phone-based signal.'
                }
              />
            </View>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Sparkles color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Identity this week
                </Text>
              </View>
              <Text className="mt-4 text-2xl font-black tracking-tight text-white">
                The deeper traits your routine is building
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                The daily plan matters, but the bigger win is what your habits are becoming. These metrics keep the focus on durable momentum, not one good day.
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
                    value={`${review.trustSummary.confidenceLevel} ${review.trustSummary.confidenceScore}`}
                    compact
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Data quality"
                    value={review.trustSummary.dataQuality}
                    compact
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Completeness"
                    value={`${review.trustSummary.dataCompleteness}%`}
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
                {review.trustSummary.nextBestInputs.slice(0, 3).map((item) => (
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
                Use the review
              </Text>
              <Text className="mt-4 text-2xl font-black tracking-tight text-white">
                Keep the system calm, clear, and useful
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                The point of this review is to remove guesswork. Let it guide your next few days, then let fresh signals confirm whether the plan is working.
              </Text>

              <View className="mt-6 rounded-[24px] border border-white/5 bg-white/[0.03] p-5">
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Today&apos;s path
                </Text>
                <Text className="mt-3 text-xl font-black tracking-tight text-white">
                  {review.decision.pathway.title}
                </Text>
                <Text className="mt-3 text-sm leading-6 text-white/60">
                  {review.decision.pathway.rationale}
                </Text>
              </View>

              <View className="mt-6 gap-3">
                <GlowingButtonNative
                  title="Log Today"
                  variant="chakra"
                  onPress={() => router.push('/individual-log')}
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
