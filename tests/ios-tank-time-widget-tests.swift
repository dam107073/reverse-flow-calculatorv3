import Foundation

private func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
    guard condition() else {
        FileHandle.standardError.write(Data("FAIL: \(message)\n".utf8))
        exit(1)
    }
}

@main
struct TankTimeWidgetTests {
    static func main() {
        expect(
            TankTimeCalculation.durationSeconds(tankGallons: 750, flowGPM: 200) == 225,
            "750 gallons at 200 GPM should equal 3 minutes 45 seconds"
        )
        expect(
            TankTimeCalculation.displayTime(seconds: 225) == "03:45",
            "225 seconds should display as 03:45"
        )
        expect(
            TankTimeCalculation.durationSeconds(tankGallons: 500, flowGPM: 150) == 200,
            "Tank Time should preserve the app's nearest-second rounding"
        )
        expect(
            TankTimeCalculation.clampedFlow(-50) == TankTimeCalculation.minimumFlowGPM,
            "Flow should not fall below the minimum"
        )
        expect(
            TankTimeCalculation.clampedFlow(9_999) == TankTimeCalculation.maximumFlowGPM,
            "Flow should not exceed the maximum"
        )

        let testTank = 987_654
        let startDate = Date(timeIntervalSince1970: 1_800_000_000)
        TankTimeStateStore.reset(tankGallons: testTank)
        TankTimeStateStore.adjustFlow(tankGallons: testTank, delta: -50)
        expect(
            TankTimeStateStore.load(tankGallons: testTank).flowGPM == 150,
            "The minus control should change flow in 50 GPM steps"
        )

        TankTimeStateStore.start(tankGallons: testTank, now: startDate)
        let running = TankTimeStateStore.load(tankGallons: testTank)
        let expectedDuration = TankTimeCalculation.durationSeconds(
            tankGallons: testTank,
            flowGPM: running.flowGPM
        )
        expect(running.isLocked, "Starting should lock flow")
        expect(running.isRunning(at: startDate), "Started state should be running")
        expect(
            running.endDate == startDate.addingTimeInterval(TimeInterval(expectedDuration)),
            "End time should be derived from the saved start time and Tank Time result"
        )

        TankTimeStateStore.adjustFlow(tankGallons: testTank, delta: 50)
        expect(
            TankTimeStateStore.load(tankGallons: testTank).flowGPM == 150,
            "Flow controls should be locked after start"
        )
        expect(
            running.isEmpty(at: running.endDate ?? startDate),
            "The widget should enter Tank Empty at the deadline"
        )

        let urgencyEnd = startDate.addingTimeInterval(60)
        let urgencyState = TankTimeState(flowGPM: 150, startDate: startDate, endDate: urgencyEnd)
        expect(
            TankTimeDisplayStatus.resolve(state: urgencyState, at: startDate) == .remaining,
            "More than 30 seconds should use the normal remaining state"
        )
        expect(
            TankTimeDisplayStatus.resolve(state: urgencyState, at: urgencyEnd.addingTimeInterval(-30)) == .lowWater,
            "10 through 30 seconds should use the low-water state"
        )
        expect(
            TankTimeDisplayStatus.resolve(state: urgencyState, at: urgencyEnd.addingTimeInterval(-9)) == .critical,
            "1 through 9 seconds should use the critical state"
        )
        expect(
            TankTimeDisplayStatus.resolve(state: urgencyState, at: urgencyEnd) == .empty,
            "Zero seconds should use the tank-empty state"
        )
        expect(
            TankTimeDisplayStatus.transitionDates(endDate: urgencyEnd, after: startDate) == [
                urgencyEnd.addingTimeInterval(-30),
                urgencyEnd.addingTimeInterval(-9),
                urgencyEnd
            ],
            "The timeline should refresh exactly at each visual urgency transition"
        )

        TankTimeStateStore.reset(tankGallons: testTank)
        let reset = TankTimeStateStore.load(tankGallons: testTank)
        expect(reset == .initial, "Reset should restore the initial state")
        print("Tank Time widget tests passed")
    }
}
