import AppIntents
import WidgetKit

@available(iOS 17.0, *)
enum RequiredPDPHoseSize: String, AppEnum {
    case one = "1"
    case oneAndHalf = "1.5"
    case oneAndThreeQuarter = "1.75"
    case oneAndSevenEighths = "1.88"
    case two = "2"
    case twoAndQuarter = "2.25"
    case twoAndHalf = "2.5"

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Hose Size")
    static var caseDisplayRepresentations: [RequiredPDPHoseSize: DisplayRepresentation] = [
        .one: "1 inch",
        .oneAndHalf: "1.5 inch",
        .oneAndThreeQuarter: "1.75 inch",
        .oneAndSevenEighths: "1.88 inch",
        .two: "2 inch",
        .twoAndQuarter: "2.25 inch",
        .twoAndHalf: "2.5 inch"
    ]

    var hose: RequiredPDPHose {
        RequiredPDPHoseCatalog.hose(id: rawValue)
    }
}

@available(iOS 17.0, *)
enum RequiredPDPLengthIncrement: Int, AppEnum {
    case feet25 = 25
    case feet50 = 50
    case feet100 = 100

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Length Increment")
    static var caseDisplayRepresentations: [RequiredPDPLengthIncrement: DisplayRepresentation] = [
        .feet25: "25 feet",
        .feet50: "50 feet",
        .feet100: "100 feet"
    ]
}

@available(iOS 17.0, *)
enum RequiredPDPAccentColor: String, AppEnum {
    case orange
    case red
    case blue
    case green
    case yellow
    case white
    case gray

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Accent Color")
    static var caseDisplayRepresentations: [RequiredPDPAccentColor: DisplayRepresentation] = [
        .orange: "Reverse Flow Orange",
        .red: "Red",
        .blue: "Blue",
        .green: "Green",
        .yellow: "Yellow",
        .white: "White",
        .gray: "Gray"
    ]
}

@available(iOS 17.0, *)
struct RequiredPDPConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Required PDP"
    static var description = IntentDescription("Configure one attack-line hose package.")

    @Parameter(title: "Package Name", default: "Required PDP")
    var packageName: String

    @Parameter(title: "Hose Size", default: .oneAndThreeQuarter)
    var hoseSize: RequiredPDPHoseSize

    @Parameter(
        title: "Coefficient (Tap to Edit)",
        description: "Tap to enter any numeric coefficient. The field starts with the standard 1.75-inch hose coefficient.",
        default: 15.5,
        controlStyle: .field,
        inclusiveRange: (0.01, 1_000)
    )
    var coefficient: Double?

    @Parameter(title: "Flow", default: 160, controlStyle: .field, inclusiveRange: (1, 2_000))
    var flowGPM: Int

    @Parameter(title: "Nozzle Pressure", default: 50, controlStyle: .field, inclusiveRange: (1, 300))
    var nozzlePressure: Int

    @Parameter(title: "Starting Length", default: 200, controlStyle: .field, inclusiveRange: (25, 2_000))
    var startingLength: Int

    @Parameter(title: "Length Increment", default: .feet50)
    var lengthIncrement: RequiredPDPLengthIncrement

    @Parameter(title: "Accent Color", default: .orange)
    var accentColor: RequiredPDPAccentColor

    var effectivePackageName: String {
        let trimmed = packageName.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "Required PDP" : trimmed
    }

    var configurationKey: String {
        RequiredPDPCalculation.configurationKey(
            packageName: effectivePackageName
        )
    }
}

@available(iOS 17.0, *)
struct AdjustRequiredPDPLengthIntent: AppIntent {
    static var title: LocalizedStringResource = "Adjust Required PDP Hose Length"
    static var isDiscoverable = false

    @Parameter(title: "Configuration Key")
    var configurationKey: String

    @Parameter(title: "Starting Length")
    var startingLength: Int

    @Parameter(title: "Length Increment")
    var increment: Int

    @Parameter(title: "Direction")
    var direction: Int

    @Parameter(title: "Hose Size")
    var hoseID: String

    @Parameter(title: "Coefficient")
    var coefficient: Double?

    @Parameter(title: "Accent Color")
    var accentColorID: String

    init() {}

    init(
        configurationKey: String,
        startingLength: Int,
        increment: Int,
        direction: Int,
        hoseID: String,
        coefficient: Double?,
        accentColorID: String
    ) {
        self.configurationKey = configurationKey
        self.startingLength = startingLength
        self.increment = increment
        self.direction = direction
        self.hoseID = hoseID
        self.coefficient = coefficient
        self.accentColorID = accentColorID
    }

    func perform() async throws -> some IntentResult {
        RequiredPDPStateStore.adjustLength(
            configurationKey: configurationKey,
            startingLength: startingLength,
            increment: increment,
            delta: direction,
            hoseID: hoseID,
            configuredCoefficient: coefficient,
            accentColorID: accentColorID
        )
        WidgetCenter.shared.reloadTimelines(ofKind: RequiredPDPWidgetConstants.kind)
        return .result()
    }
}
