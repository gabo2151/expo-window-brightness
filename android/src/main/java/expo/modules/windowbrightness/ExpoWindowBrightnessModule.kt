package expo.modules.windowbrightness

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.view.WindowManager


class ExpoWindowBrightnessModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoWindowBrightness")

    Function("setBrightness") { value: Float ->
      val activity = appContext.currentActivity
      activity?.runOnUiThread {
        val window = activity.window
        val layoutParams = window.attributes

        // Ensure the value is safely within the 0.0 to 1.0 range
        layoutParams.screenBrightness = value.coerceIn(0.0f, 1.0f)
        window.attributes = layoutParams
      }
    }

    Function("restoreBrightness") {
      val activity = appContext.currentActivity
      activity?.runOnUiThread {
        val window = activity.window
        val layoutParams = window.attributes

        // Restores the window brightness to the system default behavior
        layoutParams.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
        window.attributes = layoutParams
      }
    }

    // Added for parity with iOS.
    // Note: If the brightness hasn't been overridden, Android returns a negative value (usually -1.0)
    Function("getBrightness") {
      var currentBrightness = -1.0f
      val activity = appContext.currentActivity

      activity?.let {
        val layoutParams = it.window.attributes
        currentBrightness = layoutParams.screenBrightness
      }

      return@Function currentBrightness
    }

  }
}
