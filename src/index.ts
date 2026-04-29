import ExpoWindowBrightnessModule from './ExpoWindowBrightnessModule';
import type { BrightnessValue } from './ExpoWindowBrightness.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertBrightnessRange(value: number): void {
  if (value < 0 || value > 1) {
    throw new RangeError(
      `[expo-window-brightness] setBrightness: value must be between 0.0 and 1.0, got ${value}`
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sets the screen brightness at the **window** level.
 *
 * On **Android** this overrides the system brightness only for the current
 * window; other apps are unaffected.
 *
 * On **iOS** this sets `UIScreen.main.brightness`, which is a global value.
 * Apple does not provide a window-scoped API.
 *
 * @param value - Brightness level in the range [0.0, 1.0].
 * @throws {RangeError} if `value` is outside [0.0, 1.0] (JS-side guard).
 * @throws Native `ERR_BRIGHTNESS_RANGE` if the native layer rejects the value.
 */
export async function setBrightness(value: BrightnessValue): Promise<void> {
  assertBrightnessRange(value);
  return ExpoWindowBrightnessModule.setBrightness(value);
}

/**
 * Restores the screen brightness to the system / user default.
 *
 * On **Android** this clears the window-level override
 * (`BRIGHTNESS_OVERRIDE_NONE`), handing control back to the system.
 *
 * On **iOS** this is a **no-op**: Apple provides no public API to read and
 * restore the ambient/system brightness level.
 */
export async function restoreBrightness(): Promise<void> {
  return ExpoWindowBrightnessModule.restoreBrightness();
}

/**
 * Returns the current brightness level.
 *
 * On **Android**, returns the window-level brightness override in [0.0, 1.0],
 * or **-1** when no override is active (the system brightness is in control).
 *
 * On **iOS**, returns the current `UIScreen.main.brightness` in [0.0, 1.0].
 *
 * @returns Brightness value, or `-1` on Android when no override is set.
 */
export async function getBrightness(): Promise<number> {
  return ExpoWindowBrightnessModule.getBrightness?.() ?? -1;
}
