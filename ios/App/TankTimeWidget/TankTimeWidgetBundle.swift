import SwiftUI
import WidgetKit

@main
struct TankTimeWidgetBundle: WidgetBundle {
    var body: some Widget {
        TankTimeWidget()
        RequiredPDPWidget()
    }
}
