import { useEffect, useMemo, useRef, useState } from 'react'
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
  Activity,
  ArrowLeft,
  Brain,
  Camera,
  CheckCircle2,
  ChevronRight,
  HeartPulse,
  History,
  RefreshCcw,
  ShieldCheck,
  Target,
  Timer,
  Upload,
  Zap,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../neon/GlowingButtonNative'
import {
  ReviewMetricTile,
  ReviewSurfaceCard,
  ReviewTonePill,
} from '../review/ReviewPrimitives'
import { useMobileAuth } from '../../lib/auth'
import {
  fetchObjectiveTests,
  saveReactionTapSession,
  type MobileObjectiveCadenceDecision,
  type MobileObjectiveProtocol,
  type MobileObjectiveSession,
  type MobileObjectiveSignalSummary,
  type ObjectiveTestRole,
  type ObjectiveTestType,
} from '../../lib/mobile-api'

type TestPhase =
  | 'idle'
  | 'waiting'
  | 'active'
  | 'feedback'
  | 'false_start'
  | 'complete'

const REACTION_TAP_ACCEPTED_TRIALS = 5

type ReactionTapClassification = {
  label: string
  description: string
  tone: 'success' | 'info' | 'warning' | 'critical'
}

function formatMetric(value: number | null, unit = '', decimals = 0) {
  if (value === null || !Number.isFinite(value)) return 'Optional'
  const formatted =
    decimals > 0
      ? value
          .toFixed(decimals)
          .replace(/\.0+$/, '')
          .replace(/(\.\d*[1-9])0+$/, '$1')
      : Math.round(value).toString()
  return unit ? `${formatted}${unit}` : formatted
}

function formatSessionDate(value: string) {
  if (!value) return 'Unknown date'
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  })
}

function groupSessionsByProtocol(sessions: MobileObjectiveSession[]) {
  return sessions.reduce<Record<ObjectiveTestType, MobileObjectiveSession[]>>(
    (accumulator, session) => {
      const existing = accumulator[session.testType] || []
      existing.push(session)
      accumulator[session.testType] = existing.sort(
        (left, right) =>
          new Date(right.completedAt || 0).getTime() -
          new Date(left.completedAt || 0).getTime()
      )
      return accumulator
    },
    {} as Record<ObjectiveTestType, MobileObjectiveSession[]>
  )
}

function classifyReactionTapScore(scoreMs: number): ReactionTapClassification {
  if (scoreMs < 210) {
    return {
      label: 'Elite',
      description: 'Fast visual reaction with strong nervous-system sharpness.',
      tone: 'success',
    }
  }

  if (scoreMs < 250) {
    return {
      label: 'Sharp',
      description: 'Above-average response speed for a phone-based tap test.',
      tone: 'info',
    }
  }

  if (scoreMs < 310) {
    return {
      label: 'Stable',
      description: 'Within a normal range. Track this over time for trend direction.',
      tone: 'warning',
    }
  }

  return {
    label: 'Fatigued',
    description: 'Slower than ideal. Re-check after better sleep, recovery, or hydration.',
    tone: 'critical',
  }
}

function calculateReactionTapSummary(trials: number[]) {
  if (!trials.length) {
    throw new Error('Reaction summary requires at least one accepted trial.')
  }

  const averageScoreMs = Math.round(
    trials.reduce((sum, trial) => sum + trial, 0) / trials.length
  )
  const sorted = [...trials].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const validatedScoreMs =
    sorted.length % 2 === 0
      ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
      : sorted[middle]
  const bestScoreMs = sorted[0]
  const variance =
    trials.reduce((sum, trial) => sum + (trial - averageScoreMs) ** 2, 0) / trials.length
  const consistencyMs = Math.round(Math.sqrt(variance))

  return {
    averageScoreMs,
    validatedScoreMs,
    bestScoreMs,
    consistencyMs,
    classification: classifyReactionTapScore(validatedScoreMs),
  }
}

function getCadenceTone(state: MobileObjectiveCadenceDecision['state']) {
  if (state === 'recommended') return 'success' as const
  if (state === 'cooldown' || state === 'not_useful_now') return 'warning' as const
  if (state === 'unsafe_now' || state === 'replace_with_lower_load') return 'critical' as const
  return 'info' as const
}

