import Capacitor
import Foundation
import StoreKit

@objc(SupportPurchaseRecoveryPlugin)
public class SupportPurchaseRecoveryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SupportPurchaseRecoveryPlugin"
    public let jsName = "SupportPurchaseRecovery"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(
            name: "recoverUnfinishedConsumable",
            returnType: CAPPluginReturnPromise
        ),
        CAPPluginMethod(
            name: "finishRecoveredConsumable",
            returnType: CAPPluginReturnPromise
        ),
        CAPPluginMethod(
            name: "currentSupportSubscriptions",
            returnType: CAPPluginReturnPromise
        )
    ]

    private let oneTimeSupportProductID = "reverse_flow_support_one_time_5"
    private let monthlySupportProductIDs: Set<String> = [
        "support_reverse_flow_monthly_3",
        "support_reverse_flow_monthly_10"
    ]
    private var transactionUpdatesTask: Task<Void, Never>?
    private var initialUnfinishedScanTask: Task<Void, Never>?

    public override func load() {
        initialUnfinishedScanTask = Task { [weak self] in
            guard let self else { return }
            for await result in Transaction.unfinished {
                guard case .verified(let transaction) = result,
                      transaction.productID == self.oneTimeSupportProductID
                else {
                    continue
                }
                self.logUnfinishedTransaction(
                    transaction,
                    source: "plugin-load-scan"
                )
                return
            }
            print(
                "[Reverse Flow StoreKit 2] no-recoverable-transaction-found " +
                "source=plugin-load-scan " +
                "productId=\(self.oneTimeSupportProductID)"
            )
        }

        transactionUpdatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                guard case .verified(let transaction) = result,
                      transaction.productID == self.oneTimeSupportProductID
                else {
                    continue
                }

                self.logUnfinishedTransaction(
                    transaction,
                    source: "transaction-updates"
                )
                let data = self.transactionPayload(
                    transaction,
                    signedTransaction: result.jwsRepresentation
                )
                await MainActor.run {
                    self.notifyListeners(
                        "unfinishedConsumableAvailable",
                        data: data
                    )
                }
            }
        }
    }

    deinit {
        initialUnfinishedScanTask?.cancel()
        transactionUpdatesTask?.cancel()
    }

    @objc func recoverUnfinishedConsumable(_ call: CAPPluginCall) {
        print(
            "[Reverse Flow StoreKit 2] consumable-recovery-attempted " +
            "productId=\(oneTimeSupportProductID)"
        )

        Task {
            for await result in Transaction.unfinished {
                switch result {
                case .verified(let transaction):
                    guard transaction.productID == oneTimeSupportProductID else {
                        continue
                    }
                    logUnfinishedTransaction(
                        transaction,
                        source: "transaction-unfinished"
                    )
                    call.resolve(transactionPayload(
                        transaction,
                        signedTransaction: result.jwsRepresentation
                    ))
                    return
                case .unverified(let transaction, _):
                    guard transaction.productID == oneTimeSupportProductID else {
                        continue
                    }
                    print(
                        "[Reverse Flow StoreKit 2] unfinished-transaction-unverified " +
                        "productId=\(transaction.productID) " +
                        "transactionRef=\(redact(transaction.id))"
                    )
                }
            }

            print(
                "[Reverse Flow StoreKit 2] no-recoverable-transaction-found " +
                "productId=\(oneTimeSupportProductID)"
            )
            call.resolve([
                "found": false,
                "productId": oneTimeSupportProductID
            ])
        }
    }

    @objc func finishRecoveredConsumable(_ call: CAPPluginCall) {
        guard let requestedID = call.getString("transactionId"),
              let transactionID = UInt64(requestedID)
        else {
            call.reject("A valid recovered transaction reference is required.")
            return
        }

        Task {
            for await result in Transaction.unfinished {
                guard case .verified(let transaction) = result,
                      transaction.productID == oneTimeSupportProductID,
                      transaction.id == transactionID
                else {
                    continue
                }

                await transaction.finish()
                print(
                    "[Reverse Flow StoreKit 2] recovered-consumable-finished " +
                    "productId=\(transaction.productID) " +
                    "transactionRef=\(redact(transaction.id))"
                )
                call.resolve(["finished": true])
                return
            }

            print(
                "[Reverse Flow StoreKit 2] recovered-consumable-finish-not-found " +
                "productId=\(oneTimeSupportProductID) " +
                "transactionRef=\(redact(transactionID))"
            )
            call.reject(
                "The recovered transaction is no longer unfinished in StoreKit."
            )
        }
    }

    @objc func currentSupportSubscriptions(_ call: CAPPluginCall) {
        print("[Reverse Flow StoreKit 2] support-subscription-check-started")

        Task {
            var subscriptions: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    guard monthlySupportProductIDs.contains(transaction.productID)
                    else {
                        continue
                    }
                    var payload: [String: Any] = [
                        "productId": transaction.productID,
                        "transactionRef": redact(transaction.id),
                        "purchaseDate": iso8601(transaction.purchaseDate),
                        "environment": environmentName(transaction)
                    ]
                    if let expirationDate = transaction.expirationDate {
                        payload["expirationDate"] = iso8601(expirationDate)
                    }
                    subscriptions.append(payload)
                    print(
                        "[Reverse Flow StoreKit 2] active-support-subscription-found " +
                        "productId=\(transaction.productID) " +
                        "transactionRef=\(redact(transaction.id)) " +
                        "environment=\(environmentName(transaction))"
                    )
                case .unverified(let transaction, _):
                    guard monthlySupportProductIDs.contains(transaction.productID)
                    else {
                        continue
                    }
                    print(
                        "[Reverse Flow StoreKit 2] support-subscription-unverified " +
                        "productId=\(transaction.productID) " +
                        "transactionRef=\(redact(transaction.id))"
                    )
                }
            }

            if subscriptions.isEmpty {
                print("[Reverse Flow StoreKit 2] no-active-support-subscriptions")
            }
            call.resolve(["subscriptions": subscriptions])
        }
    }

    private func transactionPayload(
        _ transaction: Transaction,
        signedTransaction: String
    ) -> [String: Any] {
        [
            "found": true,
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "signedTransaction": signedTransaction,
            "purchaseDate": iso8601(transaction.purchaseDate),
            "originalPurchaseDate": iso8601(transaction.originalPurchaseDate),
            "environment": environmentName(transaction)
        ]
    }

    private func logUnfinishedTransaction(
        _ transaction: Transaction,
        source: String
    ) {
        print(
            "[Reverse Flow StoreKit 2] unfinished-transaction-found " +
            "source=\(source) " +
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
