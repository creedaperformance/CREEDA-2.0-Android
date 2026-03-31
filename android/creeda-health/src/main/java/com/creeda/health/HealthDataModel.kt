package com.creeda.health

data class HealthDataModel(
    val date: String,
    val steps: Int,
    val sleep_hours: Double,
    val heart_rate_avg: Double,
    val hrv: Double,
    val source: String = "android"
)
