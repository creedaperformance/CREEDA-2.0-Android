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
  CalendarDays,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import {
  ReviewEmptyState,
  ReviewMetricTile,
  ReviewSurfaceCard,
} from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'
import {
  fetchAthleteMonthlyReport,
  type AthleteMonthlyReport,
} from '../src/lib/mobile-api'

function formatLogDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })
}

function getReadinessTone(readiness: number) {
  if (readiness >= 80) return 'text-emerald-300'
  if (readiness >= 60) return 'text-orange-200'
  return 'text-red-200'
}

export default function AthleteReportScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [report, setReport] = useState<AthleteMonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadReport(showRefreshState = false) {
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

      const response = await fetchAthleteMonthlyReport(session.access_token)
      setReport(response.report)
      setError(null)
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : 'Failed to load your athlete monthly report.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadReport()
  }, [session?.access_token])

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'athlete') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Athlete report is athlete-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your current mobile role is {user.profile.role}, so this monthly report route is not
          available on this account.
        </Text>
      </View>
    )
  }

  if (loading && !report) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Building your monthly performance report...
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
              void loadReport(true)
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
            Athlete Monthly Report
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            28-day performance report
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            The same readiness, load, compliance, and warning logic from the web report, now
            rendered natively in the mobile app.
          </Text>
        </View>

        {error ? <ReviewEmptyState title="Report unavailable" body={error} /> : null}

        {!report ? (
          <ReviewEmptyState
            title="No monthly report yet"
            body="CREEDA needs at least one recent athlete log to build a 28-day report."
          />
        ) : null}

        {report ? (
          <>
            <ReviewSurfaceCard watermark="28D">
              <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-chakra-neon">
                Performance Report
              </Text>
              <Text className="mt-4 text-3xl font-black tracking-tight text-white">
                {report.periodLabel}
              </Text>
              <Text className="mt-3 text-sm leading-6 text-white/60">
                CREEDA is summarizing the last 28 days of athlete logs into readiness, training
                stress, compliance, and chronic warning signals.
              </Text>

              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Average readiness"
                    value={`${report.averageReadiness}`}
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Total stress" value={`${report.macroLoadAU} AU`} />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile
                    label="Consistency"
                    value={`${report.consistencyScore}%`}
                  />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Logged days" value={`${report.reportedDays}/28`} />
                </View>
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <AlertTriangle color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Automatic Warning Signals
                </Text>
              </View>

              {report.warnings.length ? (
                <View className="mt-5 gap-3">
                  {report.warnings.map((warning) => (
                    <View
                      key={warning}
                      className="rounded-[24px] border border-red-400/20 bg-red-400/10 p-4"
                    >
                      <Text className="text-sm font-semibold leading-6 text-red-100">
                        {warning}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-5 rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <View className="flex-row items-center gap-2">
                    <ShieldCheck color="#6EE7B7" size={16} />
                    <Text className="text-lg font-black tracking-tight text-emerald-100">
                      No chronic warnings detected
                    </Text>
                  </View>
                  <Text className="mt-3 text-sm leading-6 text-emerald-100/70">
                    The last 28-day cycle looks stable enough that CREEDA did not raise any chronic
                    warning flags.
                  </Text>
                </View>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <CalendarDays color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  28-Day Raw Log
                </Text>
              </View>

              {report.rows.length ? (
                <View className="mt-5 gap-3">
                  {report.rows.map((row) => (
                    <View
                      key={row.id}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="text-base font-black tracking-tight text-white">
                          {formatLogDate(row.logDate)}
                        </Text>
                        <Text
                          className={`text-2xl font-black tracking-tight ${getReadinessTone(
                            row.readiness
                          )}`}
                        >
                          {row.readiness}
                        </Text>
                      </View>

                      <Text className="mt-3 text-sm leading-6 text-white/60">
                        {row.plannedTraining}
                      </Text>

                      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
                        <View className="w-[48%]">
                          <ReviewMetricTile label="Load" value={`${row.load}`} compact />
                        </View>
                        <View className="w-[48%]">
                          <ReviewMetricTile label="Pain" value={`${row.painLevel}/10`} compact />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-4 text-sm leading-6 text-white/55">
                  No recent athlete logs were available for this report window.
                </Text>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <TrendingUp color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Continue Loop
                </Text>
              </View>
              <Text className="mt-4 text-sm leading-6 text-white/60">
                Keep logging daily load and recovery honestly so the next 28-day report stays
                trustworthy enough for real coaching decisions.
              </Text>

              <View className="mt-6 gap-3">
                <GlowingButtonNative
                  title="Weekly Review"
                  variant="chakra"
                  onPress={() => router.push('/athlete-review')}
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
