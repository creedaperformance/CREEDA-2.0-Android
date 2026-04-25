# Creeda — Mobile

The Creeda Expo app. **Builds for both iOS and Android from this single codebase** — the repo name is just where it lives.

> Vision: be the most trusted AI sports scientist and health-performance operating system for athletes, coaches, and everyday people. Replace "magical but ungrounded" wellness tracking with believable, actionable, localized decisions — directly from a phone.

This repo is the v2 mobile baseline. The web app and shared backend live at [creedaperformance/Creeda-2.0-Web](https://github.com/creedaperformance/Creeda-2.0-Web).

---

## What this app does

A native sports-science companion for three personas:

- **Athlete** — daily readiness, periodised plans, vision-AI movement scans, ACWR + sleep + HRV monitoring
- **Coach** — squad triage (red/amber/green), session prescription, video review queue
- **Individual** — calm daily pulse, sustainable plans, healthy-living movement screen

The app is offline-first (logs work without internet), syncs through the web backend, and pulls passive data from Apple Health / Health Connect when available.

---

## Tech stack

- **Framework:** Expo SDK 54 + Expo Router 6 (file-based routing)
- **Runtime:** React Native 0.81, React 19, TypeScript
- **Offline DB:** WatermelonDB (`@nozbe/watermelondb`) for high-performance local persistence
- **Backend:** Supabase (Postgres + Auth + RLS) — same project as the web repo
- **Vision AI:** MediaPipe Tasks Vision (33-point pose tracking) via React Native Vision Camera + Nitro Modules + Worklets Core
- **Animation/rendering:** React Native Skia + Reanimated 4 (120fps)
- **Health sync:**
  - iOS — `@kingstinct/react-native-healthkit` (sleep, steps, heart rate, HRV)
  - Android — `react-native-health-connect` + `expo-health-connect`
- **Styling:** NativeWind 4 (Tailwind-in-RN). Design system mirrors web's `neon-desi` primitives.
- **Notifications:** Expo Notifications

---

## Quick start

Requirements: Node 20+, the [Expo CLI](https://docs.expo.dev/get-started/installation/), Xcode (for iOS), Android Studio (for Android), an EAS account for cloud builds.

```bash
git clone https://github.com/creedaperformance/CREEDA-2.0-Android.git creeda-mobile
cd creeda-mobile
npm install
cp .env.example .env.local   # or create .env.local manually with the vars below
npx expo start
```

Press `a` in the Metro terminal for Android emulator, `i` for iOS simulator, or scan the QR code from Expo Go on a real device.

### Environment variables

Create `.env.local` in this repo's root. Both `EXPO_PUBLIC_*` (preferred) and `NEXT_PUBLIC_*` (fallback) keys are accepted:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_BASE_URL=https://www.creeda.in
```

`EXPO_PUBLIC_API_BASE_URL` should point at your deployed web app (currently `https://www.creeda.in`) — that's where the mobile-facing API routes (`/api/mobile/*`) live.

---

## Health data permissions

The Apple HealthKit and Android Health Connect plugins are pre-wired in [app.config.js](app.config.js). The user is prompted on first sync. No additional native code is required.

- **iOS:** sleep, steps, heart rate, HRV, active calories, workouts (read-only)
- **Android:** same signal set via Health Connect; minimum SDK 26

If the user declines, the readiness engine uses self-reported data and explicitly labels missing signals.

---

## Builds (EAS)

The recommended path is EAS Build (cloud) for both platforms:

```bash
npm install -g eas-cli
eas login

# First time per project:
eas build:configure

# Beta-ready builds:
eas build --platform android --profile preview   # produces an APK or AAB you can sideload / Play Internal Testing
eas build --platform ios --profile preview        # produces an IPA → TestFlight
```

Apple Developer account ($99/yr) and Google Play Console ($25 one-time) are required for store distribution.

For local builds:

```bash
npm run android   # builds and installs on a connected device or emulator
npm run ios       # builds and runs in iOS simulator
```

---

## Project structure

```
app/                              # Expo Router file-based routes
├── (tabs)/                        # bottom-tab nav: home, health, account
├── athlete-onboarding.tsx         # adaptive athlete onboarding
├── athlete-scan.tsx               # vision-AI scan entry
├── athlete-scan-analyze.tsx       # MediaPipe analysis screen
├── athlete-scan-report/[id].tsx   # scan report viewer
├── athlete-event/[id].tsx         # competition / event detail
├── coach-academy.tsx              # coach squad ops
├── coach-report/[id].tsx          # coach view of athlete scan reports
├── individual-log.tsx             # daily pulse for individual persona
├── fitstart.tsx                   # individual onboarding
├── check-in.tsx                   # 10-second daily check-in
├── login.tsx, signup.tsx, index.tsx
└── _layout.tsx                    # root navigation shell
src/
├── components/
│   ├── neon/                      # design primitives (ReadinessOrb, GlowingButton, NeonGlassCard, StreakFlame)
│   ├── video-analysis/            # vision UI components
│   ├── profile/                   # avatar + identity
│   └── review/                    # weekly / scan review components
├── database/                      # WatermelonDB schemas, models, migrations
└── lib/
    └── health-sync/               # HealthKit + Health Connect adapters
assets/                            # images, fonts
app.config.js                      # Expo config + native module plugin setup
```

---

## Backend

This app talks to the Creeda Supabase project plus the mobile-API routes deployed by the web repo. The same database powers both clients — there is no separate mobile backend.

Required pre-flight on the database side (run from the web repo):

```bash
psql "$DATABASE_URL" -f migrations/20260425_video_analysis_comments.sql
```

…and any older migrations not yet applied. Without those, coach-athlete video comments and parts of the read-tracking flow won't work.

---

## Testing

Manual QA loop for beta builds:

1. Cold install → sign up → pick persona
2. Onboarding completes inside 90 seconds
3. Daily check-in completes inside 10 seconds
4. Readiness score and single-line directive render on home
5. *Today's session* opens the prescription
6. (Athlete) Movement scan: pick a sport (or *Universal Movement Screen*), record 5–20s clip, see fault detection
7. (Coach) Squad pulse renders with red/amber/green buckets
8. Push notification arrives 12–24h later

If a step fails, file an issue. The web repo's [docs/CREEDA_BLUEPRINT.md §10](https://github.com/creedaperformance/Creeda-2.0-Web/blob/main/docs/CREEDA_BLUEPRINT.md) has the full readiness rubric.

---

## Updating from the web monorepo

This repo is generated from the `mobile/` directory of the web monorepo via:

```bash
git subtree split --prefix=mobile -b mobile-baseline
git push https://github.com/creedaperformance/CREEDA-2.0-Android.git mobile-baseline:main
```

For now, treat this repo as the source of truth for mobile. If you make a mobile change directly here, you can pull it back into the web monorepo's `mobile/` directory using `git subtree pull` (or just copy the changes manually — the dirs are tiny enough).

---

## Other repos

- Web app + backend + migrations: https://github.com/creedaperformance/Creeda-2.0-Web
- Original v1 archive: https://github.com/creedaperformance/Creeda-live
