import AppIntents
import SwiftUI
import UIKit
import WidgetKit

struct RequiredPDPEntry: TimelineEntry {
    let date: Date
    let configuration: RequiredPDPConfigurationIntent
    let state: RequiredPDPState

    var result: RequiredPDPResult {
        RequiredPDPCalculation.calculate(
            coefficient: state.coefficient,
            flowGPM: configuration.flowGPM,
            nozzlePressure: configuration.nozzlePressure,
            hoseLengthFeet: state.hoseLengthFeet
        )
    }
}

struct RequiredPDPProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RequiredPDPEntry {
        RequiredPDPEntry(
            date: .now,
            configuration: RequiredPDPConfigurationIntent(),
            state: RequiredPDPState(hoseLengthFeet: 200)
        )
    }

    func snapshot(
        for configuration: RequiredPDPConfigurationIntent,
        in context: Context
    ) async -> RequiredPDPEntry {
        entry(for: configuration, family: context.family)
    }

    func timeline(
        for configuration: RequiredPDPConfigurationIntent,
        in context: Context
    ) async -> Timeline<RequiredPDPEntry> {
        Timeline(entries: [entry(for: configuration, family: context.family)], policy: .never)
    }

    private func entry(
        for configuration: RequiredPDPConfigurationIntent,
        family: WidgetFamily
    ) -> RequiredPDPEntry {
        let state = if family == .systemSmall {
            RequiredPDPStateStore.fixedReferenceState(
                startingLength: configuration.startingLength,
                hoseID: configuration.hoseSize.rawValue,
                configuredCoefficient: configuration.coefficient,
                accentColorID: configuration.accentColor.rawValue
            )
        } else {
            RequiredPDPStateStore.load(
                configurationKey: configuration.configurationKey,
                startingLength: configuration.startingLength,
                increment: configuration.lengthIncrement.rawValue,
                hoseID: configuration.hoseSize.rawValue,
                configuredCoefficient: configuration.coefficient,
                accentColorID: configuration.accentColor.rawValue
            )
        }

        return RequiredPDPEntry(
            date: .now,
            configuration: configuration,
            state: state
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
    private var isAccented: Bool { renderingMode == .accented }
    private var selectedAccent: Color {
        if isAccented { return .white }
        return switch entry.state.accentColorID {
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
    private var canDecrease: Bool { entry.state.hoseLengthFeet > minimumLength }
    private var canIncrease: Bool { entry.state.hoseLengthFeet < RequiredPDPWidgetConstants.maximumLengthFeet }

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
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.68)
            }
            Spacer(minLength: 5)
            pdpValue(fontSize: 27)
            Spacer(minLength: 6)
            Text("\(entry.configuration.hoseSize.hose.label) • \(entry.state.hoseLengthFeet)'")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.78)
                .foregroundStyle(.white.opacity(0.78))
            Text(
                "\(entry.configuration.flowGPM) GPM • " +
                "NP \(entry.configuration.nozzlePressure)"
            )
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.72)
            .foregroundStyle(.white.opacity(0.72))
            frictionLoss(fontSize: 11)
                .lineLimit(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 11)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(smallAccessibilitySummary)
    }

    private var smallAccessibilitySummary: String {
        "\(entry.configuration.effectivePackageName). " +
        "Required PDP \(entry.result.roundedRequiredPDP) PSI. " +
        "\(entry.configuration.hoseSize.rawValue) inch hose, " +
        "\(entry.state.hoseLengthFeet) feet, " +
        "\(entry.configuration.flowGPM) GPM, " +
        "nozzle pressure \(entry.configuration.nozzlePressure) PSI, " +
        "friction loss \(entry.result.roundedFrictionLoss) PSI."
    }

    private var mediumLayout: some View {
        VStack(spacing: 3) {
            header(iconSize: 27, brandSize: 9, packageSize: 12)
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                lengthValue(fontSize: 32)
                Spacer(minLength: 4)
                pdpValue(fontSize: 36)
            }
            packageSummary(fontSize: 11)
            HStack {
                frictionLoss(fontSize: 11)
                Spacer(minLength: 8)
                controls(height: 31, spacing: 8)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 7)
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
                    value: "\(entry.state.hoseLengthFeet)'",
                    accessibility: "Hose length \(entry.state.hoseLengthFeet) feet"
                )
                metricPanel(
                    label: "FRICTION LOSS",
                    value: "\(entry.result.roundedFrictionLoss) PSI",
                    accessibility: "Friction loss \(entry.result.roundedFrictionLoss) PSI"
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

    private func header(iconSize: CGFloat, brandSize: CGFloat, packageSize: CGFloat) -> some View {
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
                .minimumScaleFactor(0.65)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .multilineTextAlignment(.trailing)
                .accessibilityLabel("Package \(entry.configuration.effectivePackageName)")
        }
    }

    private func pdpValue(fontSize: CGFloat) -> some View {
        Text("PDP: \(entry.result.roundedRequiredPDP) PSI")
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.52)
            .foregroundStyle(selectedAccent)
            .contentTransition(.numericText())
            .widgetAccentable()
            .accessibilityLabel("Pump discharge pressure \(entry.result.roundedRequiredPDP) PSI")
    }

    private func lengthValue(fontSize: CGFloat) -> some View {
        Text("\(entry.state.hoseLengthFeet)'")
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .contentTransition(.numericText())
            .accessibilityLabel("Hose length \(entry.state.hoseLengthFeet) feet")
    }

    private func packageSummary(fontSize: CGFloat) -> some View {
        Text(
            "\(entry.configuration.hoseSize.hose.label) • " +
            "\(entry.configuration.flowGPM) GPM • " +
            "NP \(entry.configuration.nozzlePressure)"
        )
        .font(.system(size: fontSize, weight: .bold, design: .rounded))
        .foregroundStyle(.white.opacity(0.72))
        .lineLimit(1)
        .minimumScaleFactor(0.65)
        .accessibilityLabel(
            "\(entry.configuration.hoseSize.hose.label) hose, " +
            "\(entry.configuration.flowGPM) gallons per minute, " +
            "\(entry.configuration.nozzlePressure) PSI nozzle pressure"
        )
    }

    private func frictionLoss(fontSize: CGFloat) -> some View {
        Text("FL: \(entry.result.roundedFrictionLoss) PSI")
            .font(.system(size: fontSize, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(.white.opacity(0.72))
            .accessibilityLabel("Friction loss \(entry.result.roundedFrictionLoss) PSI")
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
