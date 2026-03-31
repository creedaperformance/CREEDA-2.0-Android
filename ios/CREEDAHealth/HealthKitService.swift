import Foundation
import HealthKit

final class HealthKitService {
    private let healthStore = HKHealthStore()
    private let calendar = Calendar.current

    var isSupported: Bool {
        HKHealthStore.isHealthDataAvailable()
    }

    // Optional permission prompt invoked only when user taps "Connect".
    func requestReadPermissions() async throws {
        guard isSupported else {
            throw HealthIntegrationError.deviceNotSupported
        }

        guard
            let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount),
            let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate),
            let hrvType = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
            let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)
        else {
            throw HealthIntegrationError.unsupportedDataType
        }

        let workoutType = HKObjectType.workoutType()
        let toRead: Set<HKObjectType> = [stepType, heartRateType, hrvType, sleepType, workoutType]

        try await withCheckedThrowingContinuation { continuation in
            healthStore.requestAuthorization(toShare: [], read: toRead) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                if success {
                    continuation.resume(returning: ())
                } else {
                    continuation.resume(throwing: HealthIntegrationError.permissionDenied)
                }
            }
        }
    }

    // Fetches and aggregates last 7 days into the unified payload model.
    func fetchLast7DaysAggregated() async throws -> [HealthDataModel] {
        guard isSupported else {
            throw HealthIntegrationError.deviceNotSupported
        }

        let endOfToday = calendar.startOfDay(for: Date())
        var output: [HealthDataModel] = []

        for dayOffset in stride(from: 6, through: 0, by: -1) {
            guard
                let dayStart = calendar.date(byAdding: .day, value: -dayOffset, to: endOfToday),
                let dayEnd = calendar.date(byAdding: .day, value: 1, to: dayStart)
            else {
                continue
            }

            async let steps = fetchStepCount(start: dayStart, end: dayEnd)
            async let avgHeartRate = fetchAverageQuantity(
                identifier: .heartRate,
                unit: HKUnit.count().unitDivided(by: .minute()),
                start: dayStart,
                end: dayEnd
            )
            async let avgHrv = fetchAverageQuantity(
                identifier: .heartRateVariabilitySDNN,
                unit: HKUnit.secondUnit(with: .milli),
                start: dayStart,
                end: dayEnd
            )
            async let sleepHours = fetchSleepHours(start: dayStart, end: dayEnd)
            // Workout read is fetched to honor permission scope, but not included in unified payload.
            async let _ = fetchWorkoutCount(start: dayStart, end: dayEnd)

            let day = HealthDataModel(
                date: isoDate(dayStart),
                steps: try await steps,
                sleep_hours: try await sleepHours,
                heart_rate_avg: try await avgHeartRate,
                hrv: try await avgHrv,
                source: "apple"
            )

            output.append(day)
        }

        return output
    }

    private func fetchStepCount(start: Date, end: Date) async throws -> Int {
        guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return 0 }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let value = stats?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                continuation.resume(returning: Int(value.rounded()))
            }
            healthStore.execute(query)
        }
    }

    private func fetchAverageQuantity(
        identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        start: Date,
        end: Date
    ) async throws -> Double {
        guard let type = HKQuantityType.quantityType(forIdentifier: identifier) else { return 0 }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .discreteAverage) { _, stats, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                let value = stats?.averageQuantity()?.doubleValue(for: unit) ?? 0
                continuation.resume(returning: value)
            }
            healthStore.execute(query)
        }
    }

    private func fetchSleepHours(start: Date, end: Date) async throws -> Double {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return 0 }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let totalSeconds = (samples as? [HKCategorySample])?.reduce(0.0, { partial, sample in
                    let value = HKCategoryValueSleepAnalysis(rawValue: sample.value)
                    let isAsleep = value == .asleep || value == .asleepREM || value == .asleepCore || value == .asleepDeep
                    guard isAsleep else { return partial }
                    return partial + sample.endDate.timeIntervalSince(sample.startDate)
                }) ?? 0

                continuation.resume(returning: totalSeconds / 3600.0)
            }
            healthStore.execute(query)
        }
    }

    private func fetchWorkoutCount(start: Date, end: Date) async throws -> Int {
        let workoutType = HKObjectType.workoutType()
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: workoutType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: samples?.count ?? 0)
            }
            healthStore.execute(query)
        }
    }

    private func isoDate(_ value: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: value)
    }
}

enum HealthIntegrationError: Error {
    case deviceNotSupported
    case permissionDenied
    case unsupportedDataType
}
