import ExpoModulesCore

public class ExpoWindowBrightnessModule: Module {
    // What the screen was set to before we first touched it. Non-nil exactly
    // while we are holding an override.
    private var initialBrightness: CGFloat?

    // What the app last asked for. Non-nil means the app still wants the
    // override, even if we have temporarily handed brightness back because we
    // went to the background.
    private var requestedBrightness: CGFloat?

    /// The screen to read and write brightness on.
    ///
    /// `UIScreen.main` is deprecated from iOS 26, which asks for a screen found
    /// "through context" instead. On a phone or an iPad that resolves to the
    /// same screen — which matters, because `UIScreen.brightness` is documented
    /// as "only supported by main screen". Hence the fallback rather than a
    /// straight swap: a scene is not always available (early launch, no
    /// foreground scene), and getting the main screen is better than giving up.
    ///
    /// Must be called on the main thread: `UIApplication.shared` requires it.
    private var targetScreen: UIScreen {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }

        if let active = scenes.first(where: { $0.activationState == .foregroundActive }) {
            return active.screen
        }
        if let any = scenes.first {
            return any.screen
        }
        return UIScreen.main
    }

    /// Applies an override, snapshotting what the user had if we are not
    /// already holding one.
    private func applyBrightness(_ value: CGFloat) {
        let screen = targetScreen

        if initialBrightness == nil {
            initialBrightness = screen.brightness
        }
        screen.brightness = value
    }

    /// Hands brightness back to whatever the user had. Leaves
    /// `requestedBrightness` alone, so the caller decides whether this is a
    /// pause (backgrounding) or a stop (`restoreBrightness`).
    private func releaseBrightness() {
        guard let initial = initialBrightness else {
            return
        }
        targetScreen.brightness = initial
        initialBrightness = nil
    }

    /// Lifecycle events already arrive on the main thread; this keeps that true
    /// without deferring work that callers expect to have happened.
    private func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }

    public func definition() -> ModuleDefinition {
        Name("ExpoWindowBrightness")

        // iOS brightness is global, so holding it while the app is not on
        // screen would change a device the user is using for something else —
        // and a termination from the background would leave it changed for
        // good. Give it back on the way out, take it again on the way in.
        //
        // Re-taking also re-snapshots: if the user adjusted brightness by hand
        // while we were away, that newer value is what we restore to later.
        OnAppEntersBackground {
            self.onMain {
                guard self.requestedBrightness != nil else {
                    return
                }
                self.releaseBrightness()
            }
        }

        OnAppEntersForeground {
            self.onMain {
                guard let value = self.requestedBrightness else {
                    return
                }
                self.applyBrightness(value)
            }
        }

        // Uses AsyncFunction so the JS side gets a real Promise.
        // The completion is called once the UI update is committed.
        AsyncFunction("setBrightness") { (value: Float, promise: Promise) in
            guard value >= 0.0, value <= 1.0 else {
                promise.reject(
                    "ERR_BRIGHTNESS_RANGE",
                    "Brightness value must be between 0.0 and 1.0, got \(value)"
                )
                return
            }
            DispatchQueue.main.async {
                self.applyBrightness(CGFloat(value))
                self.requestedBrightness = CGFloat(value)
                promise.resolve(nil)
            }
        }

        // iOS exposes no "system brightness" API, so we restore the brightness
        // that was present before we took over. If we never did, this is a no-op.
        AsyncFunction("restoreBrightness") { (promise: Promise) in
            DispatchQueue.main.async {
                self.releaseBrightness()
                self.requestedBrightness = nil
                promise.resolve(nil)
            }
        }

        AsyncFunction("getBrightness") { (promise: Promise) in
            DispatchQueue.main.async {
                promise.resolve(Float(self.targetScreen.brightness))
            }
        }
    }
}
