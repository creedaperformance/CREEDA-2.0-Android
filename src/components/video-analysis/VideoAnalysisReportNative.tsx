import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Info,
  ShieldCheck,
  Target,
  Video,
  Zap,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../neon/GlowingButtonNative'
import { ProfileAvatarNative } from '../profile/ProfileAvatarNative'
import {
  ReviewEmptyState,
  ReviewMetricTile,
  ReviewSurfaceCard,
  ReviewTonePill,
} from '../review/ReviewPrimitives'
import { useMobileAuth } from '../../lib/auth'
import { mobileEnv } from '../../lib/env'
import {
  fetchMobileVideoAnalysisReport,
  type AppRole,
  type MobileVideoAnalysisReport,
} from '../../lib/mobile-api'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatFeedbackTimestamp(timestampMs?: number) {
  if (typeof timestampMs !== 'number') return null
  return `${Math.floor(timestampMs / 1000)}.${String(timestampMs % 1000).padStart(3, '0')}s`
}

function getStatusTone(status: MobileVideoAnalysisReport['summary']['status']) {
  if (status === 'clean') return 'success' as const
  if (status === 'watch') return 'warning' as const
  return 'critical' as const
}

function getPriorityTone(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'critical' as const
  if (priority === 'medium') return 'warning' as const
  return 'info' as const
}

function getSeverityTone(severity: 'high' | 'moderate' | 'low') {
  if (severity === 'high') return 'critical' as const
  if (severity === 'moderate') return 'warning' as const
  return 'info' as const
}

function getWebReportPath(role: AppRole, reportId: string) {
  if (role === 'coach') return `/coach/reports/${reportId}`
  if (role === 'individual') return `/individual/scan/report/${reportId}`
  return `/athlete/scan/report/${reportId}`
}

