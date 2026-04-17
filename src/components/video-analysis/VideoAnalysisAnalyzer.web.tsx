import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import * as Linking from 'expo-linking'
import { ArrowLeft, ExternalLink, Video } from 'lucide-react-native'

import { GlowingButtonNative } from '../neon/GlowingButtonNative'
import { useMobileAuth } from '../../lib/auth'
import { mobileEnv } from '../../lib/env'
import type { AppRole } from '../../lib/mobile-api'

function normalizeSportParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
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

  const targetUrl = `${mobileEnv.apiBaseUrl}/${expectedRole}/scan/analyze?sport=${encodeURIComponent(
    sport || 'other'
  )}`

  useEffect(() => {
    void Linking.openURL(targetUrl)
  }, [targetUrl])

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

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <Pressable onPress={() => router.back()} className="mb-6 flex-row items-center gap-3">
        <ArrowLeft color="#FF5F1F" size={18} />
        <Text className="text-sm font-semibold text-white/60">Back</Text>
      </Pressable>

      <View className="items-center">
        <View className="rounded-2xl border border-white/5 bg-white/[0.04] p-3">
          <Video color="#FF5F1F" size={18} />
        </View>
        <Text className="mt-5 text-center text-3xl font-black tracking-tight text-white">
          Opening exact web analyzer
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          The mobile web export launches the same CREEDA analyzer in the browser while native builds
          keep it inside the app.
        </Text>

        <View className="mt-6 w-full gap-3">
          <GlowingButtonNative
            title="Open Analyzer"
            variant="chakra"
            onPress={() => {
              void Linking.openURL(targetUrl)
            }}
            icon={<ExternalLink color="#00E5FF" size={16} />}
          />
          <GlowingButtonNative
            title="Back To Scan Hub"
            variant="saffron"
            onPress={() =>
              router.replace(expectedRole === 'individual' ? '/individual-scan' : '/athlete-scan')
            }
          />
        </View>
      </View>
    </View>
  )
}
