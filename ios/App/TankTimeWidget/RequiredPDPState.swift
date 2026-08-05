import Foundation

struct RequiredPDPState: Codable, Equatable {
    let hoseLengthFeet: Int
    let hoseID: String
    let coefficient: Double
    let configurationCoefficientSnapshot: Double?
    let accentColorID: String

    init(
        hoseLengthFeet: Int,
        hoseID: String = "1.75",
        coefficient: Double = 15.5,
        configurationCoefficientSnapshot: Double? = 15.5,
        accentColorID: String = "orange"
    ) {
        self.hoseLengthFeet = hoseLengthFeet
        self.hoseID = hoseID
        self.coefficient = coefficient
        self.configurationCoefficientSnapshot = configurationCoefficientSnapshot
        self.accentColorID = accentColorID
    }

    private enum CodingKeys: String, CodingKey {
        case hoseLengthFeet
        case hoseID
        case coefficient
        case configurationCoefficientSnapshot
        case accentColorID
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        hoseLengthFeet = try container.decode(Int.self, forKey: .hoseLengthFeet)
        hoseID = try container.decodeIfPresent(String.self, forKey: .hoseID) ?? "1.75"
        coefficient = try container.decodeIfPresent(Double.self, forKey: .coefficient) ?? 15.5
        configurationCoefficientSnapshot = try container.decodeIfPresent(
            Double.self,
            forKey: .configurationCoefficientSnapshot
        )
        accentColorID = try container.decodeIfPresent(String.self, forKey: .accentColorID) ?? "orange"
    }
}

enum RequiredPDPStateStore {
    private static let keyPrefix = "reverse-flow-required-pdp-widget-v1."

    static func displayState(
        interactiveState: RequiredPDPState,
        isSmall: Bool,
        startingLength: Int,
        hoseID: String,
        configuredCoefficient: Double?,
        accentColorID: String
    ) -> RequiredPDPState {
        guard isSmall else { return interactiveState }

        return fixedReferenceState(
            startingLength: startingLength,
            hoseID: hoseID,
            configuredCoefficient: configuredCoefficient,
            accentColorID: accentColorID
        )
    }

    static func fixedReferenceState(
        startingLength: Int,
        hoseID: String,
        configuredCoefficient: Double?,
        accentColorID: String
    ) -> RequiredPDPState {
        let hose = RequiredPDPHoseCatalog.hose(id: hoseID)
        let validConfigurationCoefficient = RequiredPDPCalculation.validatedCoefficient(
            configuredCoefficient
        )

        return RequiredPDPState(
            hoseLengthFeet: min(
                max(startingLength, RequiredPDPWidgetConstants.minimumLengthFeet),
                RequiredPDPWidgetConstants.maximumLengthFeet
            ),
            hoseID: hose.id,
            coefficient: initialCoefficient(
                hose: hose,
                configuredCoefficient: validConfigurationCoefficient
            ),
            configurationCoefficientSnapshot: validConfigurationCoefficient,
            accentColorID: accentColorID
        )
    }

    static func load(
        configurationKey: String,
        startingLength: Int,
        increment: Int,
        hoseID: String,
        configuredCoefficient: Double?,
        accentColorID: String,
        defaults: UserDefaults = .standard
    ) -> RequiredPDPState {
        let safeIncrement = RequiredPDPCalculation.normalizedIncrement(increment)
        let hose = RequiredPDPHoseCatalog.hose(id: hoseID)
        let validConfigurationCoefficient = RequiredPDPCalculation.validatedCoefficient(
            configuredCoefficient
        )
        let key = storageKey(configurationKey)
        let decoder = JSONDecoder()

        if
            let data = defaults.data(forKey: key),
            let saved = try? decoder.decode(RequiredPDPState.self, from: data)
        {
            let reconciledCoefficient: Double
            let reconciledSnapshot: Double?

            if saved.hoseID != hose.id {
                reconciledCoefficient = hose.coefficient
                reconciledSnapshot = validConfigurationCoefficient
            } else if validConfigurationCoefficient != saved.configurationCoefficientSnapshot {
                reconciledCoefficient = validConfigurationCoefficient ?? saved.coefficient
                reconciledSnapshot = validConfigurationCoefficient
                    ?? saved.configurationCoefficientSnapshot
            } else {
                reconciledCoefficient = RequiredPDPCalculation.validatedCoefficient(
                    saved.coefficient
                ) ?? hose.coefficient
                reconciledSnapshot = saved.configurationCoefficientSnapshot
            }

            let reconciled = RequiredPDPState(
                hoseLengthFeet: RequiredPDPCalculation.clampedLength(
                    saved.hoseLengthFeet,
                    increment: safeIncrement
                ),
                hoseID: hose.id,
                coefficient: reconciledCoefficient,
                configurationCoefficientSnapshot: reconciledSnapshot,
                accentColorID: accentColorID
            )
            if reconciled != saved {
                save(reconciled, configurationKey: configurationKey, defaults: defaults)
            }
            return reconciled
        }

        let initial = RequiredPDPState(
            hoseLengthFeet: RequiredPDPCalculation.clampedLength(
                startingLength,
                increment: safeIncrement
            ),
            hoseID: hose.id,
            coefficient: initialCoefficient(
                hose: hose,
                configuredCoefficient: validConfigurationCoefficient
            ),
            configurationCoefficientSnapshot: validConfigurationCoefficient,
            accentColorID: accentColorID
        )
        save(initial, configurationKey: configurationKey, defaults: defaults)
        return initial
    }

    @discardableResult
    static func adjustLength(
        configurationKey: String,
        startingLength: Int,
        increment: Int,
        delta: Int,
        hoseID: String,
        configuredCoefficient: Double?,
        accentColorID: String,
        defaults: UserDefaults = .standard
    ) -> RequiredPDPState {
        let safeIncrement = RequiredPDPCalculation.normalizedIncrement(increment)
        let current = load(
            configurationKey: configurationKey,
            startingLength: startingLength,
            increment: safeIncrement,
            hoseID: hoseID,
            configuredCoefficient: configuredCoefficient,
            accentColorID: accentColorID,
            defaults: defaults
        )
        let allowedDelta = delta < 0 ? -safeIncrement : delta > 0 ? safeIncrement : 0
        let next = RequiredPDPState(
            hoseLengthFeet: RequiredPDPCalculation.clampedLength(
                current.hoseLengthFeet + allowedDelta,
                increment: safeIncrement
            ),
            hoseID: current.hoseID,
            coefficient: current.coefficient,
            configurationCoefficientSnapshot: current.configurationCoefficientSnapshot,
            accentColorID: current.accentColorID
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

    private static func initialCoefficient(
        hose: RequiredPDPHose,
        configuredCoefficient: Double?
    ) -> Double {
        let defaultHose = RequiredPDPHoseCatalog.hose(id: "1.75")
        if
            hose.id != defaultHose.id,
            configuredCoefficient == defaultHose.coefficient
        {
            return hose.coefficient
        }
        return configuredCoefficient ?? hose.coefficient
    }
}
