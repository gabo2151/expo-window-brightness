import ExpoModulesCore


public class ExpoWindowBrightnessModule: Module {
    public func definition() -> ModuleDefinition {
        Name("ExpoWindowBrightness")

        Function("setBrightness") { (value: Float) in
            DispatchQueue.main.async {
                UIScreen.main.brightness = CGFloat(value)
            }
        }

        Function("restoreBrightness") {
            // Doesn´t exist on iOS a function that restores the brightness
        }

        Function("getBrightness") { () -> Float in
            return Float(UIScreen.main.brightness)
        }
    }
}
