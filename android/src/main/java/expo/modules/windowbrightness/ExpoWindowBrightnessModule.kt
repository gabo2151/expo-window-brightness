package expo.modules.windowbrightness

import android.app.Activity
import android.view.WindowManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoWindowBrightnessModule : Module() {
  /**
   * The last value the app asked for, or null when no override is active.
   *
   * The override lives on the Activity's window, and Android throws that window
   * away whenever the Activity is recreated — a rotation, a theme change, a
   * locale change. Remembering the value is what lets us put it back.
   */
  private var appliedBrightness: Float? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoWindowBrightness")

    // Re-apply after an Activity recreation. Without this, rotating the device
    // silently drops the brightness the app asked for, and nothing says so.
    OnActivityEntersForeground {
      val value = appliedBrightness ?: return@OnActivityEntersForeground
      val activity = appContext.currentActivity ?: return@OnActivityEntersForeground

      activity.runOnUiThread { activity.applyBrightness(value) }
    }

    // Runs directly on the UI thread so the returned promise resolves *after*
    // the window attributes have been applied.
    AsyncFunction("setBrightness") { value: Float ->
      if (value < 0f || value > 1f) {
        throw BrightnessRangeException(value)
      }

      val activity = appContext.currentActivity ?: throw NoActivityException()

      activity.applyBrightness(value)
      appliedBrightness = value
    }.runOnQueue(Queues.MAIN)

    // Resets the window-level override so the system / auto-brightness setting
    // takes over again.
    AsyncFunction("restoreBrightness") {
      val activity = appContext.currentActivity ?: throw NoActivityException()

      activity.applyBrightness(WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE)
      appliedBrightness = null
    }.runOnQueue(Queues.MAIN)

    // Returns the current window-level override, or -1.0 when none is set
    // (BRIGHTNESS_OVERRIDE_NONE). Deliberately reads the window rather than
    // `appliedBrightness`: the window is the truth, the field is only a memo.
    AsyncFunction("getBrightness") {
      val activity = appContext.currentActivity ?: throw NoActivityException()

      activity.window.attributes.screenBrightness
    }.runOnQueue(Queues.MAIN)
  }
}

/**
 * Window attributes are a value object: mutating the instance is not enough,
 * it has to be assigned back for the change to take effect.
 */
private fun Activity.applyBrightness(value: Float) {
  val layoutParams = window.attributes
  layoutParams.screenBrightness = value
  window.attributes = layoutParams
}

// ---------------------------------------------------------------------------
// Typed exceptions — surface as structured errors on the JS side
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
