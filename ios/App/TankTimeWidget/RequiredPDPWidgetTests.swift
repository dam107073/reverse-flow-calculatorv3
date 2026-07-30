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
        try wholeNumberRounding()
        try customCoefficient()
        try coefficientPersistenceAndValidation()
        try hoseSizeChangeUsesDefault()
        try accentPersistenceAndIndependence()
        try smallReferenceBehavior()
        try smallDisplayFormatting()
        try mediumDisplayFormatting()
        try incrementsAndBounds()
        try independentConfigurations()
        try configurationChangesUseNewState()
        try tankTimeRegression()
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

        try expect(RequiredPDPHoseCatalog.attackHoses.count == 7, "Attack hose catalog drifted")
        try expect(
            RequiredPDPHoseCatalog.hose(id: "1.75").coefficient == 15.5,
            "Authoritative 1.75-inch coefficient drifted"
        )
    }

    private static func wholeNumberRounding() throws {
        let below = RequiredPDPResult(frictionLoss: 51.49, requiredPDP: 91.49)
        let midpoint = RequiredPDPResult(frictionLoss: 51.5, requiredPDP: 91.5)
        let above = RequiredPDPResult(frictionLoss: 51.51, requiredPDP: 91.51)

        try expect(below.roundedFrictionLoss == 51, "Friction loss below midpoint rounded up")
        try expect(midpoint.roundedFrictionLoss == 52, "Friction loss midpoint rounding drifted")
        try expect(above.roundedFrictionLoss == 52, "Friction loss above midpoint rounded down")
        try expect(below.roundedRequiredPDP == 91, "PDP below midpoint rounded up")
        try expect(midpoint.roundedRequiredPDP == 92, "PDP midpoint rounding drifted")
        try expect(above.roundedRequiredPDP == 92, "PDP above midpoint rounded down")
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

    private static func coefficientPersistenceAndValidation() throws {
        let defaults = try makeDefaults("coefficient")
        let key = "front-crosslay"
        let custom = loadState(
            key: key,
            coefficient: 8.25,
            defaults: defaults
        )
        try expect(custom.coefficient == 8.25, "Custom coefficient was not persisted")

        let reloaded = loadState(
            key: key,
            coefficient: 8.25,
            defaults: defaults
        )
        try expect(reloaded.coefficient == 8.25, "Normal reload replaced custom coefficient")

        for invalid in [nil, 0, -1, .infinity, -.infinity, .nan] as [Double?] {
            let rejected = loadState(
                key: key,
                coefficient: invalid,
                defaults: defaults
            )
            try expect(rejected.coefficient == 8.25, "Invalid coefficient replaced last valid value")
        }
    }

    private static func hoseSizeChangeUsesDefault() throws {
        let initialDefaults = try makeDefaults("initial-hose-default")
        let initiallySelectedHose = loadState(
            key: "initial-blue-line",
            hoseID: "1.88",
            coefficient: 15.5,
            defaults: initialDefaults
        )
        try expect(
            initiallySelectedHose.coefficient == 8,
            "Initial non-default hose retained the configuration field's stale default"
        )

        let defaults = try makeDefaults("hose-change")
        let key = "blue-line"
        let custom = loadState(
            key: key,
            hoseID: "1.75",
            coefficient: 12.63,
            defaults: defaults
        )
        try expect(custom.coefficient == 12.63, "Initial custom coefficient failed")

        let changed = loadState(
            key: key,
            hoseID: "1.88",
            coefficient: 12.63,
            defaults: defaults
        )
        try expect(changed.coefficient == 8, "Hose change did not load authoritative default")

        let normalReload = loadState(
            key: key,
            hoseID: "1.88",
            coefficient: 12.63,
            defaults: defaults
        )
        try expect(normalReload.coefficient == 8, "Normal reload restored stale coefficient")

        let newCustom = loadState(
            key: key,
            hoseID: "1.88",
            coefficient: 8.25,
            defaults: defaults
        )
        try expect(newCustom.coefficient == 8.25, "New hose custom coefficient was not accepted")
    }

    private static func accentPersistenceAndIndependence() throws {
        let defaults = try makeDefaults("accents")
        let blue = loadState(
            key: "blue-line",
            accentColorID: "blue",
            defaults: defaults
        )
        let red = loadState(
            key: "red-line",
            accentColorID: "red",
            defaults: defaults
        )
        try expect(blue.accentColorID == "blue", "Blue accent was not persisted")
        try expect(red.accentColorID == "red", "Red accent was not independent")

        let blueReloaded = loadState(
            key: "blue-line",
            accentColorID: "blue",
            defaults: defaults
        )
        try expect(blueReloaded.accentColorID == "blue", "Accent changed on normal reload")
    }

    private static func smallReferenceBehavior() throws {
        let defaults = try makeDefaults("small-reference")
        let key = "small-red-line"
        _ = RequiredPDPStateStore.adjustLength(
            configurationKey: key,
            startingLength: 200,
            increment: 50,
            delta: 1,
            hoseID: "1.75",
            configuredCoefficient: 15.5,
            accentColorID: "orange",
            defaults: defaults
        )

        let redLine = RequiredPDPStateStore.fixedReferenceState(
            startingLength: 200,
            hoseID: "1.88",
            configuredCoefficient: 8.25,
            accentColorID: "red"
        )
        let blueLine = RequiredPDPStateStore.fixedReferenceState(
            startingLength: 300,
            hoseID: "2.5",
            configuredCoefficient: 2,
            accentColorID: "blue"
        )

        try expect(redLine.hoseLengthFeet == 200, "Small widget did not use Starting Length")
        try expect(redLine.coefficient == 8.25, "Small widget ignored its custom coefficient")
        try expect(redLine.accentColorID == "red", "Small widget ignored its accent")
        try expect(blueLine.hoseLengthFeet == 300, "Second Small widget inherited length")
        try expect(blueLine.coefficient == 2, "Second Small widget inherited coefficient")
        try expect(blueLine.accentColorID == "blue", "Second Small widget inherited accent")

        let redResult = RequiredPDPCalculation.calculate(
            coefficient: redLine.coefficient,
            flowGPM: 160,
            nozzlePressure: 50,
            hoseLengthFeet: redLine.hoseLengthFeet
        )
        let sharedResult = RequiredPDPCalculation.calculate(
            coefficient: 8.25,
            flowGPM: 160,
            nozzlePressure: 50,
            hoseLengthFeet: 200
        )
        try expect(redResult == sharedResult, "Small widget calculation diverged from shared logic")
        try expect(
            redResult.roundedFrictionLoss == sharedResult.roundedFrictionLoss,
            "Small widget friction-loss rounding diverged"
        )
        try expect(
            redResult.roundedRequiredPDP == sharedResult.roundedRequiredPDP,
            "Small widget PDP rounding diverged"
        )

        let interactiveState = RequiredPDPStateStore.load(
            configurationKey: key,
            startingLength: 200,
            increment: 50,
            hoseID: "1.75",
            configuredCoefficient: 15.5,
            accentColorID: "orange",
            defaults: defaults
        )
        try expect(
            interactiveState.hoseLengthFeet == 250,
            "Small reference state mutated interactive length persistence"
        )
    }

    private static func smallDisplayFormatting() throws {
        let display = RequiredPDPSmallDisplay(
            packageName: "Red Line",
            hoseLabel: "1.88\"",
            hoseAccessibilityLabel: "1.88",
            hoseLengthFeet: 200,
            flowGPM: 160,
            nozzlePressure: 50,
            result: RequiredPDPResult(frictionLoss: 41.4, requiredPDP: 91.4)
        )

        try expect(display.pdpValue == "91", "Small visible PDP formatting changed")
        try expect(!display.pdpValue.contains("PSI"), "Small visible PDP includes PSI")
        try expect(display.frictionLossValue == "41", "Small visible FL formatting changed")
        try expect(!display.frictionLossValue.contains("PSI"), "Small visible FL includes PSI")
        try expect(display.flowValue == "160", "Small GPM value formatting changed")
        try expect(
            display.detailLine == "1.88\" • 200' • NP 50",
            "Small package details are not on the required single line"
        )
        try expect(
            display.accessibilitySummary ==
                "Red Line. Required PDP 91 PSI. 1.88 inch hose, 200 feet, " +
                "nozzle pressure 50 PSI, flow 160 GPM, friction loss 41 PSI.",
            "Small accessibility summary lost hydraulic units"
        )
    }

    private static func mediumDisplayFormatting() throws {
        let display = RequiredPDPMediumDisplay(
            packageName: "Red Line",
            hoseLabel: "1.88\"",
            hoseAccessibilityLabel: "1.88",
            hoseLengthFeet: 200,
            flowGPM: 160,
            nozzlePressure: 50,
            result: RequiredPDPResult(frictionLoss: 41.4, requiredPDP: 91.4)
        )

        try expect(
            [
                display.flowLabel,
                display.pdpLabel,
                display.frictionLossLabel
            ] == ["GPM", "PDP:", "FL"],
            "Medium primary row lost an operational metric"
        )
        try expect(display.pdpValue == "91", "Medium visible PDP formatting changed")
        try expect(!display.pdpValue.contains("PSI"), "Medium visible PDP includes PSI")
        try expect(display.flowValue == "160", "Medium visible GPM formatting changed")
        try expect(display.frictionLossValue == "41", "Medium visible FL formatting changed")
        try expect(!display.frictionLossValue.contains("PSI"), "Medium visible FL includes PSI")
        try expect(
            display.packageLine == "200' • 1.88\" • NP 50",
            "Medium package line lost length, Hose Size, or NP"
        )
        try expect(!display.packageLine.contains("GPM"), "Medium package line duplicates GPM")
        try expect(!display.packageLine.contains("PDP"), "Medium package line duplicates PDP")
        try expect(!display.packageLine.contains("FL"), "Medium package line duplicates FL")
        let expectedPackageLines: [(Int, String, Int, String)] = [
            (100, "1.75\"", 55, "100' • 1.75\" • NP 55"),
            (200, "1.88\"", 50, "200' • 1.88\" • NP 50"),
            (200, "2.5\"", 40, "200' • 2.5\" • NP 40"),
            (1_000, "2.5\"", 50, "1000' • 2.5\" • NP 50")
        ]
        for (length, hose, nozzlePressure, expected) in expectedPackageLines {
            let packageDisplay = RequiredPDPMediumDisplay(
                packageName: "Test Package",
                hoseLabel: hose,
                hoseAccessibilityLabel: hose.replacingOccurrences(of: "\"", with: ""),
                hoseLengthFeet: length,
                flowGPM: 160,
                nozzlePressure: nozzlePressure,
                result: RequiredPDPResult(frictionLoss: 20, requiredPDP: 70)
            )
            try expect(packageDisplay.packageLine == expected, "Medium package line formatting changed")
            try expect(!packageDisplay.packageLine.contains("\n"), "Medium package line contains a line break")
        }
        try expect(
            display.accessibilitySummary ==
                "Red Line. Hose length 200 feet. Required PDP 91 PSI. Flow 160 GPM. " +
                "Friction loss 41 PSI. 1.88 inch hose. Nozzle pressure 50 PSI.",
            "Medium accessibility summary lost hydraulic units"
        )
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
                hoseID: "1.75",
                configuredCoefficient: 15.5,
                accentColorID: "orange",
                defaults: defaults
            )
            try expect(increased.hoseLengthFeet == increment * 2, "\(increment)-foot increment failed")

            _ = RequiredPDPStateStore.adjustLength(
                configurationKey: key,
                startingLength: increment,
                increment: increment,
                delta: -1,
                hoseID: "1.75",
                configuredCoefficient: 15.5,
                accentColorID: "orange",
                defaults: defaults
            )
            let minimum = RequiredPDPStateStore.adjustLength(
                configurationKey: key,
                startingLength: increment,
                increment: increment,
                delta: -1,
                hoseID: "1.75",
                configuredCoefficient: 15.5,
                accentColorID: "orange",
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
                hoseID: "1.75",
                configuredCoefficient: 15.5,
                accentColorID: "orange",
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
            hoseID: "1.75",
            configuredCoefficient: 15.5,
            accentColorID: "orange",
            defaults: defaults
        )
        let front = RequiredPDPStateStore.load(
            configurationKey: "front-crosslay",
            startingLength: 200,
            increment: 50,
            hoseID: "1.75",
            configuredCoefficient: 15.5,
            accentColorID: "orange",
            defaults: defaults
        )
        let rear = RequiredPDPStateStore.load(
            configurationKey: "rear-crosslay",
            startingLength: 150,
            increment: 25,
            hoseID: "1.88",
            configuredCoefficient: 8,
            accentColorID: "blue",
            defaults: defaults
        )
        try expect(front.hoseLengthFeet == 250, "First widget state was not saved")
        try expect(rear.hoseLengthFeet == 150, "Second widget inherited another widget's state")
        try expect(front.coefficient == 15.5, "First widget coefficient was not independent")
        try expect(rear.coefficient == 8, "Second widget inherited another widget's coefficient")
        try expect(front.accentColorID == "orange", "First widget accent was not independent")
        try expect(rear.accentColorID == "blue", "Second widget inherited another widget's accent")
    }

    private static func configurationChangesUseNewState() throws {
        let original = RequiredPDPCalculation.configurationKey(
            packageName: "Front Crosslay"
        )
        let updated = RequiredPDPCalculation.configurationKey(
            packageName: "Rear Crosslay"
        )
        try expect(original != updated, "Package identities were not independent")
    }

    private static func tankTimeRegression() throws {
        try expect(TankTimeCalculation.clampedFlow(25) == 50, "Tank Time minimum flow changed")
        try expect(TankTimeCalculation.clampedFlow(2_500) == 2_000, "Tank Time maximum flow changed")
        try expect(
            TankTimeCalculation.durationSeconds(tankGallons: 750, flowGPM: 200) == 225,
            "Tank Time duration calculation changed"
        )
        try expect(TankTimeCalculation.displayTime(seconds: 225) == "03:45", "Tank Time display changed")
    }

    private static func loadState(
        key: String,
        hoseID: String = "1.75",
        coefficient: Double? = 15.5,
        accentColorID: String = "orange",
        defaults: UserDefaults
    ) -> RequiredPDPState {
        RequiredPDPStateStore.load(
            configurationKey: key,
            startingLength: 200,
            increment: 50,
            hoseID: hoseID,
            configuredCoefficient: coefficient,
            accentColorID: accentColorID,
            defaults: defaults
        )
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
