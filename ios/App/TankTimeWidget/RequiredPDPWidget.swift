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
            coefficient: configuration.effectiveCoefficient,
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
        entry(for: configuration)
    }

    func timeline(
        for configuration: RequiredPDPConfigurationIntent,
        in context: Context
    ) async -> Timeline<RequiredPDPEntry> {
        Timeline(entries: [entry(for: configuration)], policy: .never)
    }

    private func entry(for configuration: RequiredPDPConfigurationIntent) -> RequiredPDPEntry {
        RequiredPDPEntry(
            date: .now,
            configuration: configuration,
            state: RequiredPDPStateStore.load(
                configurationKey: configuration.configurationKey,
                startingLength: configuration.startingLength,
                increment: configuration.lengthIncrement.rawValue
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
    private var isAccented: Bool { renderingMode == .accented }
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
            if effectiveFamily == .systemLarge {
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
                        .fill(orange)
                        .frame(height: 4)
                        .frame(maxHeight: .infinity, alignment: .top)
                }
            }
        }
    }

    private var mediumLayout: some View {
        VStack(spacing: 3) {
            header(iconSize: 29, subtitleSize: 8)
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                lengthValue(fontSize: 34)
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
            header(iconSize: 42, subtitleSize: 10)
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
                    value: "\(entry.result.formattedFrictionLoss) PSI",
                    accessibility: "Friction loss \(entry.result.formattedFrictionLoss) PSI"
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

    private func header(iconSize: CGFloat, subtitleSize: CGFloat) -> some View {
        HStack(spacing: 10) {
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
            VStack(alignment: .leading, spacing: 1) {
                Text(entry.configuration.effectivePackageName)
                    .font(.system(size: iconSize >= 40 ? 16 : 13, weight: .black, design: .rounded))
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                Text("REQUIRED PDP")
                    .font(.system(size: subtitleSize, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.64))
                    .tracking(0.8)
            }
            Spacer(minLength: 6)
            Text("REVERSE FLOW")
                .font(.system(size: subtitleSize, weight: .black, design: .rounded))
                .foregroundStyle(isAccented ? .white : orange)
                .tracking(0.6)
                .lineLimit(1)
                .widgetAccentable()
        }
    }

    private func pdpValue(fontSize: CGFloat) -> some View {
        Text("PDP: \(entry.result.roundedRequiredPDP) PSI")
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.52)
            .foregroundStyle(isAccented ? .white : orange)
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
            "\(entry.configuration.nozzlePressure) PSI NP"
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
        Text("FL: \(entry.result.formattedFrictionLoss) PSI")
            .font(.system(size: fontSize, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(.white.opacity(0.72))
            .accessibilityLabel("Friction loss \(entry.result.formattedFrictionLoss) PSI")
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
                direction: direction
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
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
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
