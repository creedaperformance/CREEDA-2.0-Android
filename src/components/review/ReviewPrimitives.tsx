import type { ComponentType, ReactNode } from 'react'
import { Text, View } from 'react-native'

type IconComponent = ComponentType<{
  color?: string
  size?: number
}>

type Tone = 'critical' | 'warning' | 'build' | 'success' | 'info' | 'neutral'

function getToneClasses(tone: Tone) {
  switch (tone) {
    case 'critical':
      return {
        container: 'border-red-400/30 bg-red-400/10',
        text: 'text-red-200',
      }
    case 'warning':
      return {
        container: 'border-orange-400/30 bg-orange-400/10',
        text: 'text-orange-200',
      }
    case 'build':
      return {
        container: 'border-violet-400/30 bg-violet-400/10',
        text: 'text-violet-200',
      }
    case 'success':
      return {
        container: 'border-emerald-400/30 bg-emerald-400/10',
        text: 'text-emerald-200',
      }
    case 'info':
      return {
        container: 'border-cyan-400/30 bg-cyan-400/10',
        text: 'text-cyan-200',
      }
    default:
      return {
        container: 'border-white/10 bg-white/[0.04]',
        text: 'text-white/70',
      }
  }
}

function getMetricStatusTone(status: string): Tone {
  if (status === 'elite') return 'success'
  if (status === 'strong') return 'info'
  if (status === 'building') return 'warning'
  if (status === 'fragile') return 'critical'
  return 'neutral'
}

export function ReviewSurfaceCard({
  children,
  watermark,
}: {
  children: ReactNode
  watermark?: string
}) {
  return (
    <View className="my-2 overflow-hidden rounded-3xl border border-white/5 bg-background-glass p-6 relative">
      <View className="absolute -top-[45%] -left-[20%] h-[150%] w-[150%] rounded-full bg-[#FF5F1F] opacity-[0.03] blur-[50px] pointer-events-none" />
      {watermark ? (
        <Text className="absolute right-4 top-4 text-7xl font-black tracking-tighter text-white/[0.02]">
          {watermark}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

export function ReviewBadgeChip({
  icon: Icon,
  text,
  color = '#00E5FF',
}: {
  icon: IconComponent
  text: string
  color?: string
}) {
  return (
    <View className="flex-row items-center gap-2 rounded-full border border-white/5 bg-white/[0.04] px-3 py-2">
      <Icon color={color} size={14} />
      <Text className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
        {text}
      </Text>
    </View>
  )
}

export function ReviewMetricTile({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <View
      className={`rounded-[22px] border border-white/5 bg-white/[0.04] ${
        compact ? 'px-4 py-4' : 'px-4 py-5'
      }`}
    >
      <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
        {label}
      </Text>
      <Text
        className={`mt-3 font-black tracking-tight text-white ${
          compact ? 'text-2xl' : 'text-3xl'
        }`}
      >
        {value}
      </Text>
    </View>
  )
}

export function ReviewInsightCard({
  icon: Icon,
  eyebrow,
  title,
  body,
  color = '#FF5F1F',
}: {
  icon: IconComponent
  eyebrow: string
  title: string
  body: string
  color?: string
}) {
  return (
    <ReviewSurfaceCard>
      <View className="flex-row items-start gap-3">
        <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
          <Icon color={color} size={16} />
        </View>
        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
            {eyebrow}
          </Text>
          <Text className="mt-2 text-lg font-black tracking-tight text-white">
            {title}
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/60">{body}</Text>
        </View>
      </View>
    </ReviewSurfaceCard>
  )
}

export function ReviewTrendPanel({
  points,
  loadCaption = true,
}: {
  points: Array<{
    date: string
    label: string
    readinessScore: number
    loadMinutes?: number
  }>
  loadCaption?: boolean
}) {
  return (
    <View className="mt-6 flex-row items-end justify-between gap-2">
      {points.map((point) => (
        <View key={point.date} className="flex-1 rounded-[22px] border border-white/5 bg-white/[0.03] px-2 py-3">
          <Text className="text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
            {point.label}
          </Text>
          <View className="mt-4 h-28 items-center justify-end">
            <View className="h-full w-full items-center justify-end rounded-full bg-white/[0.04] px-2 py-2">
              <View
                className="w-full rounded-full bg-[#FF7A3C]"
                style={{ height: `${Math.max(12, Math.round(point.readinessScore))}%` }}
              />
            </View>
          </View>
          <Text className="mt-3 text-center text-xl font-black tracking-tight text-white">
            {point.readinessScore}
          </Text>
          {loadCaption ? (
            <Text className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white/30">
              {(point.loadMinutes || 0).toString()} min
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

export function ReviewIdentityMetricList({
  metrics,
  squadContext = false,
}: {
  metrics: Array<{
    key: string
    label: string
    score: number | null
    status: string
    summary: string
    nextAction: string
    athleteCount?: number
    flaggedCount?: number
  }>
  squadContext?: boolean
}) {
  return (
    <View className="mt-6 gap-3">
      {metrics.map((metric) => (
        <View
          key={metric.key}
          className="rounded-[24px] border border-white/5 bg-white/[0.03] p-4"
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-black tracking-tight text-white">
                {metric.label}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-white/60">
                {metric.summary}
              </Text>
            </View>
            <View className="items-end">
              <ReviewTonePill
                label={metric.status}
                tone={getMetricStatusTone(metric.status)}
              />
              <Text className="mt-3 text-2xl font-black tracking-tight text-white">
                {metric.score === null ? 'N/A' : `${metric.score}`}
              </Text>
            </View>
          </View>
          {squadContext &&
          typeof metric.athleteCount === 'number' &&
          typeof metric.flaggedCount === 'number' ? (
            <Text className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
              {metric.athleteCount} athletes - {metric.flaggedCount} flagged
            </Text>
          ) : null}
          <Text className="mt-3 text-sm leading-6 text-chakra-neon">
            {metric.nextAction}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function ReviewTonePill({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: Tone
}) {
  const toneClasses = getToneClasses(tone)

  return (
    <View className={`rounded-full border px-3 py-1.5 ${toneClasses.container}`}>
      <Text
        className={`text-[10px] font-bold uppercase tracking-[0.18em] ${toneClasses.text}`}
      >
        {label}
      </Text>
    </View>
  )
}

export function ReviewEmptyState({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <ReviewSurfaceCard>
      <Text className="text-lg font-bold text-white">{title}</Text>
      <Text className="mt-3 text-sm leading-6 text-white/55">{body}</Text>
    </ReviewSurfaceCard>
  )
}
