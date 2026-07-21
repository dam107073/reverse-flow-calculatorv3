import AppIntents
import SwiftUI
import UIKit
import WidgetKit

struct TankTimeEntry: TimelineEntry {
    let date: Date
    let tankGallons: Int
    let state: TankTimeState
}

struct TankTimeProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> TankTimeEntry {
        TankTimeEntry(date: Date(), tankGallons: 750, state: .initial)
    }

    func snapshot(for configuration: TankTimeConfigurationIntent, in context: Context) async -> TankTimeEntry {
        entry(for: configuration, date: Date())
    }

    func timeline(for configuration: TankTimeConfigurationIntent, in context: Context) async -> Timeline<TankTimeEntry> {
        let now = Date()
        let current = entry(for: configuration, date: now)
        var entries = [current]

        if let endDate = current.state.endDate, endDate > now {
            entries.append(contentsOf: TankTimeDisplayStatus.transitionDates(endDate: endDate, after: now).map {
                TankTimeEntry(
                    date: $0,
                    tankGallons: current.tankGallons,
                    state: current.state
                )
            })
        }

        return Timeline(entries: entries, policy: .never)
    }

    private func entry(for configuration: TankTimeConfigurationIntent, date: Date) -> TankTimeEntry {
        let gallons = configuration.tankCapacity.rawValue
        return TankTimeEntry(
            date: date,
            tankGallons: gallons,
            state: TankTimeStateStore.load(tankGallons: gallons)
        )
    }
}

