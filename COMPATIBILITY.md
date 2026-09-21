# Compatibility

**Requirements:** Expo SDK 52–57 · iOS 15.1+ · Android minSdk 24+ · New Architecture compatible · no config plugin needed.

| Expo SDK | `expo-modules-core` | Effective iOS target | Verified by |
|----------|---------------------|----------------------|-------------|
| 57       | 57.x                | 16.4                 | Native build |
| 56       | 56.x                | 16.4                 | Symbol check |
| 55       | 55.x                | 15.1                 | Symbol check |
| 54       | 3.x                 | 15.1                 | Symbol check |
| 53       | 2.5.x               | 15.1                 | Symbol check |
| 52       | 2.2.x               | 15.1                 | Native build |
| ≤ 51     | —                   | —                    | Not supported |

## The two tiers

**Native build** — CI generates a throwaway Expo app pinned to that SDK, installs this module into it *from the packed npm tarball* (so it tests what npm ships, not the working tree), and compiles it: Gradle on Android, `pod install` plus `xcodebuild` on iOS. Run at both ends of the range, which is where it breaks.

**Symbol check** — every native symbol this module references is confirmed present in that SDK's `expo-modules-core`:

| Symbol | Used by |
|---|---|
| `requireOptionalNativeModule` | `src/ExpoWindowBrightnessModule.ts` |
| `Queues.MAIN`, `runOnQueue` | the Kotlin module |
| `CodedException` | the Kotlin module's typed errors |
| `AsyncFunction`, `Promise` | both native modules |

Cheap enough to cover every SDK on every run, but it does not compile anything, so it is evidence rather than proof.

## Why the podspec says iOS 15.1 on SDK 56+

`expo-modules-core` raised its own iOS deployment target from 15.1 to **16.4** in SDK 56, while [`ios/ExpoWindowBrightness.podspec`](./ios/ExpoWindowBrightness.podspec) still declares 15.1. That is deliberate.

Expo's Podfile integration raises every Expo module to match core at install time. Verified with a real `pod install` against SDK 57:

```
[Expo] Raised deployment target for Expo modules matching ExpoModulesCore:
  ExpoWindowBrightness (iOS=16.4)
```

So the pod builds at 16.4 on SDK 56+ without the podspec claiming it. Hard-coding 16.4 would lock out SDK 52–55 apps that still target iOS 15.x, and buy nothing.

## Keeping this file honest

```shell
npm run compat
```

[`scripts/check-expo-compat.mjs`](./scripts/check-expo-compat.mjs) resolves the real `expo-modules-core` behind each SDK from Expo's `sdk-*` dist-tags, downloads it, and asserts every symbol above is still there. A [scheduled workflow](./.github/workflows/expo-compat.yml) runs it weekly and opens an issue when a new SDK ships or something drifts, so this table cannot rot while the module sits untouched.

## Adding a new Expo SDK

1. Add the major to `SUPPORTED_SDKS` in [`scripts/check-expo-compat.mjs`](./scripts/check-expo-compat.mjs).
2. Run `npm run compat`. If a symbol is gone, the native code needs to change.
3. Build against it for real:

   ```shell
   node scripts/make-compat-app.mjs --sdk <major> --out /tmp/compat --platform ios
   cd /tmp/compat/app/ios && pod install
   ```

4. Update the table above, and the range in [README.md](./README.md).

## Why one package, not a branch per SDK

The native code has not changed across SDK 52–57 — the same Kotlin and the same Swift compile against all of them. Mirroring Expo's majors would mean publishing six identical packages and giving up the ability to signal this package's *own* breaking changes through semver.

A branch is only warranted when the native source itself must diverge, not when metadata does. `peerDependencies` is what enforces the range in practice; the version number is not.
