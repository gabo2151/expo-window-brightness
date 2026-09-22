import { requireOptionalNativeModule } from 'expo-modules-core';

import type { ExpoWindowBrightnessNativeModule } from './ExpoWindowBrightness.types';

/**
 * The native module, or `null` when it is not present in the current runtime
 * (web, Expo Go, or a build that predates installing this package).
 *
 * We deliberately use `requireOptionalNativeModule` rather than
 * `requireNativeModule`: the latter throws while the module is being
 * *evaluated*, which takes down the whole JS bundle at import time instead of
 * failing on the call the user actually made.
 */
const ExpoWindowBrightnessModule =
  requireOptionalNativeModule<ExpoWindowBrightnessNativeModule>('ExpoWindowBrightness');

export default ExpoWindowBrightnessModule;
