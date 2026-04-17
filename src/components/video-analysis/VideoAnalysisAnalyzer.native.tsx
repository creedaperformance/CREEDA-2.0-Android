import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import {
  ArrowLeft,
  ExternalLink,
  Video,
} from 'lucide-react-native'
import { WebView } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'

import { GlowingButtonNative } from '../neon/GlowingButtonNative'
import { useMobileAuth } from '../../lib/auth'
import { mobileEnv } from '../../lib/env'
import type { AppRole } from '../../lib/mobile-api'

function normalizeSportParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

function getNativeReportRoute(role: AppRole, reportId: string) {
  if (role === 'individual') return `/individual-scan-report/${reportId}`
  if (role === 'coach') return `/coach-report/${reportId}`
  return `/athlete-scan-report/${reportId}`
}

function getHubRoute(role: AppRole) {
  if (role === 'individual') return '/individual-scan'
  if (role === 'coach') return '/coach-reports'
  return '/athlete-scan'
}

function extractReportId(url: string, role: AppRole) {
  try {
    const parsed = new URL(url)
    const pattern =
      role === 'individual'
        ? /^\/individual\/scan\/report\/([^/]+)$/
        : role === 'coach'
          ? /^\/coach\/reports\/([^/]+)$/
          : /^\/athlete\/scan\/report\/([^/]+)$/
    const match = parsed.pathname.match(pattern)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

export function VideoAnalysisAnalyzer({
  expectedRole,
}: {
  expectedRole: AppRole
}) {
  const router = useRouter()
  const params = useLocalSearchParams<{ sport?: string | string[] }>()
  const sport = normalizeSportParam(params.sport)
  const { session, user } = useMobileAuth()
  const [loadingLabel, setLoadingLabel] = useState('Preparing secure analyzer session...')
  const [webError, setWebError] = useState<string | null>(null)

  const nextPath = useMemo(() => {
    const encodedSport = encodeURIComponent(sport || 'other')
    return `/${expectedRole}/scan/analyze?sport=${encodedSport}`
  }, [expectedRole, sport])

  const analyzerSource = useMemo(() => {
    if (!session?.access_token || !session.refresh_token) return null

    return {
      uri: `${mobileEnv.apiBaseUrl}/api/mobile/web-session`,
      method: 'POST' as const,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Accept: 'text/html,application/json',
      },
      body: JSON.stringify({
        refreshToken: session.refresh_token,
        nextPath,
      }),
    }
  }, [nextPath, session?.access_token, session?.refresh_token])

  function handleIntercept(request: ShouldStartLoadRequest) {
    const reportId = extractReportId(request.url, expectedRole)
    if (reportId) {
      router.replace(getNativeReportRoute(expectedRole, reportId))
      return false
    }

    return true
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== expectedRole) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Analyzer access is role-locked
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          Your current mobile role is {user.profile.role}, so this analyzer is unavailable for this
          account.
        </Text>
      </View>
    )
  }

  if (!analyzerSource) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Analyzer session unavailable
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          CREEDA could not build the secure web analyzer session from your mobile auth state.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pb-4 pt-16">
        <Pressable onPress={() => router.back()} className="mb-6 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="flex-row items-start gap-3">
          <View className="mt-1 rounded-2xl border border-white/5 bg-white/[0.04] p-2">
            <Video color="#FF5F1F" size={16} />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-[0.22em] text-chakra-neon">
              Exact Web Analyzer
            </Text>
            <Text className="mt-2 text-3xl font-black tracking-tight text-white">
              In-app scan workspace
            </Text>
            <Text className="mt-3 text-sm leading-6 text-white/55">
              This is the same CREEDA scan analyzer from the web app, now running inside the mobile
              app with a secure bridged session.
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 overflow-hidden border-t border-white/5 bg-black">
        <WebView
          source={analyzerSource}
          originWhitelist={['*']}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState
          onShouldStartLoadWithRequest={handleIntercept}
          onNavigationStateChange={(state) => {
            if (state.loading) {
              setLoadingLabel('Loading analyzer workspace...')
              return
            }

            setLoadingLabel('Finalizing video analysis workspace...')
          }}
          onHttpError={(event) => {
            setWebError(`Analyzer request failed with status ${event.nativeEvent.statusCode}.`)
          }}
          onError={(event) => {
            setWebError(event.nativeEvent.description || 'The analyzer could not load in-app.')
          }}
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-background px-8">
              <ActivityIndicator color="#FF5F1F" size="large" />
              <Text className="mt-4 text-center text-sm font-semibold tracking-wide text-white/70">
                {loadingLabel}
              </Text>
            </View>
          )}
        />
      </View>

      {webError ? (
        <View className="border-t border-white/5 bg-background px-6 py-5">
          <Text className="text-sm leading-6 text-red-200">{webError}</Text>
          <View className="mt-4 gap-3">
            <GlowingButtonNative
              title="Back To Scan Hub"
              variant="chakra"
              onPress={() => router.replace(getHubRoute(expectedRole))}
            />
            <GlowingButtonNative
              title="Back To Home"
              variant="saffron"
              onPress={() => router.replace('/(tabs)')}
              icon={<ExternalLink color="#FF5F1F" size={16} />}
            />
          </View>
        </View>
      ) : null}
    </View>
  )
}
