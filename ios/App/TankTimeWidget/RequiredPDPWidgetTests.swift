import Foundation

private enum TestFailure: Error, CustomStringConvertible {
    case failed(String)

    var description: String {
        switch self {
        case .failed(let message): message
        }
    }
}

private func expect(_ condition: @autoclosure () -> Bool, _ message: String) throws {
    guard condition() else { throw TestFailure.failed(message) }
}

private func expectNear(_ actual: Double, _ expected: Double, _ message: String) throws {
    guard abs(actual - expected) < 0.000_001 else {
        throw TestFailure.failed("\(message): expected \(expected), received \(actual)")
    }
}

@main
enum RequiredPDPWidgetTests {
    static func main() throws {
        try calculationParity()
        try customCoefficient()
        try incrementsAndBounds()
        try independentConfigurations()
        try configurationChangesUseNewState()
        print("Required PDP widget tests passed")
    }

    private static func calculationParity() throws {
        let cases: [(Double, Int, Int, Int, Double, Int)] = [
            (15.5, 160, 50, 200, 79.36, 129),
            (8, 200, 55, 250, 80, 135),
            (3.5, 300, 75, 400, 126, 201),
            (2, 250, 50, 150, 18.75, 69),
            (100, 60, 50, 100, 36, 86)
        ]

        for (coefficient, flow, nozzlePressure, length, expectedFL, expectedPDP) in cases {
            let result = RequiredPDPCalculation.calculate(
                coefficient: coefficient,
                flowGPM: flow,
                nozzlePressure: nozzlePressure,
                hoseLengthFeet: length
            )
            try expectNear(result.frictionLoss, expectedFL, "Friction loss parity failed")
            try expect(result.roundedRequiredPDP == expectedPDP, "Required PDP rounding parity failed")
        }

        try expect(
            RequiredPDPCalculation.calculate(
                coefficient: 15.5,
                flowGPM: 160,
                nozzlePressure: 50,
                hoseLengthFeet: 200
            ).formattedFrictionLoss == "79.4",
            "Friction loss display did not match the app's one-decimal output"
        )
        try expect(RequiredPDPHoseCatalog.attackHoses.count == 7, "Attack hose catalog drifted")
        try expect(
            RequiredPDPHoseCatalog.hose(id: "1.75").coefficient == 15.5,
            "Authoritative 1.75-inch coefficient drifted"
        )
    }

    private static func customCoefficient() throws {
        let result = RequiredPDPCalculation.calculate(
            coefficient: 12.63,
            flowGPM: 170,
            nozzlePressure: 50,
            hoseLengthFeet: 200
        )
        try expectNear(result.frictionLoss, 73.0014, "Custom coefficient was not authoritative")
        try expect(result.roundedRequiredPDP == 123, "Custom coefficient PDP failed")
    }

    private static func incrementsAndBounds() throws {
        for increment in [25, 50, 100] {
            let defaults = try makeDefaults("increment-\(increment)")
            let key = "increment-\(increment)"
            let increased = RequiredPDPStateStore.adjustLength(
                configurationKey: key,
                startingLength: increment,
                increment: increment,
                delta: 1,
                defaults: defaults
            )
            try expect(increased.hoseLengthFeet == increment * 2, "\(increment)-foot increment failed")

            _ = RequiredPDPStateStore.adjustLength(
                configurationKey: key,
                startingLength: increment,
                increment: increment,
                delta: -1,
                defaults: defaults
            )
            let minimum = RequiredPDPStateStore.adjustLength(
                configurationKey: key,
                startingLength: increment,
                increment: increment,
                delta: -1,
                defaults: defaults
            )
            try expect(minimum.hoseLengthFeet == increment, "Length fell below minimum")

            RequiredPDPStateStore.save(
                RequiredPDPState(hoseLengthFeet: 2_000),
                configurationKey: key,
                defaults: defaults
            )
            let maximum = RequiredPDPStateStore.adjustLength(
                configurationKey: key,
                startingLength: increment,
                increment: increment,
                delta: 1,
                defaults: defaults
            )
            try expect(maximum.hoseLengthFeet == 2_000, "Length exceeded maximum")
        }
    }

    private static func independentConfigurations() throws {
        let defaults = try makeDefaults("independence")
        _ = RequiredPDPStateStore.adjustLength(
            configurationKey: "front-crosslay",
            startingLength: 200,
            increment: 50,
            delta: 1,
            defaults: defaults
        )
        let front = RequiredPDPStateStore.load(
            configurationKey: "front-crosslay",
            startingLength: 200,
            increment: 50,
            defaults: defaults
        )
        let rear = RequiredPDPStateStore.load(
            configurationKey: "rear-crosslay",
            startingLength: 150,
            increment: 25,
            defaults: defaults
        )
        try expect(front.hoseLengthFeet == 250, "First widget state was not saved")
        try expect(rear.hoseLengthFeet == 150, "Second widget inherited another widget's state")
    }

    private static func configurationChangesUseNewState() throws {
        let original = RequiredPDPCalculation.configurationKey(
            packageName: "Front Crosslay",
            hoseID: "1.75",
            coefficient: 15.5,
            flowGPM: 160,
            nozzlePressure: 50,
            startingLength: 200,
            increment: 50
        )
        let updated = RequiredPDPCalculation.configurationKey(
            packageName: "Front Crosslay",
            hoseID: "1.75",
            coefficient: 12.63,
            flowGPM: 170,
            nozzlePressure: 50,
            startingLength: 200,
            increment: 50
        )
        try expect(original != updated, "Configuration update did not produce a new state identity")
    }

    private static func makeDefaults(_ suffix: String) throws -> UserDefaults {
        let suite = "RequiredPDPWidgetTests.\(suffix).\(UUID().uuidString)"
        guard let defaults = UserDefaults(suiteName: suite) else {
            throw TestFailure.failed("Unable to create isolated UserDefaults")
        }
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }
}
