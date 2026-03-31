import Foundation

struct HealthDataModel: Codable {
    let date: String
    let steps: Int
    let sleep_hours: Double
    let heart_rate_avg: Double
    let hrv: Double
    let source: String
}
