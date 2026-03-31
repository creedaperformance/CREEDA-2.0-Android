package com.creeda.health

import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedOutputStream
import java.net.HttpURLConnection
import java.net.URL

class SyncService(
    private val endpoint: String,
    private val maxRetries: Int = 3
) {
    // Uses HTTPS and retries transient failures.
    suspend fun syncHealthData(
        userId: String,
        accessToken: String,
        data: List<HealthDataModel>
    ) {
        if (data.isEmpty()) throw SyncError.NoDataAvailable

        val body = JSONObject().apply {
            put("user_id", userId)
            put("data", JSONArray().apply {
                data.forEach { item ->
                    put(JSONObject().apply {
                        put("date", item.date)
                        put("steps", item.steps)
                        put("sleep_hours", item.sleep_hours)
                        put("heart_rate_avg", item.heart_rate_avg)
                        put("hrv", item.hrv)
                        put("source", item.source)
                    })
                }
            })
        }.toString()

        var attempt = 0
        while (true) {
            try {
                val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 15_000
                    readTimeout = 20_000
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Authorization", "Bearer $accessToken")
                }

                BufferedOutputStream(connection.outputStream).use { output ->
                    output.write(body.toByteArray())
                    output.flush()
                }

                val code = connection.responseCode
                when {
                    code in 200..299 -> return
                    code == 401 -> throw SyncError.Unauthorized
                    code == 422 -> throw SyncError.NoDataAvailable
                    else -> throw SyncError.Server(code)
                }
            } catch (error: SyncError) {
                attempt += 1
                if (attempt >= maxRetries) throw error
                delay(2_000L * attempt)
            } catch (error: Throwable) {
                attempt += 1
                if (attempt >= maxRetries) throw SyncError.Transport(error)
                delay(2_000L * attempt)
            }
        }
    }
}

sealed class SyncError(message: String) : Exception(message) {
    data object NoDataAvailable : SyncError("No data available")
    data object Unauthorized : SyncError("Unauthorized")
    data class Server(val code: Int) : SyncError("Server error: $code")
    data class Transport(val causeError: Throwable) : SyncError("Transport error: ${causeError.message}")
}
