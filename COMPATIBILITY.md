# Compatibility

**Expo SDK 53–57** · iOS 15.1+ · Android minSdk 24+ · New Architecture compatible · no config plugin needed.

| Expo SDK | `expo-modules-core` | Effective iOS target | Verified by |
|----------|---------------------|----------------------|-------------|
| 57       | 57.x                | 16.4                 | Native build |
| 56       | 56.x                | 16.4                 | Symbol check |
| 55       | 55.x                | 15.1                 | Symbol check |
| 54       | 3.x                 | 15.1                 | Native build |
| 53       | 2.5.x               | 15.1                 | Native build |
| ≤ 52     | —                   | —                    | Not supported |

**Native build** means CI compiles this module inside a real Expo app at that
SDK — Gradle on Android, `pod install` plus `xcodebuild` on iOS — installing it
from the packed npm tarball, so it tests what you actually download.

**Symbol check** means every native API this module calls is confirmed present
in that SDK's `expo-modules-core`. It runs against every SDK on every CI run,
plus weekly on a schedule, so a new Expo release cannot quietly break this
table. It is strong evidence, not a compiled proof.

## Why SDK 52 is not supported

`android/build.gradle` applies `expo-module-gradle-plugin`, which first shipped
in `expo-modules-core` 2.5.0 — Expo SDK 53. On SDK 52 the consuming app fails to
configure:

```
Plugin [id: 'expo-module-gradle-plugin'] was not found in any of the following sources
```

iOS on SDK 52 builds fine, but half an SDK is not support worth claiming.
Versions up to 1.1.0 listed SDK 52 anyway, because nothing checked it.

## Why the podspec says iOS 15.1 on SDK 56+

`expo-modules-core` raised its own iOS deployment target from 15.1 to **16.4**
in SDK 56, while [`ios/ExpoWindowBrightness.podspec`](./ios/ExpoWindowBrightness.podspec)
still declares 15.1. That is deliberate, not an oversight.

Expo's Podfile integration raises every Expo module to match core at install
time:

```
[Expo] Raised deployment target for Expo modules matching ExpoModulesCore:
  ExpoWindowBrightness (iOS=16.4)
```

So the pod builds at 16.4 on SDK 56+ without the podspec claiming it.
Hard-coding 16.4 would lock out SDK 53–55 apps that still target iOS 15.x, and
buy nothing.

## Checking it yourself

```shell
npm run compat
```

Maintainer notes — how the checks work, and how to add a new SDK — are in
[CONTRIBUTING.md](./CONTRIBUTING.md).
