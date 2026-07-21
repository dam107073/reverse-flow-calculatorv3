import Foundation

enum TankTimeWidgetConstants {
    static let kind = "ReverseFlowTankTimeWidget"
}

enum TankTimeCalculation {
    static let minimumFlowGPM = 50
    static let maximumFlowGPM = 2_000
    static let flowStepGPM = 50
    static let defaultFlowGPM = 200

    static func clampedFlow(_ flowGPM: Int) -> Int {
        min(max(flowGPM, minimumFlowGPM), maximumFlowGPM)
    }

    static func durationSeconds(tankGallons: Int, flowGPM: Int) -> Int {
        guard tankGallons > 0, flowGPM > 0 else { return 0 }
        return Int((Double(tankGallons) / Double(flowGPM) * 60).rounded())
    }

    static func displayTime(seconds: Int) -> String {
        let safeSeconds = max(0, seconds)
        return String(format: "%02d:%02d", safeSeconds / 60, safeSeconds % 60)
    }
}
