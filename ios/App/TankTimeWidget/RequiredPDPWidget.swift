import AppIntents
import OSLog
import SwiftUI
import UIKit
import WidgetKit

private enum RequiredPDPDiagnostics {
    private static let logger = Logger(
        subsystem: "app.reverseflow.mobile.widget",
        category: "required-pdp"
    )

    static func provider(
        event: String,
        family: WidgetFamily,
        configuration: RequiredPDPConfigurationIntent,
        state: RequiredPDPState
    ) {
#if DEBUG
        let result = RequiredPDPCalculation.calculate(
            coefficient: state.coefficient,
            flowGPM: configuration.flowGPM,
            nozzlePressure: configuration.nozzlePressure,
            hoseLengthFeet: state.hoseLengthFeet
        )
        let familyName = String(describing: family)
        let safeFlow = RequiredPDPCalculation.normalizedFlow(configuration.flowGPM)
        let safeNozzlePressure = RequiredPDPCalculation.normalizedNozzlePressure(
            configuration.nozzlePressure
        )
        let usedFallback = safeFlow != configuration.flowGPM
            || safeNozzlePressure != configuration.nozzlePressure
            || RequiredPDPCalculation.validatedCoefficient(configuration.coefficient) == nil
            || state.hoseID != configuration.hoseSize.rawValue
            || state.accentColorID != configuration.accentColor.rawValue
        logger.debug(
            "\(event, privacy: .public) family=\(familyName, privacy: .public) hose=\(state.hoseID, privacy: .public) length=\(state.hoseLengthFeet) flow=\(safeFlow) np=\(safeNozzlePressure) coefficient=\(state.coefficient) accent=\(state.accentColorID, privacy: .public) fallback=\(usedFallback) fl=\(result.frictionLoss) pdp=\(result.requiredPDP)"
        )
#endif
    }

    static func render(
        family: WidgetFamily,
        configuration: RequiredPDPConfigurationIntent,
        state: RequiredPDPState
    ) {
#if DEBUG
        provider(event: "render", family: family, configuration: configuration, state: state)
#endif
    }
}

struct RequiredPDPEntry: TimelineEntry {
    let date: Date
    let configuration: RequiredPDPConfigurationIntent
    let state: RequiredPDPState

    func state(for family: WidgetFamily) -> RequiredPDPState {
        RequiredPDPStateStore.displayState(
            interactiveState: state,
            isSmall: family == .systemSmall,
            startingLength: configuration.startingLength,
            hoseID: configuration.hoseSize.rawValue,
            configuredCoefficient: configuration.coefficient,
            accentColorID: configuration.accentColor.rawValue
        )
    }

    func result(for family: WidgetFamily) -> RequiredPDPResult {
        let displayState = state(for: family)
        return RequiredPDPCalculation.calculate(
            coefficient: displayState.coefficient,
            flowGPM: configuration.flowGPM,
            nozzlePressure: configuration.nozzlePressure,
            hoseLengthFeet: displayState.hoseLengthFeet
        )
    }

    var flowGPM: Int {
        RequiredPDPCalculation.normalizedFlow(configuration.flowGPM)
    }

    var nozzlePressure: Int {
        RequiredPDPCalculation.normalizedNozzlePressure(configuration.nozzlePressure)
    }
}

struct RequiredPDPProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RequiredPDPEntry {
        let entry = RequiredPDPEntry(
            date: .now,
            configuration: RequiredPDPConfigurationIntent(),
            state: RequiredPDPState(hoseLengthFeet: 200)
        )
        RequiredPDPDiagnostics.provider(
            event: "placeholder",
            family: context.family,
            configuration: entry.configuration,
            state: entry.state
        )
        return entry
    }

    func snapshot(
        for configuration: RequiredPDPConfigurationIntent,
        in context: Context
    ) async -> RequiredPDPEntry {
        let entry = entry(for: configuration)
        RequiredPDPDiagnostics.provider(
            event: "snapshot",
            family: context.family,
            configuration: configuration,
            state: entry.state
        )
        return entry
    }

    func timeline(
        for configuration: RequiredPDPConfigurationIntent,
        in context: Context
    ) async -> Timeline<RequiredPDPEntry> {
        let entry = entry(for: configuration)
        RequiredPDPDiagnostics.provider(
            event: "timeline",
            family: context.family,
            configuration: configuration,
            state: entry.state
        )
        return Timeline(entries: [entry], policy: .never)
    }

    private func entry(for configuration: RequiredPDPConfigurationIntent) -> RequiredPDPEntry {
        RequiredPDPEntry(
            date: .now,
            configuration: configuration,
            state: RequiredPDPStateStore.load(
                configurationKey: configuration.configurationKey,
                startingLength: configuration.startingLength,
                increment: configuration.lengthIncrement.rawValue,
                hoseID: configuration.hoseSize.rawValue,
                configuredCoefficient: configuration.coefficient,
                accentColorID: configuration.accentColor.rawValue
            )
        )
    }
}

