import ExpoModulesCore


public class ExpoWindowBrightnessModule: Module {
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
                UIScreen.main.brightness = CGFloat(value)
                promise.resolve(nil)
            }
        }

        // MARK: - restoreBrightness
        // iOS does not expose a "system brightness" API, so we leave the screen
        // brightness as-is and simply resolve.  Documented in the JS wrapper.
        AsyncFunction("restoreBrightness") { (promise: Promise) in
            // No-op on iOS: there is no public API to read the ambient/system
            // brightness and restore it.  Resolves immediately so callers can
            // treat both platforms uniformly.
            promise.resolve(nil)
        }

        // MARK: - getBrightness
        AsyncFunction("getBrightness") { (promise: Promise) in
            DispatchQueue.main.async {
                promise.resolve(Float(UIScreen.main.brightness))
            }
        }
    }
}
