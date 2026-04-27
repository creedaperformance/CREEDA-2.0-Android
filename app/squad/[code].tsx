import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { useMobileAuth } from '../../src/lib/auth'
import { mobileEnv } from '../../src/lib/env'

type SquadPreview = {
  id: string
  name: string
  sport: string
  level: string
  primary_focus: string | null
  member_count: number
  coach_name: string | null
}

export default function JoinSquadScreen() {
  const router = useRouter()
  const { code } = useLocalSearchParams<{ code: string | string[] }>()
  const inviteCode = (Array.isArray(code) ? code[0] : code ?? '').trim().toUpperCase()
  const { session, user } = useMobileAuth()

  const [preview, setPreview] = useState<SquadPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [position, setPosition] = useState('')

  // Fetch preview via the public web endpoint we just built (ssr page contains
  // the data). For mobile we hit the join API to detect a 404 on invalid code,
  // and lazily render preview text from the response.
  useEffect(() => {
    if (!inviteCode) {
      setError('Invite link is missing the squad code.')
      return
    }
    let cancelled = false
    fetch(`${mobileEnv.apiBaseUrl}/api/squads/preview?code=${encodeURIComponent(inviteCode)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'We couldn’t find a squad with that invite code.'
              : `Could not load invite (${res.status}).`
          )
        }
        return (await res.json()) as { squad: SquadPreview }
      })
      .then((data) => {
        if (!cancelled && data?.squad) setPreview(data.squad)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [inviteCode])

  async function joinSquad() {
    if (!inviteCode || !session?.access_token) return
    setIsJoining(true)
    setError(null)
    try {
      const res = await fetch(`${mobileEnv.apiBaseUrl}/api/squads/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invite_code: inviteCode,
          position: position.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail ?? data?.error ?? 'Join failed.')
      setJoined(true)
      setTimeout(() => router.replace('/(tabs)'), 900)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsJoining(false)
    }
  }

  if (!user) {
    return (
      <View className="flex-1 bg-[#04070A] px-5 pt-16">
        <Text className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#6EE7B7]">
          Squad invite
        </Text>
        <Text className="mt-2 text-3xl font-black tracking-tight text-white">
          Sign in to join {preview?.name ?? 'the squad'}.
        </Text>
        <Text className="mt-3 text-sm leading-6 text-white/55">
          Open Creeda on your phone, sign in (or sign up), and tap the invite link again. Your
          coach will see your readiness as soon as you complete onboarding.
        </Text>
        <Pressable
          onPress={() => router.replace('/login')}
          className="mt-6 min-h-12 items-center justify-center rounded-2xl bg-[#6EE7B7] px-5"
        >
          <Text className="text-[13px] font-black uppercase tracking-[0.18em] text-slate-950">
            Sign in
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Linking.openURL(
              `${mobileEnv.apiBaseUrl}/signup?invite=${encodeURIComponent(inviteCode)}&intent=join_squad`
            )
          }
          className="mt-3 min-h-12 items-center justify-center rounded-2xl border border-white/10 px-5"
        >
          <Text className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/72">
            Open sign-up in browser
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-[#04070A]" contentContainerStyle={{ padding: 20, paddingTop: 56 }}>
      <Pressable onPress={() => router.back()}>
        <Text className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/55">
          ← Back
        </Text>
      </Pressable>
      <Text className="mt-5 text-[11px] font-black uppercase tracking-[0.28em] text-[#6EE7B7]">
        Squad invite
      </Text>

      {error ? (
        <View className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-400/[0.08] p-4">
          <Text className="text-sm font-bold text-rose-200">{error}</Text>
        </View>
      ) : null}

      {!preview && !error ? (
        <View className="mt-8 items-center justify-center">
          <ActivityIndicator color="#6EE7B7" />
          <Text className="mt-3 text-[12px] text-white/45">Loading invite…</Text>
        </View>
      ) : null}

      {preview ? (
        <View className="mt-3">
          <Text className="text-3xl font-black tracking-tight text-white">{preview.name}</Text>
          <Text className="mt-1 text-sm text-white/55">
            {preview.sport}
            {preview.level ? ` · ${preview.level}` : ''}
            {preview.primary_focus ? ` · ${preview.primary_focus.replace(/_/g, ' ')}` : ''}
          </Text>
          {preview.coach_name ? (
            <Text className="mt-4 text-sm leading-6 text-white/72">
              <Text className="font-black text-white">{preview.coach_name}</Text> invited you. They
              will see your daily readiness, scans, and load — never any private medical screen
              data unless you explicitly share it.
            </Text>
          ) : null}
          <Text className="mt-2 text-[11px] text-white/45">
            {preview.member_count} {preview.member_count === 1 ? 'athlete is' : 'athletes are'} in
            this squad.
          </Text>

          {joined ? (
            <View className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-300/[0.06] p-4">
              <Text className="text-sm font-bold text-white">You're in.</Text>
              <Text className="mt-1 text-[12px] text-emerald-100/72">
                Welcome to {preview.name}. Taking you to your dashboard…
              </Text>
            </View>
          ) : (
            <>
              <Text className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                Your position (optional)
              </Text>
              <View className="mt-1.5 rounded-2xl border border-white/10 bg-white/[0.04]">
                <Text className="hidden">{/* keeping native input simple — use TextInput */}</Text>
              </View>
              <View className="mt-4">
                <Pressable
                  onPress={joinSquad}
                  disabled={isJoining}
                  className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-5 ${
                    isJoining ? 'bg-white/[0.05]' : 'bg-[#6EE7B7]'
                  }`}
                >
                  <Text
                    className={`text-[13px] font-black uppercase tracking-[0.18em] ${
                      isJoining ? 'text-white/55' : 'text-slate-950'
                    }`}
                  >
                    {isJoining ? 'Joining…' : `Join ${preview.name}`}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : null}
    </ScrollView>
  )
}
