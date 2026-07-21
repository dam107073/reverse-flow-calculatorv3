import AppIntents
import WidgetKit

@available(iOS 17.0, *)
enum TankCapacity: Int, AppEnum {
    case gallons500 = 500
    case gallons750 = 750
    case gallons1000 = 1_000
    case gallons1250 = 1_250
    case gallons1500 = 1_500
    case gallons1800 = 1_800
    case gallons2000 = 2_000
    case gallons3000 = 3_000

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Tank Size")
    static var caseDisplayRepresentations: [TankCapacity: DisplayRepresentation] = [
        .gallons500: "500 gallons",
        .gallons750: "750 gallons",
        .gallons1000: "1000 gallons",
        .gallons1250: "1250 gallons",
        .gallons1500: "1500 gallons",
        .gallons1800: "1800 gallons",
        .gallons2000: "2000 gallons",
        .gallons3000: "3000 gallons"
    ]
}

@available(iOS 17.0, *)
struct TankTimeConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Tank Time"
    static var description = IntentDescription("Choose the apparatus tank capacity.")

    @Parameter(title: "Tank Size", default: .gallons750)
    var tankCapacity: TankCapacity
}

@available(iOS 17.0, *)
struct AdjustTankFlowIntent: AppIntent {
    static var title: LocalizedStringResource = "Adjust Tank Flow"
    static var isDiscoverable = false

    @Parameter(title: "Tank Gallons")
    var tankGallons: Int

    @Parameter(title: "Flow Change")
    var delta: Int

    init() {}

    init(tankGallons: Int, delta: Int) {
        self.tankGallons = tankGallons
        self.delta = delta
    }

    func perform() async throws -> some IntentResult {
        TankTimeStateStore.adjustFlow(tankGallons: tankGallons, delta: delta)
        WidgetCenter.shared.reloadTimelines(ofKind: TankTimeWidgetConstants.kind)
        return .result()
    }
}

@available(iOS 17.0, *)
struct StartTankTimeIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Tank Time"
    static var isDiscoverable = false

    @Parameter(title: "Tank Gallons")
    var tankGallons: Int

    init() {}

    init(tankGallons: Int) {
        self.tankGallons = tankGallons
    }

    func perform() async throws -> some IntentResult {
        TankTimeStateStore.start(tankGallons: tankGallons)
        WidgetCenter.shared.reloadTimelines(ofKind: TankTimeWidgetConstants.kind)
        return .result()
    }
}

@available(iOS 17.0, *)
struct ResetTankTimeIntent: AppIntent {
    static var title: LocalizedStringResource = "Reset Tank Time"
    static var isDiscoverable = false

    @Parameter(title: "Tank Gallons")
    var tankGallons: Int

    init() {}

    init(tankGallons: Int) {
        self.tankGallons = tankGallons
    }

    func perform() async throws -> some IntentResult {
        TankTimeStateStore.reset(tankGallons: tankGallons)
        WidgetCenter.shared.reloadTimelines(ofKind: TankTimeWidgetConstants.kind)
        return .result()
    }
}
