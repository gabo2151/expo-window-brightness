// ---------------------------------------------------------------------------
// Public types for expo-window-brightness
// ---------------------------------------------------------------------------

/**
 * Valid brightness range accepted by {@link setBrightness}.
 * Must be a number in [0.0, 1.0].
 */
export type BrightnessValue = number;

/**
 * Payload emitted by the `onBrightnessChange` event (reserved for future use).
 */
export type BrightnessChangeEventPayload = {
  /** New brightness value in the [0.0, 1.0] range. */
  value: BrightnessValue;
};

/**
 * Native module event map.
 * Currently unused — kept here for forward-compatibility if we add
 * a native brightness-change listener in the future.
 */
export type ExpoWindowBrightnessModuleEvents = {
  onBrightnessChange: (params: BrightnessChangeEventPayload) => void;
};

/**
 * Error codes thrown by the native module.
 *
 * | Code                  | Meaning                                              |
 * |-----------------------|------------------------------------------------------|
 * | `ERR_BRIGHTNESS_RANGE` | Value passed to `setBrightness` is outside [0, 1]. |
 * | `ERR_NO_ACTIVITY`      | Android: no active Activity to modify.             |
 */
export type BrightnessErrorCode = 'ERR_BRIGHTNESS_RANGE' | 'ERR_NO_ACTIVITY';
