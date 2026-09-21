// ---------------------------------------------------------------------------
// Public types for expo-window-brightness
// ---------------------------------------------------------------------------

/**
 * Valid brightness range accepted by {@link setBrightness}.
 * Must be a finite number in [0.0, 1.0].
 */
export type BrightnessValue = number;

/**
 * Error codes surfaced by this module.
 *
 * | Code                   | Meaning                                                  |
 * |------------------------|----------------------------------------------------------|
 * | `ERR_BRIGHTNESS_RANGE` | Value passed to `setBrightness` is outside [0, 1].       |
 * | `ERR_NO_ACTIVITY`      | Android: no active Activity to modify.                   |
 * | `ERR_UNAVAILABLE`      | The native module is not loaded in the current runtime.  |
 */
export type BrightnessErrorCode = 'ERR_BRIGHTNESS_RANGE' | 'ERR_NO_ACTIVITY' | 'ERR_UNAVAILABLE';

/**
 * Shape of the native module backing this package.
 *
 * Exported so it can be used to type a mock in tests. Application code should
 * call the functions exported from the package root instead of reaching for
 * the native module directly — they add argument validation and a friendly
 * error when the native module is missing.
 */
export interface ExpoWindowBrightnessNativeModule {
  setBrightness(value: BrightnessValue): Promise<void>;
  restoreBrightness(): Promise<void>;
  getBrightness(): Promise<number>;
}
