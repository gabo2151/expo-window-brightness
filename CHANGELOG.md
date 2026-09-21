# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.2.0 — 2026-09-21

Nothing here is breaking: the stricter validation only rejects values that
previously reached the native layer as garbage.

### Added

- `isAvailable()`, for gating UI in apps that also run on web.
- `BrightnessUnavailableError` and the `ERR_UNAVAILABLE` code.
- The public types are actually exported now: `BrightnessValue`,
  `BrightnessErrorCode` and `ExpoWindowBrightnessNativeModule`.
- `COMPATIBILITY.md`, with a verified Expo SDK 52–57 support table.
- A weekly CI job that re-checks that table against newly released Expo SDKs
  and opens an issue when it drifts.

### Fixed

- `setBrightness` rejected `NaN`, `Infinity` and non-numbers. A plain
  `value < 0 || value > 1` check lets `NaN` through, because both comparisons
  are false — it reached the native window attributes unchallenged.
- Importing the package no longer throws on web or in Expo Go. It used
  `requireNativeModule`, which fails while the module is being *evaluated* and
  so took down the whole JS bundle instead of the call that needed it.
- Android: the brightness override is re-applied after an Activity recreation.
  A rotation, theme change or locale change threw away the window holding it,
  and nothing put it back.
- iOS: the global brightness is handed back when the app leaves the foreground
  and taken again when it returns, so closing the app no longer leaves the
  device at whatever the app set. Android already behaved this way, via the OS.
  Returning to the foreground re-snapshots, so a brightness the user changed by
  hand while the app was away is the one they get back.
- The native bridge is typed. It was `any`, so the `Promise<void>` on every
  function was an unchecked assertion.
- iOS: the screen is resolved from the active window scene, with
  `UIScreen.main` kept only as a fallback — it is deprecated from iOS 26.

### Changed

- **The supported range is now Expo SDK 53–57, down from a claimed 52.**
  `android/build.gradle` applies `expo-module-gradle-plugin`, which first
  shipped in `expo-modules-core` 2.5.0 (SDK 53) — on SDK 52 the consuming app
  never configured at all. `peerDependencies` moves to `expo >= 53.0.0`,
  `react >= 19`, `react-native >= 0.79`. This was found by making CI compile
  the native code; nothing had ever checked it.

- The README states that iOS brightness is **global and survives app
  termination**, and that `getBrightness()` on Android returns your own
  override rather than the screen's actual brightness. Both were previously
  documented as the opposite.
- The example app calls `restoreBrightness()` on both platforms instead of
  reimplementing the iOS path in JS.
- Releases are staged on npm and require a human `npm stage approve`; CI now
  also checks that the release tag matches `package.json`.
- CI compiles the Kotlin and the Swift. Previously it only type-checked the
  TypeScript, which is a small fraction of the package.
- Linting is back on, migrated to ESLint flat config.

## 1.1.0

- `setBrightness`, `getBrightness` and `restoreBrightness` made properly async.

## 1.0.0

- Initial release.
