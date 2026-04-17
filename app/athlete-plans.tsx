import { Pressable, ScrollView, Text, View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import {
  Apple,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Dumbbell,
  HeartPulse,
} from 'lucide-react-native'

import { GlowingButtonNative } from '../src/components/neon/GlowingButtonNative'
import { ReviewSurfaceCard } from '../src/components/review/ReviewPrimitives'
import { useMobileAuth } from '../src/lib/auth'

const planTypes = [
  {
    key: 'training',
    icon: Dumbbell,
    color: '#FF9933',
    glow: 'rgba(255,153,51,0.18)',
    title: 'Training',
    description:
      'Weekly workout plans with exercises, sets, and reps tailored to your sport and level.',
  },
  {
    key: 'nutrition',
    icon: Apple,
    color: '#1DB954',
    glow: 'rgba(29,185,84,0.18)',
    title: 'Nutrition',
    description:
      'Indian diet-aware meal plans with macros for dal, roti, rice, chicken, paneer, and more.',
  },
  {
    key: 'recovery',
    icon: HeartPulse,
    color: '#0A84FF',
    glow: 'rgba(10,132,255,0.18)',
    title: 'Recovery',
    description:
      'Sleep optimization, stretching routines, and active recovery protocols.',
  },
] as const

export default function AthletePlansScreen() {
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
          This route matches the athlete plans area on web, and your current mobile role is {user.profile.role}.
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

        <View className="mb-8">
          <Text className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
            Your Plan
          </Text>
          <Text className="mt-3 text-4xl font-black tracking-tight text-white">
            Training, nutrition, and recovery
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/55">
            This now mirrors the current web athlete plans area, including the plan-generation entry point.
          </Text>
        </View>

        <ReviewSurfaceCard>
          <Pressable
            onPress={() => router.push('/athlete-plan-generate')}
            className="flex-row items-center justify-between rounded-[24px] border border-[#FF5F1F]/20 bg-[#FF5F1F]/8 px-5 py-5"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#FF5F1F]">
                <ClipboardList color="#04070A" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-black uppercase tracking-[0.18em] text-white">
                  Generate New Plan
                </Text>
                <Text className="mt-2 text-sm leading-6 text-white/55">
                  Personalized for your sport and current CREEDA direction.
                </Text>
              </View>
            </View>
            <ArrowRight color="#FF5F1F" size={18} />
          </Pressable>
        </ReviewSurfaceCard>

        <View className="mt-4 gap-2">
          {planTypes.map((plan) => {
            const Icon = plan.icon
            return (
              <ReviewSurfaceCard key={plan.key}>
                <View className="flex-row items-start gap-4">
                  <View
                    className="h-14 w-14 items-center justify-center rounded-2xl border border-white/10"
                    style={{ backgroundColor: plan.glow }}
                  >
                    <Icon color={plan.color} size={26} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-black tracking-tight text-white">
                      {plan.title}
                    </Text>
                    <Text className="mt-3 text-sm leading-6 text-white/60">
                      {plan.description}
                    </Text>
                  </View>
                </View>
              </ReviewSurfaceCard>
            )
          })}
        </View>

        <ReviewSurfaceCard>
          <Text className="text-lg font-black tracking-tight text-white">
            No active plan yet
          </Text>
          <Text className="mt-3 text-sm leading-6 text-white/60">
            Generate your first personalized plan to get started.
          </Text>

          <View className="mt-6 gap-3">
            <GlowingButtonNative
              title="Generate Plan"
              variant="chakra"
              onPress={() => router.push('/athlete-plan-generate')}
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
