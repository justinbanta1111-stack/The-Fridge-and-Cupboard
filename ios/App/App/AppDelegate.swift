import UIKit
import Capacitor
import AVFoundation

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    /// Audio setup must never run on the main thread during launch. Activating
    /// an AVAudioSession can block while mediaserverd starts, and anything that
    /// blocks the main thread between launch and first frame is killed by the
    /// iOS watchdog (0x8badf00d), which users see as "the app crashes when I
    /// open it". All audio work below happens off the main thread, after the
    /// first screen is already on display.
    private let audioQueue = DispatchQueue(label: "com.thefridgeandcupboard.audio", qos: .utility)
    private var audioObserversRegistered = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Launch does no audio, no permission and no network work at all.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        registerAudioObserversIfNeeded()
        // Give the web view a moment to show the first screen, then set up
        // Chef's voice route on a background queue.
        audioQueue.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.configureChefVoiceAudioSession()
        }
    }

    private func registerAudioObserversIfNeeded() {
        guard !audioObserversRegistered else { return }
        audioObserversRegistered = true
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioSessionEvent),
            name: AVAudioSession.interruptionNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioSessionEvent),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }

    private func configureChefVoiceAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            // .default (not .voiceChat) keeps Chef Super J's greeting at full
            // playback volume; voiceChat applies call-style attenuation.
            try session.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .allowBluetoothA2DP, .allowAirPlay, .mixWithOthers]
            )
        } catch {
            // A device that refuses the recording category must still open and
            // play Chef's voice, so fall back to playback only.
            try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        }
        do {
            try session.setActive(true, options: [])
            try session.overrideOutputAudioPort(.speaker)
        } catch {
            print("Chef voice audio session activation skipped: \(error)")
        }
    }

    @objc private func handleAudioSessionEvent(_ notification: Notification) {
        audioQueue.async { [weak self] in
            guard self != nil else { return }
            let session = AVAudioSession.sharedInstance()
            do {
                try session.setActive(true, options: [])
                try session.overrideOutputAudioPort(.speaker)
            } catch {
                print("Chef voice audio session recovery failed: \(error)")
            }
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
