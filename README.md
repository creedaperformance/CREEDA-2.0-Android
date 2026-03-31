# CREEDA Mobile Health Integration

This module provides optional health data sync from:
- iOS: Apple HealthKit
- Android: Health Connect

## Optional onboarding flow

1. Show `Connect Health Data (Optional)` during onboarding.
2. If user chooses `Connect Now`, trigger native permission flow.
3. If user chooses `Later`, skip with no friction.
4. Never ask users to manually type device metrics collected from HealthKit/Health Connect.

## Permissions

### iOS (HealthKit)
- Steps (`stepCount`)
- Heart Rate (`heartRate`)
- HRV SDNN (`heartRateVariabilitySDNN`)
- Sleep (`sleepAnalysis`)
- Workouts (`workoutType`)

### Android (Health Connect)
- `StepsRecord`
- `HeartRateRecord`
- `HeartRateVariabilityRmssdRecord`
- `SleepSessionRecord`
- `ExerciseSessionRecord`

## Backend contract

`POST /api/v1/health/sync`

```json
{
  "user_id": "uuid",
  "data": [
    {
      "date": "2026-03-26",
      "steps": 8120,
      "sleep_hours": 7.25,
      "heart_rate_avg": 62.3,
      "hrv": 48.1,
      "source": "apple"
    }
  ]
}
```

## Security notes

- Use HTTPS only.
- Use authenticated Bearer token.
- Do not persist raw health records locally beyond session.
- Backend deduplicates by `(user_id, metric_date, source)`.
