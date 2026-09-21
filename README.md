# Expo Window Brightness

[![npm version](https://img.shields.io/npm/v/@gabo2151/expo-window-brightness)](https://www.npmjs.org/package/@gabo2151/expo-window-brightness)
[![install size](https://packagephobia.com/badge?p=@gabo2151/expo-window-brightness)](https://packagephobia.com/result?p=@gabo2151/expo-window-brightness)
[![npm downloads](https://img.shields.io/npm/dm/@gabo2151/expo-window-brightness)](https://npm-stat.com/charts.html?package=@gabo2151/expo-window-brightness)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A tiny Expo module to raise or lower the screen brightness from your app, with **no runtime dependencies** and **no Android permissions** — no `WRITE_SETTINGS`, no runtime prompts.

> **Why not `expo-brightness`?** The official [`expo-brightness`](https://docs.expo.dev/versions/latest/sdk/brightness/) also supports window-level brightness, but because it additionally exposes the global *system* brightness API, its config plugin declares `android.permission.WRITE_SETTINGS`. If all you need is to brighten your own app while it's in the foreground, this module does exactly that with a 3-function API and no permissions.

## ⚠️ Read this before using it on iOS

The two platforms are **not** equivalent, and the difference matters:

| | Android | iOS |
|---|---|---|
| Scope | Your app's window only | **The whole device** |
| Other apps affected | No | **Yes** |
| Survives backgrounding | No — Android drops it automatically | **Yes** |
| Survives app termination | No | **Yes** |
| Side effects | None | **Turns off auto-brightness** |

Android has a real window-level brightness override. **iOS does not** — Apple exposes no window-scoped brightness API, so on iOS this writes `UIScreen.main.brightness`, the global device brightness. If you set it to 1.0 and the user force-quits your app, their phone stays at 1.0.

**On iOS you are responsible for calling [`restoreBrightness()`](#restorebrightness-promisevoid) yourself** — on unmount, and ideally when the app goes to the background. This module does not do it for you.

## Installation

```shell
npx expo install @gabo2151/expo-window-brightness
```

This is a native module, so it requires a rebuild — `npx expo run:android` / `npx expo run:ios`, or a new [development build](https://docs.expo.dev/develop/development-builds/introduction/). **It does not work in Expo Go.**

## Compatibility

**Requirements:** iOS 15.1+ · Android minSdk 24+ · New Architecture compatible · no config plugin needed.

| Expo SDK | `expo-modules-core` | Effective iOS target | Status |
|----------|---------------------|----------------------|--------|
| 57       | 57.x                | 16.4                 | ✅ Native build verified in CI |
| 56       | 56.x                | 16.4                 | ✅ Symbol check |
| 55       | 55.x                | 15.1                 | ✅ Symbol check |
| 54       | 3.x                 | 15.1                 | ✅ Symbol check |
| 53       | 2.5.x               | 15.1                 | ✅ Symbol check |
| 52       | 2.2.x               | 15.1                 | ✅ Native build verified in CI |
| ≤ 51     | —                   | —                    | ❌ Not supported |

Two tiers back that table, and CI runs both:

- **Native build** — a throwaway Expo app is generated at that SDK, this module is installed into it *from the packed npm tarball*, and the result is compiled: Gradle on Android, `pod install` plus `xcodebuild` on iOS. Run at both ends of the range, which is where it breaks.
- **Symbol check** — every native symbol the module references (`requireOptionalNativeModule`, `Queues.MAIN`, `runOnQueue`, `CodedException`, `AsyncFunction`/`Promise`) is confirmed present in that SDK's `expo-modules-core`. Cheap, so it covers every SDK on every run.

**On the iOS deployment target:** `expo-modules-core` raised its own target from 15.1 to 16.4 in SDK 56, while this podspec still declares 15.1. That is deliberate and not a bug — Expo's Podfile integration raises every Expo module to match core at install time:

```
[Expo] Raised deployment target for Expo modules matching ExpoModulesCore:
  ExpoWindowBrightness (iOS=16.4)
```

So the pod builds at 16.4 on SDK 56+ without the podspec claiming it. Hard-coding 16.4 here would lock out SDK 52–55 apps that still target iOS 15.x, and buy nothing.

### Keeping this table honest

```shell
npm run compat
```

[`scripts/check-expo-compat.mjs`](./scripts/check-expo-compat.mjs) resolves the real `expo-modules-core` behind each SDK from Expo's `sdk-*` dist-tags, downloads it, and asserts every symbol is still there. A [scheduled workflow](.github/workflows/expo-compat.yml) runs it weekly and opens an issue when a new SDK ships or something drifts — so this table cannot silently rot while the module sits untouched.

## Usage

```tsx
import * as WindowBrightness from '@gabo2151/expo-window-brightness';
import { useEffect } from 'react';
import { View, Button } from 'react-native';

export default function App() {
  // On iOS the brightness is global and outlives your app — always restore it.
  useEffect(() => {
    return () => {
      WindowBrightness.restoreBrightness().catch(() => {});
    };
  }, []);

  return (
    <View>
      <Button
        title="Max Brightness"
        onPress={() => WindowBrightness.setBrightness(1.0)}
      />
      <Button
        title="Check Brightness"
        onPress={async () => console.log(await WindowBrightness.getBrightness())}
      />
      <Button
        title="Restore Default"
        onPress={() => WindowBrightness.restoreBrightness()}
      />
    </View>
  );
}
```

See [`example/App.tsx`](./example/App.tsx) for a runnable version with error handling.

## API

### `setBrightness(value: number): Promise<void>`

Sets the screen brightness. `value` must be a **finite** number between `0.0` (darkest) and `1.0` (brightest).

- On **Android**, overrides brightness at the window level — only your app is affected, and Android clears it when your app is backgrounded.
- On **iOS**, sets the global `UIScreen.main.brightness` and disables auto-brightness. See [the warning above](#️-read-this-before-using-it-on-ios).

Rejects with a `RangeError` if `value` is not a finite number in `[0.0, 1.0]` — this includes `NaN`, `Infinity`, and non-numbers passed from untyped JS. The native layer also rejects with `ERR_BRIGHTNESS_RANGE` as a safety net.

> **Note (Android):** on many devices `0.0` means "backlight fully off", not "dimmest readable". Clamp to something like `0.05` if you don't want a black screen.

---

### `getBrightness(): Promise<number>`

Reads back the current brightness.

- On **Android**, returns **your window's override**, not the screen's actual brightness: a value in `[0.0, 1.0]` if you set one, or **`-1`** when no override is active. Android does not let an app read the effective screen brightness without permissions, so `-1` means "the system is in control" — it does not mean the screen is off.
- On **iOS**, returns the real global `UIScreen.main.brightness`, always in `[0.0, 1.0]`.

---

### `restoreBrightness(): Promise<void>`

Gives brightness control back to the system.

- On **Android**, clears the window-level override (`BRIGHTNESS_OVERRIDE_NONE`). The system or auto-brightness setting takes over immediately.
- On **iOS**, restores the brightness captured right before the **first** `setBrightness()` call of the current session. If `setBrightness()` was never called, it's a no-op (Apple exposes no public system-brightness API).

> **Note (iOS):** the restore target is snapshotted the first time you call `setBrightness()`, not continuously. If the user manually changes the system brightness *after* that first call, restoring will bring back the earlier snapshot, not that later manual value. This is a limitation of the iOS brightness API.

---

### `isAvailable(): boolean`

Returns whether the native module is loaded. Use it to feature-gate UI in apps that also run on web, where every other function in this package rejects with `ERR_UNAVAILABLE`.

## Error Codes

| Code                   | Thrown as                     | Description                                                                |
|------------------------|-------------------------------|----------------------------------------------------------------------------|
| —                      | `RangeError`                  | JS guard: `setBrightness` got a non-finite number or a value outside `[0.0, 1.0]`. |
| `ERR_BRIGHTNESS_RANGE` | native `CodedError`           | Native safety net for the same condition.                                  |
| `ERR_NO_ACTIVITY`      | native `CodedError`           | Android only: no active Activity was found to apply the brightness change. |
| `ERR_UNAVAILABLE`      | `BrightnessUnavailableError`  | The native module is not loaded — web, Expo Go, or a missing native rebuild. |

## Known limitations

- **Android:** the override lives on the Activity's window. If the Activity is recreated (rotation, theme change, locale change), the override is lost and is **not** reapplied automatically. Re-call `setBrightness()` if you need it to survive that.
- **iOS:** brightness is global and is not restored automatically on background or termination — see [the warning above](#️-read-this-before-using-it-on-ios).
- **Web:** not supported. Guard with `isAvailable()`.

## License

[MIT](./LICENSE)
