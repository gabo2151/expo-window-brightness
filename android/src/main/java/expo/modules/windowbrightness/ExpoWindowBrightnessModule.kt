package expo.modules.windowbrightness

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import android.view.WindowManager

class ExpoWindowBrightnessModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoWindowBrightness")

    // MARK: - setBrightness
    // Runs directly on the UI thread (runOnQueue(Queues.MAIN)) so the returned
    // promise resolves *after* the window attributes have been applied.
    AsyncFunction("setBrightness") { value: Float ->
      if (value < 0f || value > 1f) {
        throw BrightnessRangeException(value)
      }

      val activity = appContext.currentActivity
        ?: throw NoActivityException()

      val layoutParams = activity.window.attributes
      layoutParams.screenBrightness = value
      activity.window.attributes = layoutParams
    }.runOnQueue(Queues.MAIN)

    // MARK: - restoreBrightness
    // Resets the window-level override so the system / auto-brightness
    // setting takes over again.
    AsyncFunction("restoreBrightness") {
      val activity = appContext.currentActivity
        ?: throw NoActivityException()

      val layoutParams = activity.window.attributes
      layoutParams.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE
      activity.window.attributes = layoutParams
    }.runOnQueue(Queues.MAIN)

    // MARK: - getBrightness
    // Returns the current window-level brightness override.
    // Returns -1.0 when no override is set (system brightness is active),
    // which matches WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE.
    AsyncFunction("getBrightness") {
      val activity = appContext.currentActivity
        ?: throw NoActivityException()

      activity.window.attributes.screenBrightness
    }.runOnQueue(Queues.MAIN)
  }
}

// ---------------------------------------------------------------------------
// Typed exceptions — surfaces as structured errors on the JS side
// ---------------------------------------------------------------------------

internal class BrightnessRangeException(value: Float) : CodedException(
  "ERR_BRIGHTNESS_RANGE",
  "Brightness value must be between 0.0 and 1.0, got $value",
  null
)

internal class NoActivityException : CodedException(
  "ERR_NO_ACTIVITY",
  "Cannot change brightness: no active Android Activity found",
  null
)
