import Capacitor
import FacebookCore
import Foundation

@objc(MetaAppEventsPlugin)
public class MetaAppEventsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MetaAppEventsPlugin"
    public let jsName = "MetaAppEvents"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "logProPurchase", returnType: CAPPluginReturnPromise)
    ]

    @objc func logProPurchase(_ call: CAPPluginCall) {
        let productId = call.getString("productId")
        let amount = call.getDouble("amount") ?? 0
        let currency = call.getString("currency") ?? "USD"

        guard productId == "reverse_flow_pro_lifetime" else {
            call.reject("Invalid productId")
            return
        }

        guard amount > 0 else {
            call.reject("Invalid amount")
            return
        }

        AppEvents.shared.logPurchase(amount: amount, currency: currency)
        AppEvents.shared.flush()
        call.resolve()
    }
}
