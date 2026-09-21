import ExpoModulesCore

public class ExpoWindowBrightnessModule: Module {
    // Brightness value captured right before our first override in this session.
    // Used by `restoreBrightness()` to bring the screen back to what the user
    // had before the app started overriding it.
    private var initialBrightness: CGFloat?

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

    public func definition() -> ModuleDefinition {
        Name("ExpoWindowBrightness")

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
                let screen = self.targetScreen

                // Remember the pre-override brightness the first time we touch it.
                if self.initialBrightness == nil {
                    self.initialBrightness = screen.brightness
                }
                screen.brightness = CGFloat(value)
                promise.resolve(nil)
            }
        }

        // iOS exposes no "system brightness" API, so we restore the brightness
        // that was present before the first `setBrightness` call in this session.
        // If we never overrode the brightness, this is a no-op.
        AsyncFunction("restoreBrightness") { (promise: Promise) in
            DispatchQueue.main.async {
                if let initial = self.initialBrightness {
                    self.targetScreen.brightness = initial
                    self.initialBrightness = nil
                }
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
