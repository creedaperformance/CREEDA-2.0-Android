import { Pressable, ScrollView, Text, View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import {
  AlertCircle,
  ArrowLeft,
  Dumbbell,
  Sparkles,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import { ReviewSurfaceCard } from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'

export default function AthletePlanGenerateScreen() {
  const router = useRouter()
  const { session, user } = useMobileAuth()

  if (!session) {
    return <Redirect href="/login" />
  }

  if (user && user.profile.role !== 'athlete') {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-xl font-black tracking-tight text-white">
          Athlete plans are athlete-only
        </Text>
        <Text className="mt-4 text-center text-sm leading-6 text-white/55">
          This route matches the current web plan-generation placeholder, and your mobile role is {user.profile.role}.
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120, paddingTop: 64 }}>
        <Pressable onPress={() => router.back()} className="mb-8 flex-row items-center gap-3">
          <ArrowLeft color="#FF5F1F" size={18} />
          <Text className="text-sm font-semibold text-white/60">Back</Text>
        </Pressable>

        <View className="mb-8 flex-row items-center justify-end">
          <View className="flex-row items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <Sparkles color="#FF5F1F" size={14} />
            <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/75">
              Creeda Pro
            </Text>
          </View>
        </View>

        <ReviewSurfaceCard watermark="P3">
          <View className="items-center">
            <View className="h-24 w-24 items-center justify-center rounded-[28px] border border-[#FF5F1F]/30 bg-[#FF5F1F]/10">
              <Dumbbell color="#FF5F1F" size={38} />
            </View>

            <Text className="mt-8 text-center text-3xl font-black tracking-tight text-white">
              Smart Training Plans{'\n'}Coming in Phase 3
            </Text>
            <Text className="mt-4 text-center text-sm leading-6 text-white/60">
              Our V4 intelligence engine is still processing the plan-generation integrations. Personalized generation will unlock shortly.
            </Text>
          </View>
        </ReviewSurfaceCard>

        <ReviewSurfaceCard>
          <View className="flex-row items-start gap-3">
            <AlertCircle color="#00E5FF" size={18} />
            <View className="flex-1">
              <Text className="text-lg font-black tracking-tight text-white">
                Upcoming features
              </Text>
              <Text className="mt-3 text-sm leading-7 text-white/60">
                1. 4-week periodized microcycles{'\n'}
                2. Localized Indian nutrition tracking{'\n'}
                3. Automated wearable synchronization
              </Text>
            </View>
          </View>

          <View className="mt-6 gap-3">
            <GlowingButtonNative
              title="Return To Plans"
              variant="chakra"
              onPress={() => router.replace('/athlete-plans')}
            />
            <GlowingButtonNative
              title="Back To Home"
              variant="saffron"
              onPress={() => router.replace('/(tabs)')}
            />
          </View>
        </ReviewSurfaceCard>
      </ScrollView>
    </View>
  )
}
