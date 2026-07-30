import Foundation

struct RequiredPDPState: Codable, Equatable {
    let hoseLengthFeet: Int
}

enum RequiredPDPStateStore {
    private static let keyPrefix = "reverse-flow-required-pdp-widget-v1."

    static func load(
        configurationKey: String,
        startingLength: Int,
        increment: Int,
        defaults: UserDefaults = .standard
    ) -> RequiredPDPState {
        let safeIncrement = RequiredPDPCalculation.normalizedIncrement(increment)
        let key = storageKey(configurationKey)
        let decoder = JSONDecoder()

        if
            let data = defaults.data(forKey: key),
            let saved = try? decoder.decode(RequiredPDPState.self, from: data)
        {
            return RequiredPDPState(
                hoseLengthFeet: RequiredPDPCalculation.clampedLength(
                    saved.hoseLengthFeet,
                    increment: safeIncrement
                )
            )
        }

        return RequiredPDPState(
            hoseLengthFeet: RequiredPDPCalculation.clampedLength(
                startingLength,
                increment: safeIncrement
            )
        )
    }

    @discardableResult
    static func adjustLength(
        configurationKey: String,
        startingLength: Int,
        increment: Int,
        delta: Int,
        defaults: UserDefaults = .standard
    ) -> RequiredPDPState {
        let safeIncrement = RequiredPDPCalculation.normalizedIncrement(increment)
        let current = load(
            configurationKey: configurationKey,
            startingLength: startingLength,
            increment: safeIncrement,
            defaults: defaults
        )
        let allowedDelta = delta < 0 ? -safeIncrement : delta > 0 ? safeIncrement : 0
        let next = RequiredPDPState(
            hoseLengthFeet: RequiredPDPCalculation.clampedLength(
                current.hoseLengthFeet + allowedDelta,
                increment: safeIncrement
            )
        )

        save(next, configurationKey: configurationKey, defaults: defaults)
        return next
    }

    static func save(
        _ state: RequiredPDPState,
        configurationKey: String,
        defaults: UserDefaults = .standard
    ) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        defaults.set(data, forKey: storageKey(configurationKey))
    }

    private static func storageKey(_ configurationKey: String) -> String {
        keyPrefix + configurationKey
    }
}
