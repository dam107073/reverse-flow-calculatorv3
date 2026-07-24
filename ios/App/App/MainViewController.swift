import Capacitor

@objc(MainViewController)
final class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(LegacyEntitlementPlugin())
        print("[Reverse Flow StoreKit 2] bridge-registered jsName=LegacyEntitlement")
    }
}
