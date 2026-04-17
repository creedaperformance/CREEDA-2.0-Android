import { createContext, useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'

import { fetchMobileMe, type AppRole, type MobileUserEnvelope } from './mobile-api'
import { mobileEnv } from './env'
import { supabase, supabaseConfigError } from './supabase'

type AuthResult =
  | { ok: true; needsEmailVerification?: boolean }
  | { ok: false; error: string }

type MobileSignupApiResponse =
  | {
      success: true
      needsEmailVerification: boolean
      session: {
        access_token: string
        refresh_token: string
      } | null
    }
  | {
      error: string
    }

type MobileAuthContextValue = {
  session: Session | null
  user: MobileUserEnvelope | null
  loading: boolean
  error: string | null
  refreshUser: () => Promise<void>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (args: {
    fullName: string
    email: string
    password: string
    role: AppRole
    coachLockerCode?: string
    inviteToken?: string
    termsPrivacyConsent: boolean
    medicalDisclaimerConsent: boolean
    dataProcessingConsent: boolean
    aiAcknowledgementConsent: boolean
    marketingConsent?: boolean
  }) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const MobileAuthContext = createContext<MobileAuthContextValue | null>(null)

export function MobileAuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<MobileUserEnvelope | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(supabaseConfigError)

  async function hydrateUser(nextSession: Session | null) {
    if (!nextSession) {
      setUser(null)
      return
    }

    try {
      const response = await fetchMobileMe(nextSession.access_token)
      setUser(response.user)
      setError(null)
    } catch (fetchError) {
      setUser(null)
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load your CREEDA profile.')
    }
  }

  useEffect(() => {
    let isMounted = true

    async function initialize() {
      if (supabaseConfigError) {
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession()

      if (!isMounted) return

      setSession(initialSession)
      await hydrateUser(initialSession)

      if (isMounted) {
        setLoading(false)
      }
    }

    void initialize()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      void hydrateUser(nextSession)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function refreshUser() {
    await hydrateUser(session)
  }

  async function signIn(email: string, password: string): Promise<AuthResult> {
    if (supabaseConfigError) {
      return { ok: false, error: supabaseConfigError }
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      return { ok: false, error: signInError.message }
    }

    setSession(data.session)
    await hydrateUser(data.session)
    return { ok: true }
  }

  async function signUp(args: {
    fullName: string
    email: string
    password: string
    role: AppRole
    coachLockerCode?: string
    inviteToken?: string
    termsPrivacyConsent: boolean
    medicalDisclaimerConsent: boolean
    dataProcessingConsent: boolean
    aiAcknowledgementConsent: boolean
    marketingConsent?: boolean
  }): Promise<AuthResult> {
    if (supabaseConfigError) {
      return { ok: false, error: supabaseConfigError }
    }

    const response = await fetch(`${mobileEnv.apiBaseUrl}/api/mobile/auth/signup`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: args.fullName.trim(),
        email: args.email.trim(),
        password: args.password,
        role: args.role,
        coachLockerCode: args.coachLockerCode?.trim() || '',
        inviteToken: args.inviteToken?.trim() || '',
        termsPrivacyConsent: args.termsPrivacyConsent,
        medicalDisclaimerConsent: args.medicalDisclaimerConsent,
        dataProcessingConsent: args.dataProcessingConsent,
        aiAcknowledgementConsent: args.aiAcknowledgementConsent,
        marketingConsent: Boolean(args.marketingConsent),
      }),
    })

    const payload = (await response.json().catch(() => null)) as MobileSignupApiResponse | null
    if (!response.ok || !payload || 'error' in payload) {
      return {
        ok: false,
        error:
          payload && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : `Signup failed with status ${response.status}.`,
      }
    }

    if (payload.session) {
      const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      })

      if (setSessionError) {
        return { ok: false, error: setSessionError.message }
      }

      setSession(sessionData.session)
      await hydrateUser(sessionData.session)
    }

    return {
      ok: true,
      needsEmailVerification: payload.needsEmailVerification,
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }

  return (
    <MobileAuthContext.Provider
      value={{
        session,
        user,
        loading,
        error,
        refreshUser,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  )
}

export function useMobileAuth() {
  const context = useContext(MobileAuthContext)
  if (!context) {
    throw new Error('useMobileAuth must be used inside MobileAuthProvider.')
  }

  return context
}
