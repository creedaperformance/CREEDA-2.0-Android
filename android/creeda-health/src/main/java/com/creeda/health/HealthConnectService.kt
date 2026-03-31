package com.creeda.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

class HealthConnectService(context: Context) {
    private val client = HealthConnectClient.getOrCreate(context)
    private val zone = ZoneId.systemDefault()

    // Request these permissions only when user opts in.
    val requiredPermissions: Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    )

    suspend fun hasAllPermissions(): Boolean {
        val granted = client.permissionController.getGrantedPermissions()
        return granted.containsAll(requiredPermissions)
    }

    // Aggregates the past 7 days into one normalized list.
    suspend fun fetchLast7DaysAggregated(): List<HealthDataModel> {
        val today = ZonedDateTime.now(zone).toLocalDate()
        val formatter = DateTimeFormatter.ISO_LOCAL_DATE
        val output = mutableListOf<HealthDataModel>()

        for (offset in 6 downTo 0) {
            val date = today.minusDays(offset.toLong())
            val start = date.atStartOfDay(zone).toInstant()
            val end = date.plusDays(1).atStartOfDay(zone).toInstant()

            val steps = readSteps(start, end)
            val heartAvg = readAverageHeartRate(start, end)
            val hrv = readAverageHrv(start, end)
            val sleepHours = readSleepHours(start, end)
            // Workout reads are permission-validated; omitted from payload model by design.
            readWorkoutCount(start, end)

            output += HealthDataModel(
                date = formatter.format(date),
                steps = steps,
                sleep_hours = sleepHours,
                heart_rate_avg = heartAvg,
                hrv = hrv,
                source = "android"
            )
        }

        return output
    }

    private suspend fun readSteps(start: Instant, end: Instant): Int {
        val response = client.readRecords(
            ReadRecordsRequest(
                recordType = StepsRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )
        val total = response.records.sumOf { it.count.toLong() }
        return total.coerceAtLeast(0).toInt()
    }

    private suspend fun readAverageHeartRate(start: Instant, end: Instant): Double {
        val response = client.readRecords(
            ReadRecordsRequest(
                recordType = HeartRateRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )

        val samples = response.records.flatMap { record -> record.samples.map { it.beatsPerMinute.toDouble() } }
        if (samples.isEmpty()) return 0.0
        return samples.average()
    }

    private suspend fun readAverageHrv(start: Instant, end: Instant): Double {
        val response = client.readRecords(
            ReadRecordsRequest(
                recordType = HeartRateVariabilityRmssdRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )
        if (response.records.isEmpty()) return 0.0
        return response.records.map { it.heartRateVariabilityMillis }.average()
    }

    private suspend fun readSleepHours(start: Instant, end: Instant): Double {
        val response = client.readRecords(
            ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )
        val totalMillis = response.records.sumOf { record ->
            val duration = record.endTime.toEpochMilli() - record.startTime.toEpochMilli()
            duration.coerceAtLeast(0L)
        }
        val hours = totalMillis / 3_600_000.0
        return ((hours * 100.0).roundToInt() / 100.0)
    }

    private suspend fun readWorkoutCount(start: Instant, end: Instant): Int {
        val response = client.readRecords(
            ReadRecordsRequest(
                recordType = ExerciseSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )
        return response.records.size
    }
}
