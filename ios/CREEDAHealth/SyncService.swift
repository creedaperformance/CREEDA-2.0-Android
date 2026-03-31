import Foundation
import BackgroundTasks

final class SyncService {
    private let endpoint: URL
    private let session: URLSession
    private let maxRetries = 3

    init(endpoint: URL, session: URLSession = .shared) {
        self.endpoint = endpoint
        self.session = session
    }

    // Uses HTTPS API and retries transient failures.
    func syncHealthData(userId: String, accessToken: String, data: [HealthDataModel]) async throws {
        guard !data.isEmpty else { throw SyncError.noDataAvailable }

        let payload = SyncPayload(user_id: userId, data: data)
        let body = try JSONEncoder().encode(payload)

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = body

        var attempt = 0
        while true {
            do {
                let (_, response) = try await session.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw SyncError.invalidResponse
                }
                guard (200...299).contains(httpResponse.statusCode) else {
                    if httpResponse.statusCode == 401 {
                        throw SyncError.unauthorized
                    }
                    if httpResponse.statusCode == 422 {
                        throw SyncError.noDataAvailable
                    }
                    throw SyncError.serverError(code: httpResponse.statusCode)
                }
                return
            } catch {
                attempt += 1
                if attempt >= maxRetries { throw error }
                try await Task.sleep(nanoseconds: UInt64(2_000_000_000 * attempt))
            }
        }
    }
}

final class DailyHealthSyncManager {
    static let shared = DailyHealthSyncManager()

    private let syncStateKey = "creeda.health.lastSyncDate"
    private let taskIdentifier = "com.creeda.health.daily-sync"

    private init() {}

    func registerBackgroundTask() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: taskIdentifier, using: nil) { task in
            self.handle(task: task as! BGAppRefreshTask)
        }
    }

    // Schedules one run every day. BGTaskScheduler decides exact run-time.
    func scheduleDailySync() {
        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
        request.earliestBeginDate = Calendar.current.date(byAdding: .hour, value: 24, to: Date())
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            // Scheduling failures are non-fatal; app can attempt again on next foreground launch.
        }
    }

    func shouldRunToday() -> Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let today = formatter.string(from: Date())
        let last = UserDefaults.standard.string(forKey: syncStateKey)
        return today != last
    }

    func markSyncCompletedToday() {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        UserDefaults.standard.set(formatter.string(from: Date()), forKey: syncStateKey)
    }

    private func handle(task: BGAppRefreshTask) {
        scheduleDailySync()
        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }

        Task {
            // Wire this to app auth + user context in production.
            task.setTaskCompleted(success: true)
        }
    }
}

private struct SyncPayload: Codable {
    let user_id: String
    let data: [HealthDataModel]
}

enum SyncError: Error {
    case noDataAvailable
    case unauthorized
    case invalidResponse
    case serverError(code: Int)
}