function getFreshnessTone(
  freshness: MobileObjectiveSignalSummary['freshness'] | undefined
) {
  if (freshness === 'fresh') return 'success' as const
  if (freshness === 'stale') return 'warning' as const
  return 'neutral' as const
}

function getCaptureModeCopy(captureMode: MobileObjectiveProtocol['captureMode']) {
  if (captureMode === 'screen_tap') return 'Screen tap'
  if (captureMode === 'camera_pose_upload') return 'Camera upload'
  if (captureMode === 'camera_pose_live') return 'Live camera pose'
  if (captureMode === 'guided_timer_hr_optional') return 'Guided timer + optional HR'
  return 'Timed camera distance'
}

function CompactStat({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <View className="rounded-[24px] border border-white/5 bg-white/[0.03] px-4 py-4">
      <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
        {label}
      </Text>
      <Text className="mt-3 text-2xl font-black tracking-tight text-white">{value}</Text>
      <Text className="mt-2 text-sm leading-6 text-white/55">{detail}</Text>
    </View>
  )
}

function InfoList({
  title,
  items,
  warning = false,
}: {
  title: string
  items: string[]
  warning?: boolean
}) {
  return (
    <ReviewSurfaceCard>
      <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        {title}
      </Text>
      <View className="mt-4 gap-3">
        {items.map((item) => (
          <View key={item} className="flex-row items-start gap-3">
            <Text className={`mt-0.5 text-base ${warning ? 'text-[#FF5F1F]' : 'text-chakra-neon'}`}>
              •
            </Text>
            <Text className="flex-1 text-sm leading-6 text-white/60">{item}</Text>
          </View>
        ))}
      </View>
    </ReviewSurfaceCard>
  )
}

function MiniInfo({ title, value }: { title: string; value: string }) {
  return <ReviewMetricTile label={title} value={value} compact />
}

function HistoryStat({ label, value }: { label: string; value: string }) {
  return <ReviewMetricTile label={label} value={value} compact />
}

function ResultPanel({
  title,
  description,
  classification,
  classificationTone = 'neutral',
  metrics,
}: {
  title: string
  description: string
  classification: string | null
  classificationTone?: 'success' | 'info' | 'warning' | 'critical' | 'neutral'
  metrics: Array<{ label: string; value: string }>
}) {
  return (
    <ReviewSurfaceCard>
      <Text className="text-lg font-black tracking-tight text-white">{title}</Text>
      <Text className="mt-3 text-sm leading-6 text-white/60">{description}</Text>
      {classification ? (
        <View className="mt-4">
          <ReviewTonePill label={classification} tone={classificationTone} />
        </View>
      ) : null}
      {metrics.length ? (
        <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
          {metrics.map((metric) => (
            <View key={metric.label} className="w-[48%]">
              <ReviewMetricTile label={metric.label} value={metric.value} compact />
            </View>
          ))}
        </View>
      ) : null}
    </ReviewSurfaceCard>
  )
}