export function VideoAnalysisReportNative({
  expectedRole,
  scanRoute,
}: {
  expectedRole: AppRole
  scanRoute: string
}) {
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const reportId = Array.isArray(params.id) ? params.id[0] : params.id
  const { session, user } = useMobileAuth()
  const [report, setReport] = useState<MobileVideoAnalysisReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [webError, setWebError] = useState<string | null>(null)

  async function loadReport(showRefreshState = false) {
    if (!session?.access_token || !reportId) {
      setLoading(false)
      if (!reportId) setError('Missing video report id.')
      return
    }

    try {
      if (showRefreshState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetchMobileVideoAnalysisReport(session.access_token, reportId)
      setReport(response.report)
      setError(null)
    } catch (reportError) {
      setError(
        reportError instanceof Error
          ? reportError.message
          : 'Failed to load the video analysis report.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadReport()
  }, [reportId, session?.access_token])

  const pageTitle = useMemo(() => {
    if (expectedRole === 'coach') return 'Coach report detail'
    if (expectedRole === 'individual') return 'Movement report detail'
    return 'Athlete report detail'
  }, [expectedRole])

  const pageSubtitle = useMemo(() => {
    if (expectedRole === 'coach') {
      return 'The same biomechanical action plan the coach web app uses, now available natively in Expo.'
    }

    return 'The same scan report summary, fault trace, and correction plan now rendered natively in mobile.'
  }, [expectedRole])

  async function openWebReport() {
    if (!reportId) return

    try {
      setWebError(null)
      await Linking.openURL(`${mobileEnv.apiBaseUrl}${getWebReportPath(expectedRole, reportId)}`)
    } catch (linkError) {
      setWebError(
        linkError instanceof Error
          ? linkError.message
          : 'Could not open the browser version of this report.'
      )
    }
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== expectedRole) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          This report route is role-locked
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your current mobile role is {user.profile.role}, so this video report route is not
          available for this account.
        </Text>
      </View>
    )
  }

  if (loading && !report && !error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading video report detail...
        </Text>
      </View>
    )
  }

  const totalEvents = report ? report.positive + report.warnings : 0
  const subjectName = report?.athleteName || (expectedRole === 'coach' ? 'Athlete' : null)

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
            {pageTitle}
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Video analysis action plan
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">{pageSubtitle}</Text>
        </View>

        {error ? <ReviewEmptyState title="Report unavailable" body={error} /> : null}

        {!error && !report ? (
          <ReviewEmptyState
            title="No video report found"
            body="This scan report is missing, or your mobile account no longer has access to it."
          />
        ) : null}

        {report ? (
          <>
            <ReviewSurfaceCard watermark="REP">
              {subjectName ? (
                <View className="mb-5 flex-row items-center gap-4">
                  <ProfileAvatarNative
                    uri={report.athleteAvatarUrl}
                    name={subjectName}
                    size={56}
                  />
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                      {subjectName}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-white/60">
                      {report.sportLabel} • {formatDate(report.createdAt)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  {report.sportLabel} • {formatDate(report.createdAt)}
                </Text>
              )}

              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-5xl font-black tracking-tight text-white">
                    {report.summary.score}%
                  </Text>
                  <Text className="mt-3 text-base leading-7 text-white/75">
                    {report.summary.headline}
                  </Text>
                </View>

                <View className="items-end gap-2">
                  <ReviewTonePill
                    label={report.summary.status}
                    tone={getStatusTone(report.summary.status)}
                  />
                  <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                    {report.analyzerFamily.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>

              <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
                <View className="w-[48%]">
                  <ReviewMetricTile label="Frames" value={`${report.frameCount}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Corrections" value={`${report.warnings}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Positive reads" value={`${report.positive}`} compact />
                </View>
                <View className="w-[48%]">
                  <ReviewMetricTile label="Tracked events" value={`${totalEvents}`} compact />
                </View>
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Target color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Coach Summary
                </Text>
              </View>
              <Text className="mt-4 text-sm leading-6 text-white/65">
                {report.summary.coachSummary}
              </Text>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Zap color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Recommended Corrections
                </Text>
              </View>

              {report.recommendations.length ? (
                <View className="mt-5 gap-3">
                  {report.recommendations.map((recommendation) => (
                    <View
                      key={`${recommendation.title}-${recommendation.priority}`}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-lg font-black tracking-tight text-white">
                            {recommendation.title}
                          </Text>
                          <Text className="mt-3 text-sm leading-6 text-white/60">
                            {recommendation.reason}
                          </Text>
                        </View>
                        <ReviewTonePill
                          label={recommendation.priority}
                          tone={getPriorityTone(recommendation.priority)}
                        />
                      </View>

                      {recommendation.drills.length ? (
                        <View className="mt-4 gap-2">
                          {recommendation.drills.map((drill) => (
                            <View key={drill} className="flex-row items-start gap-3">
                              <ShieldCheck color="#00E5FF" size={14} style={{ marginTop: 4 }} />
                              <Text className="flex-1 text-sm leading-6 text-white/60">
                                {drill}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="mt-5 rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <Text className="text-lg font-black tracking-tight text-emerald-100">
                    Stable pattern detected
                  </Text>
                  <Text className="mt-3 text-sm leading-6 text-emerald-100/70">
                    No major technical deviations were detected in this clip. Save it as your
                    current movement reference.
                  </Text>
                </View>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <AlertTriangle color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Fault Trace
                </Text>
              </View>

              {report.visionFaults.length ? (
                <View className="mt-5 gap-3">
                  {report.visionFaults.map((fault) => (
                    <View
                      key={`${fault.fault}-${fault.timestamp || fault.riskMapping}`}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <Text className="flex-1 text-base font-black tracking-tight text-white">
                          {fault.fault}
                        </Text>
                        <ReviewTonePill
                          label={fault.severity}
                          tone={getSeverityTone(fault.severity)}
                        />
                      </View>
                      <Text className="mt-3 text-sm leading-6 text-white/60">
                        {fault.riskMapping}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-4 text-sm leading-6 text-white/55">
                  No structured fault rows were stored for this report.
                </Text>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Info color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Feedback Log
                </Text>
              </View>

              {report.feedbackLog.length ? (
                <View className="mt-5 gap-3">
                  {report.feedbackLog.map((event, index) => (
                    <View
                      key={`${event.message}-${index}`}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`mt-2 h-2.5 w-2.5 rounded-full ${
                            event.isError ? 'bg-red-400' : 'bg-emerald-400'
                          }`}
                        />
                        <View className="flex-1">
                          <Text
                            className={`text-sm leading-6 ${
                              event.isError ? 'text-red-100' : 'text-emerald-100'
                            }`}
                          >
                            {event.message}
                          </Text>
                          {formatFeedbackTimestamp(event.timestampMs) ? (
                            <Text className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                              {formatFeedbackTimestamp(event.timestampMs)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-4 text-sm leading-6 text-white/55">
                  No feedback events were stored for this report.
                </Text>
              )}
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Video color="#FF5F1F" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                  Action Loop
                </Text>
              </View>
              <Text className="mt-4 text-sm leading-6 text-white/60">
                Use this report to adjust drill emphasis, reduce chaos if high-severity faults are
                active, then re-scan once the pattern stabilizes.
              </Text>

              <View className="mt-6 gap-3">
                <GlowingButtonNative
                  title={expectedRole === 'coach' ? 'Back To Report Feed' : 'Back To Scan Hub'}
                  variant="chakra"
                  onPress={() => router.replace(scanRoute)}
                />
                <GlowingButtonNative
                  title="Back To Home"
                  variant="saffron"
                  onPress={() => router.replace('/(tabs)')}
                />
              </View>

              <Pressable
                onPress={() => {
                  void openWebReport()
                }}
                className="mt-5 flex-row items-center justify-center gap-2"
              >
                <ExternalLink color="#94A3B8" size={14} />
                <Text className="text-sm font-semibold text-white/55">Open exact web report</Text>
              </Pressable>
              {webError ? (
                <Text className="mt-3 text-center text-sm leading-6 text-red-200">{webError}</Text>
              ) : null}
            </ReviewSurfaceCard>
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
