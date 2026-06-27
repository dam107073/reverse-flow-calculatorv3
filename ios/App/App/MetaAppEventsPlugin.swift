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
        guard call.getString("productId") == "reverse_flow_pro_lifetime" else {
            call.reject("Invalid productId")
            return
        }

        let amount = call.getDouble("amount") ?? 0
        let currency = call.getString("currency") ?? "USD"

        guard amount > 0 else {
            call.reject("Invalid amount")
            return
        }

        AppEvents.shared.logPurchase(amount: amount, currency: currency)
        call.resolve()
    }
}
