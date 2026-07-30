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

    var formattedFrictionLoss: String {
        String(
            format: "%.1f",
            locale: Locale(identifier: "en_US_POSIX"),
            frictionLoss
        )
    }

    var roundedRequiredPDP: Int {
        Int(requiredPDP.rounded())
    }
}

enum RequiredPDPCalculation {
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
        hoseID: String,
        coefficient: Double,
        flowGPM: Int,
        nozzlePressure: Int,
        startingLength: Int,
        increment: Int
    ) -> String {
        let canonical = [
            packageName.trimmingCharacters(in: .whitespacesAndNewlines),
            hoseID,
            String(
                format: "%.6f",
                locale: Locale(identifier: "en_US_POSIX"),
                coefficient
            ),
            String(flowGPM),
            String(nozzlePressure),
            String(startingLength),
            String(increment)
        ].joined(separator: "\u{1F}")

        return String(format: "required-pdp-%016llx", stableHash(canonical))
    }

    private static func stableHash(_ value: String) -> UInt64 {
        value.utf8.reduce(UInt64(14_695_981_039_346_656_037)) { hash, byte in
            (hash ^ UInt64(byte)) &* 1_099_511_628_211
        }
    }
}
