# Expo Window Brightness

[![npm version](https://img.shields.io/npm/v/@gabo2151/expo-window-brightness)](https://www.npmjs.org/package/@gabo2151/expo-window-brightness)
[![install size](https://packagephobia.com/badge?p=@gabo2151/expo-window-brightness)](https://packagephobia.com/result?p=@gabo2151/expo-window-brightness)
[![npm downloads](https://img.shields.io/npm/dm/@gabo2151/expo-window-brightness)](https://npm-stat.com/charts.html?package=@gabo2151/expo-window-brightness)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Brighten or dim the screen from your Expo app. Three functions, no runtime dependencies, **no Android permissions** — no `WRITE_SETTINGS`, no runtime prompts.

> Unlike [`expo-brightness`](https://docs.expo.dev/versions/latest/sdk/brightness/), which declares `android.permission.WRITE_SETTINGS` because it also exposes the global *system* brightness API.

## Before you pick this

Android and iOS are **not** equivalent, and the difference decides whether this package fits:

| | Android | iOS |
|---|---|---|
| Scope while in the foreground | Your app's window | **The whole device** |
| Reverts on background | Yes, by the OS | Yes, by this module |
| Survives app termination | No | No |
| Turns off auto-brightness | No | **Yes** |

Android has a real window-level override. Apple exposes no window-scoped API, so on iOS this writes the **global device brightness** — while your app is on screen, you are changing the whole device, and auto-brightness is switched off as a side effect.

This module hands that brightness back whenever your app leaves the foreground and takes it again when you return, so a user who closes your app does not find their phone stuck at whatever you set. Still call `restoreBrightness()` when you are done with it.

## Install

```shell
npx expo install @gabo2151/expo-window-brightness
```

Native module: needs `npx expo run:ios` / `run:android` or a [development build](https://docs.expo.dev/develop/development-builds/introduction/). **Does not work in Expo Go or on web.**

Works on **Expo SDK 53–57** · iOS 15.1+ · Android 24+ · New Architecture · no config plugin. See [COMPATIBILITY.md](./COMPATIBILITY.md).

## Usage

```tsx
import * as WindowBrightness from '@gabo2151/expo-window-brightness';
import { useEffect } from 'react';

useEffect(() => {
  WindowBrightness.setBrightness(1.0);

  // On iOS the brightness is global and outlives your app — always restore it.
  return () => {
    WindowBrightness.restoreBrightness().catch(() => {});
  };
}, []);
```

A runnable version with error handling is in [`example/App.tsx`](./example/App.tsx).

## API

| | |
|---|---|
| `setBrightness(value)` | Sets brightness. `value` must be a finite number in `[0.0, 1.0]`. |
| `getBrightness()` | Android: **your override**, or `-1` when none is set. iOS: the real global brightness. |
| `restoreBrightness()` | Hands control back to the system. |
| `isAvailable()` | Whether the native module is loaded. Use it to gate UI on web. |

All three brightness functions return a `Promise`. Full behaviour per platform is in the JSDoc — your editor will show it.

### Errors

| Code | Thrown as | When |
|---|---|---|
| — | `RangeError` | `setBrightness` got a non-finite number or one outside `[0.0, 1.0]`. |
| `ERR_BRIGHTNESS_RANGE` | native `CodedError` | Native safety net for the same. |
| `ERR_NO_ACTIVITY` | native `CodedError` | Android: no active Activity. |
| `ERR_UNAVAILABLE` | `BrightnessUnavailableError` | Native module not loaded — web, Expo Go, or no native rebuild. |

## Limitations

- **iOS:** brightness is global while your app is in the foreground. It is handed back automatically on background and re-applied on return; a crash straight from the foreground is the one case that can leave it changed.
- **Android:** the override lives on the Activity's window. Recreating it (rotation, theme or locale change) drops the override; call `setBrightness()` again if you need it back.
- **Android:** on many devices `0.0` means "backlight off", not "dimmest readable". Clamp to ~`0.05`.
- **Web:** unsupported. Guard with `isAvailable()`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
