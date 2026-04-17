import type { MobileUserEnvelope } from './mobile-api';

export type AthleteInviteContext = {
  coachLockerCode?: string | null;
  inviteToken?: string | null;
};

function appendQuery(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export function withAthleteInviteContext(
  path: string,
  context?: AthleteInviteContext | null
) {
  const coachLockerCode = context?.coachLockerCode?.trim();
  const inviteToken = context?.inviteToken?.trim();
  const params: Record<string, string> = {};

  if (coachLockerCode) {
    params.coach = coachLockerCode;
  }

  if (inviteToken) {
    params.invite = inviteToken;
  }

  return appendQuery(path, params);
}

export function getPreferredMobileRoute(
  user: MobileUserEnvelope | null,
  context?: AthleteInviteContext | null
) {
  if (user?.profile.role === 'athlete' && !user.profile.onboardingCompleted) {
    return withAthleteInviteContext('/athlete-onboarding', context);
  }

  if (user?.profile.role === 'individual' && !user.profile.onboardingCompleted) {
    return '/fitstart';
  }

  if (user?.profile.role === 'coach' && !user.profile.onboardingCompleted) {
    return '/coach-onboarding';
  }

  return '/(tabs)';
}
