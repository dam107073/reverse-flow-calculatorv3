import Foundation

struct TankTimeState: Codable, Equatable {
    let flowGPM: Int
    let startDate: Date?
    let endDate: Date?

    static var initial: TankTimeState {
        TankTimeState(
            flowGPM: TankTimeCalculation.defaultFlowGPM,
            startDate: nil,
            endDate: nil
        )
    }

    var isLocked: Bool {
        startDate != nil
    }

    func isRunning(at date: Date) -> Bool {
        guard let endDate else { return false }
        return date < endDate
    }

    func isEmpty(at date: Date) -> Bool {
        guard startDate != nil, let endDate else { return false }
        return date >= endDate
    }
}

enum TankTimeDisplayStatus: Equatable {
    case estimated
    case remaining
    case lowWater
    case critical
    case empty

    static func resolve(state: TankTimeState, at date: Date) -> TankTimeDisplayStatus {
        guard state.isLocked else { return .estimated }
        guard let endDate = state.endDate else { return .empty }

        let secondsRemaining = max(0, Int(ceil(endDate.timeIntervalSince(date))))
        if secondsRemaining == 0 { return .empty }
        if secondsRemaining < 10 { return .critical }
        if secondsRemaining <= 30 { return .lowWater }
        return .remaining
    }

    static func transitionDates(endDate: Date, after date: Date) -> [Date] {
        [endDate.addingTimeInterval(-30), endDate.addingTimeInterval(-9), endDate]
            .filter { $0 > date }
    }
}

enum TankTimeStateStore {
    private static let encoder = JSONEncoder()
    private static let decoder = JSONDecoder()

    private static func key(tankGallons: Int) -> String {
        "tank-time-widget.state.\(tankGallons)"
    }

    static func load(tankGallons: Int) -> TankTimeState {
        guard
            let data = UserDefaults.standard.data(forKey: key(tankGallons: tankGallons)),
            let state = try? decoder.decode(TankTimeState.self, from: data)
        else {
            return .initial
        }
        return TankTimeState(
            flowGPM: TankTimeCalculation.clampedFlow(state.flowGPM),
            startDate: state.startDate,
            endDate: state.endDate
        )
    }

    static func save(_ state: TankTimeState, tankGallons: Int) {
        guard let data = try? encoder.encode(state) else { return }
        UserDefaults.standard.set(data, forKey: key(tankGallons: tankGallons))
    }

    static func adjustFlow(tankGallons: Int, delta: Int) {
        let current = load(tankGallons: tankGallons)
        guard !current.isLocked else { return }
        save(
            TankTimeState(
                flowGPM: TankTimeCalculation.clampedFlow(current.flowGPM + delta),
                startDate: nil,
                endDate: nil
            ),
            tankGallons: tankGallons
        )
    }

    static func start(tankGallons: Int, now: Date = Date()) {
        let current = load(tankGallons: tankGallons)
        guard !current.isLocked else { return }
        let duration = TankTimeCalculation.durationSeconds(
            tankGallons: tankGallons,
            flowGPM: current.flowGPM
        )
        guard duration > 0 else { return }
        save(
            TankTimeState(
                flowGPM: current.flowGPM,
                startDate: now,
                endDate: now.addingTimeInterval(TimeInterval(duration))
            ),
            tankGallons: tankGallons
        )
    }

    static func reset(tankGallons: Int) {
        save(.initial, tankGallons: tankGallons)
    }
}