struct TankTimeWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.widgetRenderingMode) private var renderingMode

    let entry: TankTimeEntry
    let familyOverride: WidgetFamily?

    init(entry: TankTimeEntry, familyOverride: WidgetFamily? = nil) {
        self.entry = entry
        self.familyOverride = familyOverride
    }

    private let orange = Color(red: 0.984, green: 0.573, blue: 0.235)
    private let panel = Color(red: 0.055, green: 0.075, blue: 0.105)
    private let softPanel = Color.white.opacity(0.075)
    private let green = Color(red: 0.30, green: 0.82, blue: 0.49)
    private let yellow = Color(red: 1.0, green: 0.80, blue: 0.25)
    private let red = Color(red: 0.98, green: 0.29, blue: 0.27)

    private var status: TankTimeDisplayStatus {
        TankTimeDisplayStatus.resolve(state: entry.state, at: entry.date)
    }

    private var effectiveFamily: WidgetFamily { familyOverride ?? family }

    private var isRunning: Bool { entry.state.isRunning(at: entry.date) }
    private var isAccented: Bool { renderingMode == .accented }

    private var appIconImage: Image {
        guard
            let iconURL = Bundle.main.url(forResource: "AppIcon-1024", withExtension: "png"),
            let icon = UIImage(contentsOfFile: iconURL.path)
        else {
            return Image(systemName: "flame.fill")
        }
        return Image(uiImage: icon)
    }

    private var statusText: String {
        switch status {
        case .estimated: "ESTIMATED TIME"
        case .remaining: "TIME REMAINING"
        case .lowWater: "LOW WATER"
        case .critical: "CRITICAL"
        case .empty: "TANK EMPTY"
        }
    }

    private var countdownColor: Color {
        if isAccented { return .white }
        return switch status {
        case .estimated, .remaining: green
        case .lowWater: yellow
        case .critical, .empty: red
        }
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
        VStack(spacing: 2) {
            brandHeader(iconSize: 31, capacityFontSize: 11)
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 0) {
                    countdown(fontSize: 50, alignment: .leading)
                    if entry.state.isLocked {
                        resetButton(height: 32, horizontalPadding: 18)
                    } else {
                        startButton(height: 32, horizontalPadding: 18)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .trailing, spacing: 0) {
                    flowSummary(valueSize: 25, compact: true)
                    if !entry.state.isLocked {
                        HStack(spacing: 8) {
                            flowButton(label: "−50", delta: -TankTimeCalculation.flowStepGPM, height: 32)
                            flowButton(label: "+50", delta: TankTimeCalculation.flowStepGPM, height: 32)
                        }
                    }
                }
                .frame(width: 136, alignment: .trailing)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 2)
    }

    private var largeLayout: some View {
        Group {
            if entry.state.isLocked {
                largeRunningLayout
            } else {
                largeIdleLayout
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 18)
    }

    private var largeIdleLayout: some View {
        VStack(spacing: 16) {
            brandHeader(iconSize: 48, capacityFontSize: 14)
            HStack(spacing: 14) {
                informationPanel {
                    countdown(fontSize: 76, alignment: .leading)
                }
                informationPanel {
                    flowSummary(valueSize: 44, compact: false)
                }
                .frame(width: 116)
            }
            Spacer(minLength: 0)
            HStack(spacing: 12) {
                flowButton(label: "−50", delta: -TankTimeCalculation.flowStepGPM, height: 52)
                flowButton(label: "+50", delta: TankTimeCalculation.flowStepGPM, height: 52)
                startButton(height: 52, horizontalPadding: 28)
            }
        }
    }

    private var largeRunningLayout: some View {
        VStack(spacing: 16) {
            brandHeader(iconSize: 42, capacityFontSize: 14)
            countdown(fontSize: 94, alignment: .center)
                .frame(maxWidth: .infinity)
            HStack(spacing: 12) {
                metricPanel(label: "TANK CAPACITY", value: "\(entry.tankGallons)", unit: "GAL")
                metricPanel(label: "LOCKED FLOW", value: "\(entry.state.flowGPM)", unit: "GPM")
            }
            Spacer(minLength: 0)
            resetButton(height: 52, horizontalPadding: 34)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    private func brandHeader(iconSize: CGFloat, capacityFontSize: CGFloat) -> some View {
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
                Text("REVERSE FLOW")
                    .font(.system(size: iconSize >= 40 ? 13 : 11, weight: .black, design: .rounded))
                    .tracking(0.8)
                Text("TANK TIME")
                    .font(.system(size: iconSize >= 40 ? 10 : 8, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.64))
                    .tracking(0.8)
            }
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            Spacer(minLength: 6)
            VStack(alignment: .trailing, spacing: 0) {
                Text("\(entry.tankGallons)")
                    .font(.system(size: capacityFontSize + 5, weight: .black, design: .rounded))
                    .monospacedDigit()
                Text("GAL")
                    .font(.system(size: capacityFontSize - 2, weight: .bold, design: .rounded))
            }
            .foregroundStyle(isAccented ? .white : orange)
            .widgetAccentable()
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Tank capacity \(entry.tankGallons) gallons")
        }
    }

    private func countdown(fontSize: CGFloat, alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: 0) {
            Text(statusText)
                .font(.system(size: fontSize >= 70 ? 12 : 9, weight: .black, design: .rounded))
                .tracking(1)
                .foregroundStyle(countdownColor)
                .widgetAccentable()
            Group {
                if status == .empty {
                    Text("00:00")
                } else if isRunning, let startDate = entry.state.startDate, let endDate = entry.state.endDate {
                    Text(timerInterval: startDate...endDate, countsDown: true, showsHours: false)
                } else {
                    Text(TankTimeCalculation.displayTime(seconds: TankTimeCalculation.durationSeconds(
                        tankGallons: entry.tankGallons,
                        flowGPM: entry.state.flowGPM
                    )))
                }
            }
            .font(.system(size: fontSize, weight: .black, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.62)
            .contentTransition(.numericText())
            .foregroundStyle(countdownColor)
            .widgetAccentable()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(status == .empty ? "Tank empty, zero minutes" : "\(statusText.lowercased()), tank time")
    }

    private func flowSummary(valueSize: CGFloat, compact: Bool) -> some View {
        VStack(spacing: compact ? 1 : 3) {
            Text(entry.state.isLocked ? "LOCKED FLOW" : "FLOW")
                .font(.system(size: compact ? 8 : 10, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.62))
                .tracking(0.8)
            Text("\(entry.state.flowGPM)")
                .font(.system(size: valueSize, weight: .black, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text("GPM")
                .font(.system(size: compact ? 8 : 10, weight: .bold, design: .rounded))
                .foregroundStyle(isAccented ? .white : orange)
                .widgetAccentable()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Flow \(entry.state.flowGPM) gallons per minute\(entry.state.isLocked ? ", locked" : "")")
    }

    private func informationPanel<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 16).fill(softPanel))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.12), lineWidth: 1))
    }

    private func metricPanel(label: String, value: String, unit: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.62))
                .tracking(0.8)
            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(value)
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .monospacedDigit()
                Text(unit)
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .foregroundStyle(isAccented ? .white : orange)
                    .widgetAccentable()
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 14).fill(softPanel))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.12), lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label.lowercased()) \(value) \(unit.lowercased())")
    }

    private func flowButton(label: String, delta: Int, height: CGFloat) -> some View {
        Button(intent: AdjustTankFlowIntent(tankGallons: entry.tankGallons, delta: delta)) {
            controlLabel(label, style: .secondary, height: height, horizontalPadding: 18)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(delta < 0 ? "Decrease flow by 50 gallons per minute" : "Increase flow by 50 gallons per minute")
    }

    private func startButton(height: CGFloat, horizontalPadding: CGFloat) -> some View {
        Button(intent: StartTankTimeIntent(tankGallons: entry.tankGallons)) {
            controlLabel("START", style: .primary, height: height, horizontalPadding: horizontalPadding)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Start tank time")
    }

    private func resetButton(height: CGFloat, horizontalPadding: CGFloat) -> some View {
        Button(intent: ResetTankTimeIntent(tankGallons: entry.tankGallons)) {
            controlLabel("RESET", style: .secondary, height: height, horizontalPadding: horizontalPadding)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Reset tank time")
    }

    private enum ControlStyle {
        case primary
        case secondary
    }

    private func controlLabel(_ text: String, style: ControlStyle, height: CGFloat, horizontalPadding: CGFloat) -> some View {
        let prominent = style == .primary
        return Text(text)
            .font(.system(size: height >= 44 ? 13 : 10, weight: .black, design: .rounded))
            .tracking(0.4)
            .foregroundStyle(prominent && !isAccented ? panel : .white)
            .padding(.horizontal, horizontalPadding)
            .frame(height: height)
            .background(
                RoundedRectangle(cornerRadius: height * 0.25)
                    .fill(prominent && !isAccented ? orange : Color.white.opacity(0.11))
            )
            .overlay(
                RoundedRectangle(cornerRadius: height * 0.25)
                    .stroke(prominent && !isAccented ? orange : Color.white.opacity(0.22), lineWidth: 1)
            )
            .widgetAccentable(prominent)
    }
}

struct TankTimeWidget: Widget {
    static let kind = TankTimeWidgetConstants.kind

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: Self.kind,
            intent: TankTimeConfigurationIntent.self,
            provider: TankTimeProvider()
        ) { entry in
            TankTimeWidgetView(entry: entry)
        }
        .configurationDisplayName("Tank Time")
        .description("Estimate remaining apparatus tank time at a constant flow.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

#Preview("Medium — Idle", as: .systemMedium) {
    TankTimeWidget()
} timeline: {
    TankTimeEntry(date: .now, tankGallons: 750, state: .initial)
}

#Preview("Large — Running", as: .systemLarge) {
    TankTimeWidget()
} timeline: {
    TankTimeEntry(
        date: .now,
        tankGallons: 750,
        state: TankTimeState(flowGPM: 200, startDate: .now, endDate: .now.addingTimeInterval(225))
    )
}
