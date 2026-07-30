import Foundation

enum RequiredPDPWidgetConstants {
    static let kind = "ReverseFlowRequiredPDPWidget"
    static let minimumLengthFeet = 25
    static let maximumLengthFeet = 2_000
}

struct RequiredPDPHose: Equatable {
    let id: String
    let label: String
    let coefficient: Double
}

enum RequiredPDPHoseCatalog {
    // Mirrors ATTACK_HOSE_IDS and HOSE_OPTIONS in www/js/app.js and
    // www/js/data/hydraulics.js.
    static let attackHoses = [
        RequiredPDPHose(id: "1", label: "1\"", coefficient: 100),
        RequiredPDPHose(id: "1.5", label: "1.5\"", coefficient: 24),
        RequiredPDPHose(id: "1.75", label: "1.75\"", coefficient: 15.5),
        RequiredPDPHose(id: "1.88", label: "1.88\"", coefficient: 8),
        RequiredPDPHose(id: "2", label: "2\"", coefficient: 6),
        RequiredPDPHose(id: "2.25", label: "2.25\"", coefficient: 3.5),
        RequiredPDPHose(id: "2.5", label: "2.5\"", coefficient: 2)
    ]

    static func hose(id: String) -> RequiredPDPHose {
        attackHoses.first(where: { $0.id == id }) ?? attackHoses[2]
    }
}

struct RequiredPDPResult: Equatable {
    let frictionLoss: Double
    let requiredPDP: Double

    var roundedFrictionLoss: Int {
        Int(frictionLoss.rounded())
    }

    var roundedRequiredPDP: Int {
        Int(requiredPDP.rounded())
    }
}

struct RequiredPDPSmallDisplay: Equatable {
    let packageName: String
    let hoseLabel: String
    let hoseAccessibilityLabel: String
    let hoseLengthFeet: Int
    let flowGPM: Int
    let nozzlePressure: Int
    let result: RequiredPDPResult

    var pdpValue: String {
        String(result.roundedRequiredPDP)
    }

    var frictionLossValue: String {
        String(result.roundedFrictionLoss)
    }

    var flowValue: String {
        String(flowGPM)
    }

    var detailLine: String {
        "\(hoseLabel) • \(hoseLengthFeet)' • NP \(nozzlePressure)"
    }

    var accessibilitySummary: String {
        "\(packageName). " +
        "Required PDP \(result.roundedRequiredPDP) PSI. " +
        "\(hoseAccessibilityLabel) inch hose, " +
        "\(hoseLengthFeet) feet, " +
        "nozzle pressure \(nozzlePressure) PSI, " +
        "flow \(flowGPM) GPM, " +
        "friction loss \(result.roundedFrictionLoss) PSI."
    }
}

enum RequiredPDPCalculation {
    static func validatedCoefficient(_ coefficient: Double?) -> Double? {
        guard let coefficient, coefficient.isFinite, coefficient > 0 else {
            return nil
        }
        return coefficient
    }

    static func calculate(
        coefficient: Double,
        flowGPM: Int,
        nozzlePressure: Int,
        hoseLengthFeet: Int
    ) -> RequiredPDPResult {
        let q = Double(flowGPM) / 100
        let lengthHundreds = Double(hoseLengthFeet) / 100
        let frictionLoss = coefficient * q * q * lengthHundreds

        return RequiredPDPResult(
            frictionLoss: frictionLoss,
            requiredPDP: Double(nozzlePressure) + frictionLoss
        )
    }

    static func clampedLength(_ length: Int, increment: Int) -> Int {
        let minimum = normalizedIncrement(increment)
        return min(max(length, minimum), RequiredPDPWidgetConstants.maximumLengthFeet)
    }

    static func normalizedIncrement(_ increment: Int) -> Int {
        [25, 50, 100].contains(increment) ? increment : 50
    }

    static func configurationKey(
        packageName: String,
        fallbackIdentity: String = "Required PDP"
    ) -> String {
        let trimmedName = packageName.trimmingCharacters(in: .whitespacesAndNewlines)
        let canonical = trimmedName.isEmpty ? fallbackIdentity : trimmedName

        return String(format: "required-pdp-%016llx", stableHash(canonical))
    }

    private static func stableHash(_ value: String) -> UInt64 {
        value.utf8.reduce(UInt64(14_695_981_039_346_656_037)) { hash, byte in
            (hash ^ UInt64(byte)) &* 1_099_511_628_211
        }
    }
}
