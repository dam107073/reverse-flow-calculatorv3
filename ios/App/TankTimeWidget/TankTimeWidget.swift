import AppIntents
import SwiftUI
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
            entries.append(
                TankTimeEntry(
                    date: endDate,
                    tankGallons: current.tankGallons,
                    state: current.state
                )
            )
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
    @Environment(\.widgetRenderingMode) private var renderingMode
    let entry: TankTimeEntry

    private let orange = Color(red: 0.984, green: 0.573, blue: 0.235)
    private let panel = Color(red: 0.055, green: 0.075, blue: 0.105)

    private var isRunning: Bool { entry.state.isRunning(at: entry.date) }
    private var isEmpty: Bool { entry.state.isEmpty(at: entry.date) }
    private var isAccented: Bool { renderingMode == .accented }

    var body: some View {
        VStack(spacing: 8) {
            header
            HStack(alignment: .center, spacing: 14) {
                countdown
                Spacer(minLength: 0)
                flowPanel
            }
            controls
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
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

    private var header: some View {
        HStack(spacing: 8) {
            Text("RF")
                .font(.system(size: 10, weight: .black, design: .rounded))
                .foregroundStyle(isAccented ? .white : orange)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(isAccented ? Color.white : orange, lineWidth: 1.5)
                )
                .widgetAccentable()
            Text("REVERSE FLOW")
                .font(.system(size: 11, weight: .black, design: .rounded))
                .tracking(0.8)
            Text("TANK TIME")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.65))
                .tracking(0.7)
            Spacer(minLength: 4)
            Text("\(entry.tankGallons) GAL")
                .font(.system(size: 11, weight: .black, design: .rounded))
                .foregroundStyle(isAccented ? .white : orange)
                .widgetAccentable()
        }
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }

    private var countdown: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(isEmpty ? "TANK EMPTY" : isRunning ? "REMAINING" : "ESTIMATED TIME")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(isEmpty && !isAccented ? orange : .white.opacity(0.62))
                .tracking(0.8)
                .widgetAccentable(isEmpty)

            Group {
                if isEmpty {
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
            .font(.system(size: 43, weight: .black, design: .rounded))
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .contentTransition(.numericText())
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(isEmpty ? "Tank empty" : "Estimated remaining tank time")
    }

    private var flowPanel: some View {
        VStack(spacing: 5) {
            Text("FLOW")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.62))
                .tracking(0.8)
            Text("\(entry.state.flowGPM)")
                .font(.system(size: 24, weight: .black, design: .rounded))
                .monospacedDigit()
            Text("GPM")
                .font(.system(size: 9, weight: .bold, design: .rounded))
                .foregroundStyle(isAccented ? .white : orange)
                .widgetAccentable()
        }
        .frame(width: 62)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Flow \(entry.state.flowGPM) gallons per minute")
    }

    private var controls: some View {
        HStack(spacing: 8) {
            flowButton(label: "−50", delta: -TankTimeCalculation.flowStepGPM)
            flowButton(label: "+50", delta: TankTimeCalculation.flowStepGPM)
            Spacer(minLength: 4)
            if !entry.state.isLocked {
                Button(intent: StartTankTimeIntent(tankGallons: entry.tankGallons)) {
                    controlLabel("START", prominent: true)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Start tank time")
            }
            Button(intent: ResetTankTimeIntent(tankGallons: entry.tankGallons)) {
                controlLabel("RESET", prominent: false)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Reset tank time")
        }
    }

    private func flowButton(label: String, delta: Int) -> some View {
        Button(intent: AdjustTankFlowIntent(tankGallons: entry.tankGallons, delta: delta)) {
            controlLabel(label, prominent: false)
                .opacity(entry.state.isLocked ? 0.35 : 1)
        }
        .buttonStyle(.plain)
        .disabled(entry.state.isLocked)
        .accessibilityLabel(delta < 0 ? "Decrease flow by 50 gallons per minute" : "Increase flow by 50 gallons per minute")
    }

    private func controlLabel(_ text: String, prominent: Bool) -> some View {
        Text(text)
            .font(.system(size: 10, weight: .black, design: .rounded))
            .tracking(0.3)
            .foregroundStyle(prominent && !isAccented ? panel : .white)
            .padding(.horizontal, 12)
            .frame(height: 27)
            .background(
                RoundedRectangle(cornerRadius: 7)
                    .fill(prominent && !isAccented ? orange : Color.white.opacity(0.11))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 7)
                    .stroke(prominent && !isAccented ? orange : Color.white.opacity(0.2), lineWidth: 1)
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
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

#Preview(as: .systemMedium) {
    TankTimeWidget()
} timeline: {
    TankTimeEntry(date: .now, tankGallons: 750, state: .initial)
    TankTimeEntry(
        date: .now,
        tankGallons: 750,
        state: TankTimeState(flowGPM: 200, startDate: .now, endDate: .now.addingTimeInterval(225))
    )
}
