package com.creeda.health

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.time.Duration
import java.util.concurrent.TimeUnit

class DailyHealthSyncWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        return try {
            // Hook up your auth/session provider here.
            val accessToken = inputData.getString("access_token").orEmpty()
            val userId = inputData.getString("user_id").orEmpty()
            if (accessToken.isBlank() || userId.isBlank()) {
                return Result.retry()
            }

            val healthConnectService = HealthConnectService(applicationContext)
            if (!healthConnectService.hasAllPermissions()) {
                // Do not fail permanently; user may grant later.
                return Result.success()
            }

            val data = healthConnectService.fetchLast7DaysAggregated()
            val syncService = SyncService(endpoint = "${inputData.getString("api_base_url")}/api/v1/health/sync")
            syncService.syncHealthData(userId = userId, accessToken = accessToken, data = data)

            Result.success()
        } catch (_: Throwable) {
            Result.retry()
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "creeda_daily_health_sync"

        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<DailyHealthSyncWorker>(1, TimeUnit.DAYS)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, Duration.ofMinutes(10))
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
        }
    }
}
