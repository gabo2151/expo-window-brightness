import ExpoModulesCore


public class ExpoWindowBrightnessModule: Module {
    // Brightness value captured right before our first override in this session.
    // Used by `restoreBrightness()` to bring the screen back to what the user
    // had before the app started overriding it.
    private var initialBrightness: CGFloat?

    public func definition() -> ModuleDefinition {
        Name("ExpoWindowBrightness")

        // MARK: - setBrightness
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
                // Remember the pre-override brightness the first time we touch it.
                if self.initialBrightness == nil {
                    self.initialBrightness = UIScreen.main.brightness
                }
                UIScreen.main.brightness = CGFloat(value)
                promise.resolve(nil)
            }
        }

        // MARK: - restoreBrightness
        // iOS exposes no "system brightness" API, so we restore the brightness
        // that was present before the first `setBrightness` call in this session.
        // If we never overrode the brightness, this is a no-op.
        AsyncFunction("restoreBrightness") { (promise: Promise) in
            DispatchQueue.main.async {
                if let initial = self.initialBrightness {
                    UIScreen.main.brightness = initial
                    self.initialBrightness = nil
                }
                promise.resolve(nil)
            }
        }

        // MARK: - getBrightness
        AsyncFunction("getBrightness") { (promise: Promise) in
            DispatchQueue.main.async {
                promise.resolve(Float(UIScreen.main.brightness))
            }
        }
    }
}
