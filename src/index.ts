import type {
  BrightnessErrorCode,
  BrightnessValue,
  ExpoWindowBrightnessNativeModule,
} from './ExpoWindowBrightness.types';
import ExpoWindowBrightnessModule from './ExpoWindowBrightnessModule';

export type {
  BrightnessErrorCode,
  BrightnessValue,
  ExpoWindowBrightnessNativeModule,
} from './ExpoWindowBrightness.types';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * Thrown when the native module is not present in the current runtime.
 *
 * The usual causes are running on web (this package is Android/iOS only),
 * running in Expo Go, or not having rebuilt the native app after installing
 * the package.
 */
export class BrightnessUnavailableError extends Error {
  readonly code: BrightnessErrorCode = 'ERR_UNAVAILABLE';

  constructor() {
    super(
      '[expo-window-brightness] Native module not found. This package supports ' +
        'Android and iOS only, and needs a native rebuild after installation ' +
        '(`npx expo run:android` / `npx expo run:ios`, or a new development ' +
        'build). It does not work on web or in Expo Go.'
    );
    this.name = 'BrightnessUnavailableError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates the argument at runtime, not just at compile time.
 *
 * A plain `value < 0 || value > 1` check lets `NaN` through (both comparisons
 * are false), and callers from untyped JS can pass anything at all — both end
 * up writing garbage into the native window attributes.
 */
function assertBrightnessRange(value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(
      `[expo-window-brightness] setBrightness: value must be a finite number ` +
        `between 0.0 and 1.0, got ${typeof value} ${String(value)}`
    );
  }
}

function getNativeModule(): ExpoWindowBrightnessNativeModule {
  if (!ExpoWindowBrightnessModule) {
    throw new BrightnessUnavailableError();
  }
  return ExpoWindowBrightnessModule;
}

/**
 * Whether the native module is loaded, and therefore whether the functions
 * below can be called. Useful to feature-gate UI in apps that also run on web.
 */
export function isAvailable(): boolean {
  return ExpoWindowBrightnessModule != null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sets the screen brightness.
 *
 * On **Android** this is a window-level override: it applies only to your
 * app's window, other apps are unaffected, and Android drops it automatically
 * when your app goes to the background.
 *
 * On **iOS** there is no window-scoped API. This sets `UIScreen.main.brightness`,
 * which is the **global device brightness** — it affects the whole system, it
 * also turns off auto-brightness, and it persists after your app is
 * backgrounded or terminated. Call {@link restoreBrightness} before you are
 * done to hand it back.
 *
 * @param value - Brightness level in the range [0.0, 1.0].
 * @throws {RangeError} if `value` is not a finite number in [0.0, 1.0].
 * @throws {BrightnessUnavailableError} if the native module is not loaded.
 * @throws Native `ERR_NO_ACTIVITY` on Android when there is no active Activity.
 */
export async function setBrightness(value: BrightnessValue): Promise<void> {
  assertBrightnessRange(value);
  return getNativeModule().setBrightness(value);
}

/**
 * Gives brightness control back to the system.
 *
 * On **Android** this clears the window-level override
 * (`BRIGHTNESS_OVERRIDE_NONE`), so the system or auto-brightness setting takes
 * over immediately.
 *
 * On **iOS** this restores the brightness captured right before the first
 * {@link setBrightness} call of the current session. If {@link setBrightness}
 * was never called, it is a no-op — Apple exposes no public API to read the
 * "system" brightness, so there is nothing else to restore to.
 *
 * @throws {BrightnessUnavailableError} if the native module is not loaded.
 * @throws Native `ERR_NO_ACTIVITY` on Android when there is no active Activity.
 */
export async function restoreBrightness(): Promise<void> {
  return getNativeModule().restoreBrightness();
}

/**
 * Reads back the current brightness.
 *
 * On **Android** this returns *your window's override*, not the screen's
 * actual brightness: a value in [0.0, 1.0] if you set one, or **-1** when no
 * override is active. Android does not expose the effective screen brightness
 * to an app without permissions, so -1 means "the system is in control", not
 * "the screen is off".
 *
 * On **iOS** this returns the real global `UIScreen.main.brightness`, always in
 * [0.0, 1.0].
 *
 * @returns Brightness in [0.0, 1.0], or `-1` on Android when no override is set.
 * @throws {BrightnessUnavailableError} if the native module is not loaded.
 * @throws Native `ERR_NO_ACTIVITY` on Android when there is no active Activity.
 */
export async function getBrightness(): Promise<number> {
  return getNativeModule().getBrightness();
}