function ReactionProtocolRunner({
  accessToken,
  protocol,
  preferredSport,
  history,
  onSaved,
}: {
  accessToken: string
  protocol: MobileObjectiveProtocol
  preferredSport: string | null
  history: MobileObjectiveSession[]
  onSaved: () => Promise<void>
}) {
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [acceptedTrials, setAcceptedTrials] = useState<number[]>([])
  const [falseStarts, setFalseStarts] = useState(0)
  const [currentTrialMs, setCurrentTrialMs] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactionStartRef = useRef(0)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const summary = useMemo(() => {
    if (acceptedTrials.length < REACTION_TAP_ACCEPTED_TRIALS) return null
    return calculateReactionTapSummary(acceptedTrials)
  }, [acceptedTrials])

  const previousSession = history[0] || null
  const sessionDelta =
    summary && previousSession?.validatedScoreMs
      ? summary.validatedScoreMs - previousSession.validatedScoreMs
      : null

  function resetProtocol() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setPhase('idle')
    setAcceptedTrials([])
    setFalseStarts(0)
    setCurrentTrialMs(null)
    setSaveError(null)
    setSavedSessionId(null)
  }

  function startTrial() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setCurrentTrialMs(null)
    setSaveError(null)
    setPhase('waiting')
    timeoutRef.current = setTimeout(() => {
      reactionStartRef.current = Date.now()
      setPhase('active')
    }, Math.round(Math.random() * 2400 + 1800))
  }

  function handlePadTap() {
    if (phase === 'idle' || phase === 'feedback' || phase === 'false_start') {
      startTrial()
      return
    }

    if (phase === 'complete') {
      resetProtocol()
      return
    }

    if (phase === 'waiting') {
      setFalseStarts((current) => current + 1)
      setPhase('false_start')
      return
    }

    if (phase !== 'active') return

    const reactionMs = Math.max(0, Date.now() - reactionStartRef.current)
    const nextTrials = [...acceptedTrials, reactionMs]
    setAcceptedTrials(nextTrials)
    setCurrentTrialMs(reactionMs)

    if (nextTrials.length >= REACTION_TAP_ACCEPTED_TRIALS) {
      setPhase('complete')
      return
    }

    setPhase('feedback')
  }

  async function handleSave() {
    if (!summary || isSaving || savedSessionId) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await saveReactionTapSession(accessToken, {
        acceptedTrials,
        falseStartCount: falseStarts,
        sport: preferredSport,
        captureContext: {
          platform: 'expo_native',
        },
        metadata: {
          runner: 'mobile_native',
        },
      })

      setSavedSessionId(response.session.id)
      await onSaved()
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Failed to save the reaction tap session.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const padClass =
    phase === 'idle'
      ? 'border-white/10 bg-slate-950/70'
      : phase === 'waiting'
        ? 'border-red-400 bg-red-500/10'
        : phase === 'active'
          ? 'border-emerald-400 bg-emerald-500/25'
          : phase === 'false_start'
            ? 'border-red-400 bg-red-500/20'
            : phase === 'complete'
              ? 'border-[#FF5F1F]/50 bg-[#FF5F1F]/12'
              : 'border-cyan-400/40 bg-cyan-500/10'

  return (
    <View className="gap-5">
      <Pressable
        onPress={handlePadTap}
        className={`min-h-[320px] items-center justify-center rounded-[34px] border-4 px-6 ${padClass}`}
      >
        {phase === 'idle' ? (
          <>
            <Timer color="#64748B" size={64} />
            <Text className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-white/45">
              Tap to begin the protocol
            </Text>
            <Text className="mt-3 text-center text-sm leading-6 text-white/55">
              Five accepted trials are needed for one saved session.
            </Text>
          </>
        ) : null}

        {phase === 'waiting' ? (
          <>
            <Text className="text-[11px] font-bold uppercase tracking-[0.24em] text-red-100">
              Wait for green
            </Text>
            <Text className="mt-4 text-4xl font-black tracking-tight text-white">
              Hold...
            </Text>
          </>
        ) : null}

        {phase === 'active' ? (
          <>
            <Zap color="#FFFFFF" size={80} />
            <Text className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-50">
              Tap now
            </Text>
            <Text className="mt-4 text-4xl font-black tracking-tight text-white">GO</Text>
          </>
        ) : null}

        {phase === 'feedback' ? (
          <>
            <CheckCircle2 color="#93C5FD" size={64} />
            <Text className="mt-6 text-5xl font-black tracking-tight text-white">
              {currentTrialMs}ms
            </Text>
            <Text className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-100">
              Trial {acceptedTrials.length} accepted
            </Text>
            <Text className="mt-4 text-center text-sm leading-6 text-white/60">
              Tap again for the next trial.
            </Text>
          </>
        ) : null}

        {phase === 'false_start' ? (
          <>
            <Text className="text-[11px] font-bold uppercase tracking-[0.24em] text-red-100">
              False start
            </Text>
            <Text className="mt-4 text-4xl font-black tracking-tight text-white">
              Too early
            </Text>
            <Text className="mt-4 text-center text-sm leading-6 text-white/70">
              Tap again when you are ready to restart the trial.
            </Text>
          </>
        ) : null}

        {phase === 'complete' && summary ? (
          <>
            <CheckCircle2 color="#FF5F1F" size={64} />
            <Text className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-[#FF5F1F]">
              Validated result
            </Text>
            <Text className="mt-4 text-5xl font-black tracking-tight text-white">
              {summary.validatedScoreMs}ms
            </Text>
            <Text className="mt-3 text-center text-sm leading-6 text-white/70">
              {summary.classification.description}
            </Text>
            <Text className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
              Tap the pad to retest from the beginning
            </Text>
          </>
        ) : null}
      </Pressable>

      <View className="flex-row flex-wrap justify-between gap-y-3">
        <View className="w-[48%]">
          <HistoryStat
            label="Accepted"
            value={`${acceptedTrials.length}/${REACTION_TAP_ACCEPTED_TRIALS}`}
          />
        </View>
        <View className="w-[48%]">
          <HistoryStat label="False starts" value={`${falseStarts}`} />
        </View>
        <View className="w-[48%]">
          <HistoryStat
            label="Best tap"
            value={
              summary
                ? `${summary.bestScoreMs}ms`
                : currentTrialMs
                  ? `${currentTrialMs}ms`
                  : '--'
            }
          />
        </View>
        <View className="w-[48%]">
          <HistoryStat
            label="Consistency"
            value={summary ? `${summary.consistencyMs}ms` : '--'}
          />
        </View>
      </View>

      <ResultPanel
        title="Reaction result"
        description={
          summary
            ? summary.classification.description
            : 'Finish the five-tap protocol to generate a validated result and AI-assisted trend interpretation.'
        }
        classification={summary?.classification.label || null}
        classificationTone={summary?.classification.tone || 'neutral'}
        metrics={
          summary
            ? [
                { label: 'Validated', value: `${summary.validatedScoreMs}ms` },
                { label: 'Average', value: `${summary.averageScoreMs}ms` },
                {
                  label: 'Vs latest saved',
                  value:
                    sessionDelta === null
                      ? 'First live comparison'
                      : `${sessionDelta > 0 ? '+' : ''}${sessionDelta}ms`,
                },
              ]
            : []
        }
      />

      {saveError ? (
        <ReviewSurfaceCard>
          <Text className="text-sm leading-6 text-red-200">{saveError}</Text>
        </ReviewSurfaceCard>
      ) : null}

      <View className="gap-3">
        <GlowingButtonNative
          title={savedSessionId ? 'Saved To History' : 'Save Sharpness Session'}
          variant="chakra"
          onPress={() => {
            void handleSave()
          }}
          disabled={!summary || isSaving || Boolean(savedSessionId)}
        />
        <GlowingButtonNative
          title="Reset Protocol"
          variant="saffron"
          onPress={resetProtocol}
        />
      </View>
    </View>
  )
}

function UnsupportedProtocolRunner({
  protocol,
  signal,
  cadence,
}: {
  protocol: MobileObjectiveProtocol
  signal: MobileObjectiveSignalSummary | null
  cadence: MobileObjectiveCadenceDecision | null
}) {
  return (
    <View className="gap-5">
      <ReviewSurfaceCard>
        <View className="flex-row items-start gap-3">
          {protocol.captureMode === 'camera_pose_upload' ||
          protocol.captureMode === 'camera_pose_live' ? (
            <Camera color="#00E5FF" size={18} />
          ) : protocol.captureMode === 'guided_timer_hr_optional' ? (
            <HeartPulse color="#00E5FF" size={18} />
          ) : (
            <Upload color="#00E5FF" size={18} />
          )}
          <View className="flex-1">
            <Text className="text-lg font-black tracking-tight text-white">
              Native capture rollout in progress
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/60">
              Protocol metadata, cadence, and saved history are now visible in the mobile lab. Native execution for {protocol.displayName.toLowerCase()} is the next rollout.
            </Text>
          </View>
        </View>
      </ReviewSurfaceCard>

      <ResultPanel
        title="Latest signal"
        description={
          signal?.summary ||
          'No saved session yet for this protocol. Use the setup rules and cadence guidance to decide whether it is worth capturing.'
        }
        classification={signal?.classification || null}
        classificationTone={signal?.freshness === 'fresh' ? 'success' : 'warning'}
        metrics={
          signal
            ? [
                { label: 'Headline', value: signal.formattedHeadline },
                {
                  label: 'Freshness',
                  value: signal.freshness,
                },
                {
                  label: 'Confidence',
                  value: signal.confidenceScore ? `${Math.round(signal.confidenceScore * 100)}%` : '--',
                },
              ]
            : []
        }
      />

      {cadence ? (
        <ReviewSurfaceCard>
          <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Cadence guidance
          </Text>
          <View className="mt-4">
            <ReviewTonePill label={cadence.state.replaceAll('_', ' ')} tone={getCadenceTone(cadence.state)} />
          </View>
          <Text className="mt-4 text-sm leading-6 text-white/60">{cadence.reason}</Text>
        </ReviewSurfaceCard>
      ) : null}
    </View>
  )
}

export function ObjectiveTestingNativeLab({
  expectedRole,
}: {
  expectedRole: ObjectiveTestRole
}) {
  const router = useRouter()
  const { session, user } = useMobileAuth()
  const [selectedProtocolId, setSelectedProtocolId] =
    useState<ObjectiveTestType>('reaction_tap')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lab, setLab] = useState<{
    role: ObjectiveTestRole
    protocols: MobileObjectiveProtocol[]
    sessions: MobileObjectiveSession[]
    signals: MobileObjectiveSignalSummary[]
    cadence: MobileObjectiveCadenceDecision[]
  } | null>(null)

  async function loadLab(showRefreshState = false) {
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

      const response = await fetchObjectiveTests(session.access_token)
      setLab({
        role: response.lab.role,
        protocols: response.lab.protocols,
        sessions: response.lab.sessions,
        signals: response.lab.signals,
        cadence: response.lab.cadence,
      })
      setError(null)
    } catch (labError) {
      setError(
        labError instanceof Error
          ? labError.message
          : 'Failed to load objective tests.'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadLab()
  }, [session?.access_token])

  useEffect(() => {
    if (!lab?.protocols.length) return
    if (lab.protocols.some((protocol) => protocol.id === selectedProtocolId)) return
    setSelectedProtocolId(lab.protocols[0].id)
  }, [lab?.protocols, selectedProtocolId])

  const groupedSessions = useMemo(
    () => groupSessionsByProtocol(lab?.sessions || []),
    [lab?.sessions]
  )
  const signalByProtocol = useMemo(
    () =>
      new Map((lab?.signals || []).map((signal) => [signal.protocolId, signal])),
    [lab?.signals]
  )
  const cadenceByProtocol = useMemo(
    () =>
      new Map((lab?.cadence || []).map((decision) => [decision.protocolId, decision])),
    [lab?.cadence]
  )
  const selectedProtocol =
    lab?.protocols.find((protocol) => protocol.id === selectedProtocolId) ||
    lab?.protocols[0] ||
    null
  const selectedSignal = selectedProtocol
    ? signalByProtocol.get(selectedProtocol.id) || null
    : null
  const selectedCadence = selectedProtocol
    ? cadenceByProtocol.get(selectedProtocol.id) || null
    : null
  const selectedHistory = selectedProtocol
    ? groupedSessions[selectedProtocol.id] || []
    : []

  const dashboardHref = '/(tabs)'
  const loggingHref = expectedRole === 'athlete' ? '/check-in' : '/individual-log'
  const reviewHref =
    expectedRole === 'athlete' ? '/athlete-review' : '/individual-review'
  const title =
    expectedRole === 'athlete' ? 'Athlete Objective Tests' : 'Individual Objective Tests'
  const subtitle =
    expectedRole === 'athlete'
      ? 'Measured signals without expensive hardware'
      : 'Measured signals to sharpen your individual plan'

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== expectedRole) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Objective testing is role-specific
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This route matches the {expectedRole} objective test lab, and your current mobile role is {user.profile.role}.
        </Text>
      </View>
    )
  }

  if (loading && !lab) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <ActivityIndicator color="#FF5F1F" size="large" />
        <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
          Loading the objective test lab...
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
              void loadLab(true)
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
            {title}
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            {subtitle}
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            The mobile lab now reads the same protocol catalog, cadence logic, and saved-session history that power the web objective test experience.
          </Text>
        </View>

        {error ? (
          <ReviewSurfaceCard>
            <Text className="text-sm leading-6 text-red-200">{error}</Text>
          </ReviewSurfaceCard>
        ) : null}

        {lab ? (
          <>
            <ReviewSurfaceCard watermark="LAB">
              <View className="rounded-full border border-[#FF5F1F]/20 bg-[#FF5F1F]/10 self-start px-4 py-2">
                <View className="flex-row items-center gap-2">
                  <Brain color="#FF5F1F" size={14} />
                  <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5F1F]">
                    AI-powered objective testing
                  </Text>
                </View>
              </View>

              <Text className="mt-6 text-3xl font-black tracking-tight text-white">
                Measured signals without expensive hardware.
              </Text>
              <Text className="mt-4 text-sm leading-6 text-white/60">
                CREEDA runs optional testing across sharpness, balance, recovery, landing control, mobility, and speed workflows. Only clean, recent, high-confidence signals should influence the decision layer.
              </Text>

              <View className="mt-6 gap-3">
                <CompactStat
                  label="Protocols"
                  value={`${lab.protocols.length} active`}
                  detail="Built as one shared platform, not a pile of one-off tests."
                />
                <CompactStat
                  label="Measured signals"
                  value={lab.signals.length ? `${lab.signals.length}` : 'None yet'}
                  detail="Fresh, valid signals show up here and later feed dashboards and reviews."
                />
                <CompactStat
                  label="Current focus"
                  value={selectedSignal?.displayName || selectedProtocol?.displayName || 'Choose a protocol'}
                  detail={
                    selectedSignal?.summary ||
                    'Select a protocol to see setup, cadence, and recent history.'
                  }
                />
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <Target color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Protocol Hub
                </Text>
              </View>

              <View className="mt-6 gap-3">
                {lab.protocols.map((protocol) => {
                  const cadence = cadenceByProtocol.get(protocol.id) || null
                  const signal = signalByProtocol.get(protocol.id) || null
                  const selected = protocol.id === selectedProtocolId

                  return (
                    <Pressable
                      key={protocol.id}
                      onPress={() => setSelectedProtocolId(protocol.id)}
                      className={`rounded-[28px] border p-4 ${
                        selected
                          ? 'border-[#FF5F1F]/40 bg-[#FF5F1F]/10'
                          : 'border-white/5 bg-white/[0.03]'
                      }`}
                    >
                      <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="text-sm font-black tracking-tight text-white">
                              {protocol.displayName}
                            </Text>
                            <ReviewTonePill
                              label={protocol.analysisMode.replaceAll('_', ' ')}
                              tone="neutral"
                            />
                          </View>
                          <Text className="mt-2 text-sm leading-6 text-white/55">
                            {protocol.shortDescription}
                          </Text>
                        </View>
                        <ChevronRight color="rgba(255,255,255,0.35)" size={16} />
                      </View>

                      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
                        <View className="w-[31%]">
                          <MiniInfo
                            title="Duration"
                            value={`${protocol.estimatedDurationMinutes} min`}
                          />
                        </View>
                        <View className="w-[31%]">
                          <MiniInfo
                            title="Load"
                            value={protocol.estimatedLoad.replaceAll('_', ' ')}
                          />
                        </View>
                        <View className="w-[31%]">
                          <MiniInfo
                            title="Last signal"
                            value={signal?.formattedHeadline || 'None'}
                          />
                        </View>
                      </View>

                      <View className="mt-4 flex-row flex-wrap gap-2">
                        {cadence ? (
                          <ReviewTonePill
                            label={cadence.state.replaceAll('_', ' ')}
                            tone={getCadenceTone(cadence.state)}
                          />
                        ) : null}
                        {signal ? (
                          <ReviewTonePill
                            label={signal.freshness}
                            tone={getFreshnessTone(signal.freshness)}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </ReviewSurfaceCard>

            {selectedProtocol ? (
              <ReviewSurfaceCard>
                <View className="flex-row flex-wrap items-start justify-between gap-4">
                  <View className="flex-1">
                    <ReviewTonePill label={selectedProtocol.heroLabel} tone="info" />
                    <Text className="mt-4 text-3xl font-black tracking-tight text-white">
                      {selectedProtocol.displayName}
                    </Text>
                    <Text className="mt-3 text-sm leading-6 text-white/60">
                      {selectedProtocol.shortDescription}
                    </Text>
                  </View>
                  <View className="min-w-[220px] rounded-[28px] border border-white/5 bg-white/[0.03] p-4">
                    <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                      Latest signal
                    </Text>
                    <Text className="mt-3 text-2xl font-black tracking-tight text-white">
                      {selectedSignal?.formattedHeadline || 'Optional'}
                    </Text>
                    <Text className="mt-2 text-sm leading-6 text-white/55">
                      {selectedSignal?.summary || 'No saved session yet for this protocol.'}
                    </Text>
                  </View>
                </View>

                <View className="mt-6 gap-2">
                  <InfoList title="When useful" items={selectedProtocol.whenUseful} />
                  <InfoList title="When to skip" items={selectedProtocol.whenToSkip} warning />
                  <InfoList title="AI setup rules" items={selectedProtocol.setupChecklist} />
                </View>

                <View className="mt-2 flex-row flex-wrap justify-between gap-y-3">
                  <View className="w-[31%]">
                    <MiniInfo
                      title="Capture mode"
                      value={getCaptureModeCopy(selectedProtocol.captureMode)}
                    />
                  </View>
                  <View className="w-[31%]">
                    <MiniInfo
                      title="Estimated load"
                      value={selectedProtocol.estimatedLoad.replaceAll('_', ' ')}
                    />
                  </View>
                  <View className="w-[31%]">
                    <MiniInfo
                      title="History"
                      value={selectedHistory.length ? `${selectedHistory.length} saved` : 'No saved sessions'}
                    />
                  </View>
                </View>

                <View className="mt-6">
                  {selectedProtocol.id === 'reaction_tap' ? (
                    <ReactionProtocolRunner
                      accessToken={session.access_token}
                      protocol={selectedProtocol}
                      preferredSport={user?.profile.primarySport || null}
                      history={selectedHistory}
                      onSaved={async () => {
                        await loadLab(true)
                      }}
                    />
                  ) : (
                    <UnsupportedProtocolRunner
                      protocol={selectedProtocol}
                      signal={selectedSignal}
                      cadence={selectedCadence}
                    />
                  )}
                </View>
              </ReviewSurfaceCard>
            ) : null}

            <ReviewSurfaceCard>
              <View className="flex-row items-center gap-2">
                <History color="#00E5FF" size={16} />
                <Text className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
                  Recent Sessions
                </Text>
              </View>

              <View className="mt-6 gap-3">
                {selectedHistory.length === 0 ? (
                  <ReviewSurfaceCard>
                    <Text className="text-sm leading-6 text-white/55">
                      No saved {selectedProtocol?.displayName.toLowerCase()} sessions yet. The first session will appear here with headline metric, confidence, and quality notes.
                    </Text>
                  </ReviewSurfaceCard>
                ) : (
                  selectedHistory.slice(0, 6).map((sessionItem) => (
                    <View
                      key={sessionItem.id}
                      className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
                    >
                      <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1">
                          <Text className="text-sm font-black tracking-tight text-white">
                            {formatMetric(
                              sessionItem.headlineMetricValue ?? sessionItem.validatedScoreMs,
                              sessionItem.headlineMetricUnit ||
                                (sessionItem.validatedScoreMs ? 'ms' : ''),
                              sessionItem.headlineMetricUnit === 'bw/s' ? 2 : 0
                            )}
                          </Text>
                          <Text className="mt-1 text-[11px] text-white/40">
                            {formatSessionDate(sessionItem.completedAt)} • {sessionItem.classification || 'Unclassified'}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                            Confidence
                          </Text>
                          <Text className="mt-1 text-sm font-black tracking-tight text-white">
                            {sessionItem.confidenceScore
                              ? `${Math.round(sessionItem.confidenceScore * 100)}%`
                              : '--'}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
                        <View className="w-[31%]">
                          <HistoryStat
                            label="Quality"
                            value={
                              sessionItem.captureQualityScore
                                ? `${Math.round(sessionItem.captureQualityScore * 100)}%`
                                : '--'
                            }
                          />
                        </View>
                        <View className="w-[31%]">
                          <HistoryStat
                            label="Validity"
                            value={sessionItem.validityStatus.replaceAll('_', ' ')}
                          />
                        </View>
                        <View className="w-[31%]">
                          <HistoryStat
                            label="Samples"
                            value={`${sessionItem.sampleCount || sessionItem.trialResults.length || '--'}`}
                          />
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ReviewSurfaceCard>

            <ReviewSurfaceCard>
              <View className="gap-3">
                <GlowingButtonNative
                  title="Daily Check-In"
                  variant="chakra"
                  onPress={() => router.push(loggingHref)}
                />
                <GlowingButtonNative
                  title="Weekly Review"
                  variant="chakra"
                  onPress={() => router.push(reviewHref)}
                />
                <GlowingButtonNative
                  title="Back To Home"
                  variant="saffron"
                  onPress={() => router.replace(dashboardHref)}
                />
              </View>
            </ReviewSurfaceCard>
          </>
        ) : null}
      </ScrollView>
    </View>
  )
}