struct RequiredPDPWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetRenderingMode) private var renderingMode

    let entry: RequiredPDPEntry
    let familyOverride: WidgetFamily?

    init(entry: RequiredPDPEntry, familyOverride: WidgetFamily? = nil) {
        self.entry = entry
        self.familyOverride = familyOverride
    }

    private let orange = Color(red: 0.984, green: 0.573, blue: 0.235)
    private let panel = Color(red: 0.055, green: 0.075, blue: 0.105)
    private let softPanel = Color.white.opacity(0.075)

    private var effectiveFamily: WidgetFamily { familyOverride ?? family }
    private var displayState: RequiredPDPState { entry.state(for: effectiveFamily) }
    private var result: RequiredPDPResult { entry.result(for: effectiveFamily) }
    private var isAccented: Bool { renderingMode == .accented }
    private var selectedAccent: Color {
        if isAccented { return .white }
        return switch displayState.accentColorID {
        case "red": Color(red: 1.0, green: 0.38, blue: 0.36)
        case "blue": Color(red: 0.35, green: 0.68, blue: 1.0)
        case "green": Color(red: 0.34, green: 0.84, blue: 0.52)
        case "yellow": Color(red: 1.0, green: 0.84, blue: 0.30)
        case "white": .white
        case "gray": Color(red: 0.74, green: 0.77, blue: 0.82)
        default: orange
        }
    }
    private var increment: Int { entry.configuration.lengthIncrement.rawValue }
    private var minimumLength: Int { max(RequiredPDPWidgetConstants.minimumLengthFeet, increment) }
    private var canDecrease: Bool { displayState.hoseLengthFeet > minimumLength }
    private var canIncrease: Bool { displayState.hoseLengthFeet < RequiredPDPWidgetConstants.maximumLengthFeet }
    private var smallDisplay: RequiredPDPSmallDisplay {
        RequiredPDPSmallDisplay(
            packageName: entry.configuration.effectivePackageName,
            hoseLabel: entry.configuration.hoseSize.hose.label,
            hoseAccessibilityLabel: entry.configuration.hoseSize.rawValue,
            hoseLengthFeet: displayState.hoseLengthFeet,
            flowGPM: entry.flowGPM,
            nozzlePressure: entry.nozzlePressure,
            result: result
        )
    }
    private var mediumDisplay: RequiredPDPMediumDisplay {
        RequiredPDPMediumDisplay(
            packageName: entry.configuration.effectivePackageName,
            hoseLabel: entry.configuration.hoseSize.hose.label,
            hoseAccessibilityLabel: entry.configuration.hoseSize.rawValue,
            hoseLengthFeet: displayState.hoseLengthFeet,
            flowGPM: entry.flowGPM,
            nozzlePressure: entry.nozzlePressure,
            result: result
        )
    }

    private var appIconImage: Image {
        guard
            let iconURL = Bundle.main.url(forResource: "AppIcon-1024", withExtension: "png"),
            let icon = UIImage(contentsOfFile: iconURL.path)
        else {
            return Image(systemName: "flame.fill")
        }
        return Image(uiImage: icon)
    }

    var body: some View {
        let _ = RequiredPDPDiagnostics.render(
            family: effectiveFamily,
            configuration: entry.configuration,
            state: displayState
        )
        Group {
            if effectiveFamily == .systemSmall {
                smallLayout
            } else if effectiveFamily == .systemLarge {
                largeLayout
            } else {
                mediumLayout
            }
        }
        .foregroundStyle(.white)
        .containerBackground(for: .widget) {
            ZStack {
                panel
                LinearGradient(
                    colors: [Color.white.opacity(0.055), Color.clear],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                if !isAccented {
                    Rectangle()
                        .fill(selectedAccent)
                        .frame(height: 4)
                        .frame(maxHeight: .infinity, alignment: .top)
                }
            }
        }
    }

    private var smallLayout: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 7) {
                appIconImage
                    .resizable()
                    .scaledToFit()
                    .frame(width: 21, height: 21)
                    .clipShape(RoundedRectangle(cornerRadius: 5, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 5, style: .continuous)
                            .stroke(Color.white.opacity(0.16), lineWidth: 1)
                    )
                    .widgetAccentable()
                    .accessibilityHidden(true)
                Text(entry.configuration.effectivePackageName)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
            }
            Spacer(minLength: 2)
            VStack(spacing: -5) {
                Text("PDP:")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .foregroundStyle(.white.opacity(0.68))
                Text(smallDisplay.pdpValue)
                    .font(.system(size: 50, weight: .black, design: .rounded))
                    .monospacedDigit()
                    .tracking(-1)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .foregroundStyle(selectedAccent)
                    .widgetAccentable()
            }
            .frame(maxWidth: .infinity)
            Spacer(minLength: 1)
            Text(smallDisplay.detailLine)
                .font(.system(size: 9.5, weight: .bold, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.72)
                .foregroundStyle(.white.opacity(0.78))
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)
            Rectangle()
                .fill(Color.white.opacity(0.16))
                .frame(height: 1)
                .padding(.vertical, 4)
            HStack(spacing: 0) {
                smallMetric(label: "GPM", value: smallDisplay.flowValue)
                Rectangle()
                    .fill(Color.white.opacity(0.16))
                    .frame(width: 1, height: 34)
                    .padding(.horizontal, 5)
                smallMetric(label: "FL", value: smallDisplay.frictionLossValue)
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(smallDisplay.accessibilitySummary)
    }

    private func smallMetric(label: String, value: String) -> some View {
        VStack(spacing: -1) {
            Text(label)
                .font(.system(size: 8, weight: .black, design: .rounded))
                .foregroundStyle(selectedAccent.opacity(0.88))
                .widgetAccentable()
            Text(value)
                .font(.system(size: 27, weight: .black, design: .rounded))
                .monospacedDigit()
                .tracking(-0.5)
                .lineLimit(1)
                .minimumScaleFactor(0.58)
        }
        .frame(maxWidth: .infinity)
    }

    private var mediumLayout: some View {
        VStack(spacing: 0) {
            header(iconSize: 25, brandSize: 9, packageSize: 12, packageMinimumScale: 0.85)
            Spacer(minLength: 5)
            HStack(spacing: 0) {
                mediumMetric(
                    label: mediumDisplay.flowLabel,
                    value: mediumDisplay.flowValue,
                    valueSize: 34,
                    accentsLabel: true
                )
                mediumDivider
                mediumMetric(
                    label: mediumDisplay.pdpLabel,
                    value: mediumDisplay.pdpValue,
                    valueSize: 48,
                    isPrimary: true
                )
                mediumDivider
                mediumMetric(
                    label: mediumDisplay.frictionLossLabel,
                    value: mediumDisplay.frictionLossValue,
                    valueSize: 34,
                    accentsLabel: true
                )
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(mediumDisplay.accessibilitySummary)
            Spacer(minLength: 4)
            Rectangle()
                .fill(Color.white.opacity(0.16))
                .frame(height: 1)
            Spacer(minLength: 5)
            HStack(spacing: 10) {
                Text(mediumDisplay.packageLine)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(.white.opacity(0.94))
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                    .accessibilityHidden(true)
                Spacer(minLength: 8)
                controls(height: 32, spacing: 7)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
    }

    private var mediumDivider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.16))
            .frame(width: 1, height: 50)
            .padding(.horizontal, 5)
    }

    private func mediumMetric(
        label: String,
        value: String,
        valueSize: CGFloat,
        isPrimary: Bool = false,
        accentsLabel: Bool = false
    ) -> some View {
        VStack(spacing: isPrimary ? -4 : -1) {
            Text(label)
                .font(.system(size: isPrimary ? 10 : 9, weight: .black, design: .rounded))
                .tracking(isPrimary ? 0 : 0.5)
                .foregroundStyle(
                    isPrimary || accentsLabel
                        ? selectedAccent.opacity(isPrimary ? 1 : 0.86)
                        : Color.white.opacity(0.62)
                )
                .widgetAccentable()
            Text(value)
                .font(.system(size: valueSize, weight: .black, design: .rounded))
                .monospacedDigit()
                .tracking(isPrimary ? -1 : -0.5)
                .lineLimit(1)
                .minimumScaleFactor(0.48)
                .foregroundStyle(isPrimary ? selectedAccent : .white)
                .contentTransition(.numericText())
                .widgetAccentable(isPrimary)
        }
        .frame(maxWidth: .infinity)
    }

    private var largeLayout: some View {
        VStack(spacing: 0) {
            header(iconSize: 40, brandSize: 12, packageSize: 16)
            Spacer(minLength: 12)
            pdpValue(fontSize: 68)
                .frame(maxWidth: .infinity)
            Spacer(minLength: 12)
            HStack(spacing: 12) {
                metricPanel(
                    label: "HOSE LENGTH",
                    value: "\(displayState.hoseLengthFeet)'",
                    accessibility: "Hose length \(displayState.hoseLengthFeet) feet"
                )
                metricPanel(
                    label: "FRICTION LOSS",
                    value: "\(result.roundedFrictionLoss) PSI",
                    accessibility: "Friction loss \(result.roundedFrictionLoss) PSI"
                )
            }
            Spacer(minLength: 12)
            packageSummary(fontSize: 14)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(RoundedRectangle(cornerRadius: 12).fill(softPanel))
            Spacer(minLength: 12)
            controls(height: 48, spacing: 12)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 18)
    }

    private func header(
        iconSize: CGFloat,
        brandSize: CGFloat,
        packageSize: CGFloat,
        packageMinimumScale: CGFloat = 0.65
    ) -> some View {
        HStack(spacing: 0) {
            HStack(spacing: 8) {
                appIconImage
                    .resizable()
                    .scaledToFit()
                    .frame(width: iconSize, height: iconSize)
                    .clipShape(RoundedRectangle(cornerRadius: iconSize * 0.22, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: iconSize * 0.22, style: .continuous)
                            .stroke(Color.white.opacity(0.16), lineWidth: 1)
                    )
                    .widgetAccentable()
                    .accessibilityHidden(true)
                Text("REVERSE FLOW")
                    .font(.system(size: brandSize, weight: .black, design: .rounded))
                    .tracking(0.6)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
            }
            Spacer(minLength: 10)
            Text(entry.configuration.effectivePackageName)
                .font(.system(size: packageSize, weight: .black, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(packageMinimumScale)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .multilineTextAlignment(.trailing)
                .accessibilityLabel("Package \(entry.configuration.effectivePackageName)")
        }
    }

    private func pdpValue(fontSize: CGFloat) -> some View {
        Text("PDP: \(result.roundedRequiredPDP) PSI")
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.52)
            .foregroundStyle(selectedAccent)
            .contentTransition(.numericText())
            .widgetAccentable()
            .accessibilityLabel("Pump discharge pressure \(result.roundedRequiredPDP) PSI")
    }

    private func lengthValue(fontSize: CGFloat) -> some View {
        Text("\(displayState.hoseLengthFeet)'")
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .contentTransition(.numericText())
            .accessibilityLabel("Hose length \(displayState.hoseLengthFeet) feet")
    }

    private func packageSummary(fontSize: CGFloat) -> some View {
        Text(
            "\(entry.configuration.hoseSize.hose.label) • " +
            "\(entry.flowGPM) GPM • " +
            "NP \(entry.nozzlePressure)"
        )
        .font(.system(size: fontSize, weight: .bold, design: .rounded))
        .foregroundStyle(.white.opacity(0.72))
        .lineLimit(1)
        .minimumScaleFactor(0.65)
        .accessibilityLabel(
            "\(entry.configuration.hoseSize.hose.label) hose, " +
            "\(entry.flowGPM) gallons per minute, " +
            "\(entry.nozzlePressure) PSI nozzle pressure"
        )
    }

    private func frictionLoss(fontSize: CGFloat) -> some View {
        Text("FL: \(result.roundedFrictionLoss) PSI")
            .font(.system(size: fontSize, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(.white.opacity(0.72))
            .accessibilityLabel("Friction loss \(result.roundedFrictionLoss) PSI")
    }

    private func metricPanel(label: String, value: String, accessibility: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.62))
                .tracking(0.8)
            Text(value)
                .font(.system(size: 34, weight: .black, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(RoundedRectangle(cornerRadius: 14).fill(softPanel))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.12), lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibility)
    }

    private func controls(height: CGFloat, spacing: CGFloat) -> some View {
        HStack(spacing: spacing) {
            lengthButton(direction: -1, height: height, enabled: canDecrease)
            lengthButton(direction: 1, height: height, enabled: canIncrease)
        }
    }

    private func lengthButton(direction: Int, height: CGFloat, enabled: Bool) -> some View {
        let label = direction < 0 ? "−\(increment)'" : "+\(increment)'"
        return Button(
            intent: AdjustRequiredPDPLengthIntent(
                configurationKey: entry.configuration.configurationKey,
                startingLength: entry.configuration.startingLength,
                increment: increment,
                direction: direction,
                hoseID: entry.configuration.hoseSize.rawValue,
                coefficient: entry.configuration.coefficient,
                accentColorID: entry.configuration.accentColor.rawValue
            )
        ) {
            Text(label)
                .font(.system(size: height >= 44 ? 14 : 10, weight: .black, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.white)
                .padding(.horizontal, height >= 44 ? 28 : 13)
                .frame(maxWidth: height >= 44 ? .infinity : nil)
                .frame(height: height)
                .background(
                    RoundedRectangle(cornerRadius: height * 0.25)
                        .fill(Color.white.opacity(enabled ? 0.11 : 0.045))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: height * 0.25)
                        .stroke(Color.white.opacity(enabled ? 0.22 : 0.08), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .accessibilityLabel(
            direction < 0
                ? "Decrease hose length by \(increment) feet"
                : "Increase hose length by \(increment) feet"
        )
        .accessibilityHint(
            enabled
                ? "Updates the required pump discharge pressure."
                : "Hose length is at its allowed limit."
        )
    }
}

struct RequiredPDPWidget: Widget {
    static let kind = RequiredPDPWidgetConstants.kind

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: Self.kind,
            intent: RequiredPDPConfigurationIntent.self,
            provider: RequiredPDPProvider()
        ) { entry in
            RequiredPDPWidgetView(entry: entry)
        }
        .configurationDisplayName("Required PDP")
        .description("Required pump discharge pressure for one configured attack-line package.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

#Preview("Required PDP — Small", as: .systemSmall) {
    RequiredPDPWidget()
} timeline: {
    RequiredPDPEntry(
        date: .now,
        configuration: RequiredPDPConfigurationIntent(),
        state: RequiredPDPStateStore.fixedReferenceState(
            startingLength: 200,
            hoseID: "1.75",
            configuredCoefficient: 15.5,
            accentColorID: "orange"
        )
    )
}

#Preview("Required PDP — Medium", as: .systemMedium) {
    RequiredPDPWidget()
} timeline: {
    RequiredPDPEntry(
        date: .now,
        configuration: RequiredPDPConfigurationIntent(),
        state: RequiredPDPState(hoseLengthFeet: 200)
    )
}

#Preview("Required PDP — Large", as: .systemLarge) {
    RequiredPDPWidget()
} timeline: {
    RequiredPDPEntry(
        date: .now,
        configuration: RequiredPDPConfigurationIntent(),
        state: RequiredPDPState(hoseLengthFeet: 300)
    )
}
