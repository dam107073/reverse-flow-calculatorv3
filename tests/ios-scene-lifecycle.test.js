const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const scene = read('ios/App/App/SceneDelegate.swift');

test('iOS launches one storyboard-backed scene with the existing purchase bridge', () => {
  const plist = read('ios/App/App/Info.plist');
  assert.match(plist, /<key>UIApplicationSceneManifest<\/key>/);
  assert.match(plist, /<key>UIApplicationSupportsMultipleScenes<\/key>\s*<false\/>/);
  assert.match(plist, /<key>UISceneDelegateClassName<\/key>\s*<string>\$\(PRODUCT_MODULE_NAME\)\.SceneDelegate<\/string>/);
  assert.match(plist, /<key>UISceneStoryboardFile<\/key>\s*<string>Main<\/string>/);
  assert.doesNotMatch(plist, /<key>UIMainStoryboardFile<\/key>/);
  const appDelegate = read('ios/App/App/AppDelegate.swift');
  assert.match(appDelegate, /configurationForConnecting connectingSceneSession: UISceneSession/);
  assert.match(appDelegate, /UISceneConfiguration\(name: "Default Configuration", sessionRole: connectingSceneSession.role\)/);
  assert.match(read('ios/App/App/Base.lproj/Main.storyboard'), /customClass="MainViewController"/);
  const controller = read('ios/App/App/MainViewController.swift');
  assert.match(controller, /registerPluginInstance\(LegacyEntitlementPlugin\(\)\)/);
  assert.match(controller, /registerPluginInstance\(SupportPurchaseRecoveryPlugin\(\)\)/);
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.equal((project.match(/SceneDelegate.swift in Sources/g) || []).length, 2);
  // UIApplication lifecycle notifications still drive the installed Capacitor/Cordova
  // bridge. Posting additional pause/resume events here would double-deliver them.
  assert.doesNotMatch(scene, /NotificationCenter|triggerDocumentJSEvent/);
});

test('scene forwards cold and warm links once, preserving metadata and bridge initialization order', { skip: process.platform !== 'darwin' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reverse-flow-scene-test-'));
  try {
    const mocks = `
import Foundation
class UIResponder {}
protocol UIWindowSceneDelegate {}
protocol UIUserActivityRestoring {}
class UIScene {
    class ConnectionOptions {
        var urlContexts: Set<UIOpenURLContext> = []
        var userActivities: Set<NSUserActivity> = []
    }
}
class UIWindowScene: UIScene {}
class UISceneSession {}
class UIViewController {
    var loaded = false
    func loadViewIfNeeded() { loaded = true }
}
class UIWindow { var rootViewController: UIViewController? }
class UIOpenURLContext: NSObject {
    class Options {
        var openInPlace = false
        var sourceApplication: String?
        var annotation: Any?
    }
    var url = URL(string: "reverseflow://test")!
    var options = Options()
}
class UIApplication {
    static let shared = UIApplication()
    struct OpenURLOptionsKey: Hashable {
        var rawValue: String
        static let openInPlace = Self(rawValue: "openInPlace")
        static let sourceApplication = Self(rawValue: "sourceApplication")
        static let annotation = Self(rawValue: "annotation")
    }
}
class ApplicationDelegateProxy {
    static let shared = ApplicationDelegateProxy()
    var controller: UIViewController?
    var urls: [URL] = []
    var options: [[UIApplication.OpenURLOptionsKey: Any]] = []
    var activities: [NSUserActivity] = []
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any]) -> Bool {
        precondition(controller?.loaded == true, "Bridge must load before cold links")
        urls.append(url)
        self.options.append(options)
        return true
    }
    func application(_ app: UIApplication, continue activity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        precondition(controller?.loaded == true)
        activities.append(activity)
        return true
    }
}
`;
    const scenarios = `
let delegate = SceneDelegate()
let window = UIWindow()
let controller = UIViewController()
window.rootViewController = controller
delegate.window = window
let proxy = ApplicationDelegateProxy.shared
proxy.controller = controller
let scene = UIWindowScene()
let connection = UIScene.ConnectionOptions()
let coldURL = UIOpenURLContext()
coldURL.options.sourceApplication = "com.example.source"
coldURL.options.annotation = "cold-link"
coldURL.options.openInPlace = true
connection.urlContexts = [coldURL]
let activity = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
activity.webpageURL = URL(string: "https://reverse-flow.app/test")
connection.userActivities = [activity]
delegate.scene(UIScene(), willConnectTo: UISceneSession(), options: connection)
precondition(proxy.urls.isEmpty && proxy.activities.isEmpty)
delegate.scene(scene, willConnectTo: UISceneSession(), options: connection)
precondition(proxy.urls == [coldURL.url])
precondition(proxy.activities == [activity])
precondition(proxy.options[0][.sourceApplication] as? String == "com.example.source")
precondition(proxy.options[0][.annotation] as? String == "cold-link")
precondition(proxy.options[0][.openInPlace] as? Bool == true)
let warmURL = UIOpenURLContext()
warmURL.url = URL(string: "reverseflow://warm")!
delegate.scene(scene, openURLContexts: [warmURL])
delegate.scene(scene, continue: activity)
precondition(proxy.urls == [coldURL.url, warmURL.url])
precondition(proxy.options[1].count == 1)
precondition(proxy.options[1][.openInPlace] as? Bool == false)
precondition(proxy.activities.count == 2)
delegate.scene(scene, openURLContexts: [])
precondition(proxy.urls.count == 2)
print("Scene lifecycle routing passed")
`;
    const file = path.join(dir, 'main.swift');
    fs.writeFileSync(file, mocks + scene.replace(/^import (UIKit|Capacitor)\n/gm, '') + scenarios);
    const binary = path.join(dir, 'scene-test');
    execFileSync('xcrun', ['swiftc', file, '-o', binary], { timeout: 60000 });
    assert.match(execFileSync(binary, { encoding: 'utf8' }), /Scene lifecycle routing passed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
