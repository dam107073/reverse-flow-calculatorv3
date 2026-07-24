import Capacitor
import Foundation
import StoreKit

@objc(LegacyEntitlementPlugin)
public class LegacyEntitlementPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LegacyEntitlementPlugin"
    public let jsName = "LegacyEntitlement"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkEntitlement", returnType: CAPPluginReturnPromise)
    ]

    private let legacyProductID = "reverse_flow_pro_lifetime"

    @objc func checkEntitlement(_ call: CAPPluginCall) {
        let synchronize = call.getBool("synchronize") ?? false
        print(
            "[Reverse Flow StoreKit 2] entitlement-check-started " +
            "synchronize=\(synchronize)"
        )

        Task {
            do {
                if synchronize {
                    print("[Reverse Flow StoreKit 2] app-store-sync-started")
                    try await AppStore.sync()
                    print("[Reverse Flow StoreKit 2] app-store-sync-completed")
                }

                var entitlementCount = 0
                for await result in Transaction.currentEntitlements {
                    entitlementCount += 1
                    switch result {
                    case .verified(let transaction):
                        logEntitlement(transaction, verification: "verified")
                        guard transaction.productID == legacyProductID else {
                            continue
                        }

                        print(
                            "[Reverse Flow StoreKit 2] exact-legacy-product-match " +
                            "productId=\(transaction.productID) " +
                            "transactionRef=\(redact(transaction.id))"
                        )
                        call.resolve([
                            "owned": true,
                            "productId": transaction.productID,
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "purchaseDate": iso8601(transaction.purchaseDate),
                            "originalPurchaseDate": iso8601(
                                transaction.originalPurchaseDate
                            ),
                            "environment": environmentName(transaction)
                        ])
                        return
                    case .unverified(let transaction, _):
                        logEntitlement(transaction, verification: "unverified")
                        continue
                    }
                }

                if entitlementCount == 0 {
                    print("[Reverse Flow StoreKit 2] no-entitlements-returned")
                } else {
                    print(
                        "[Reverse Flow StoreKit 2] no-exact-legacy-product-match " +
                        "entitlementCount=\(entitlementCount)"
                    )
                }
                call.resolve([
                    "owned": false,
                    "productId": legacyProductID
                ])
            } catch {
                print(
                    "[Reverse Flow StoreKit 2] bridge-invocation-failed " +
                    "synchronize=\(synchronize) " +
                    "error=\(String(describing: error))"
                )
                call.reject(
                    synchronize
                        ? "The App Store could not synchronize purchase history."
                        : "StoreKit could not check current entitlements.",
                    nil,
                    error
                )
            }
        }
    }

    private func logEntitlement(
        _ transaction: Transaction,
        verification: String
    ) {
        print(
            "[Reverse Flow StoreKit 2] entitlement-returned " +
            "verification=\(verification) " +
            "productId=\(transaction.productID) " +
            "transactionRef=\(redact(transaction.id)) " +
            "environment=\(environmentName(transaction)) " +
            "originalPurchaseDate=\(iso8601(transaction.originalPurchaseDate))"
        )
    }

    private func redact(_ transactionID: UInt64) -> String {
        let value = String(transactionID)
        return value.count <= 6 ? "...\(value)" : "...\(value.suffix(6))"
    }

    private func iso8601(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    private func environmentName(_ transaction: Transaction) -> String {
        if #available(iOS 16.0, *) {
            return transaction.environment.rawValue
        }
        return transaction.environmentStringRepresentation
    }
}
