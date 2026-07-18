# Expo Window Brightness

[![npm version](https://img.shields.io/npm/v/@gabo2151/expo-window-brightness)](https://www.npmjs.org/package/@gabo2151/expo-window-brightness)
[![install size](https://packagephobia.com/badge?p=@gabo2151/expo-window-brightness)](https://packagephobia.com/result?p=@gabo2151/expo-window-brightness)
[![npm downloads](https://img.shields.io/npm/dm/@gabo2151/expo-window-brightness)](https://npm-stat.com/charts.html?package=@gabo2151/expo-window-brightness)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A tiny, zero-dependency Expo module to control screen brightness at the **window** level. It overrides the brightness only while your app is in the foreground and **never declares any Android permission** — no `WRITE_SETTINGS`, no runtime prompts.

> **Why not `expo-brightness`?** The official [`expo-brightness`](https://docs.expo.dev/versions/latest/sdk/brightness/) also supports window-level brightness, but because it additionally exposes the global *system* brightness API, its config plugin declares `android.permission.WRITE_SETTINGS`. If all you need is to brighten your own app while it's in the foreground, this module does exactly that with a 3-function API and no permissions.

## Installation

```shell
npx expo install @gabo2151/expo-window-brightness
```

## Supported Platforms

| Platform | Supported |
|----------|-----------|
| Android  | ✅         |
| iOS      | ✅         |

## Usage

```tsx
import { View, Button } from 'react-native';
import * as WindowBrightness from '@gabo2151/expo-window-brightness';

export default function App() {
  const setMaxBrightness = async () => {
    await WindowBrightness.setBrightness(1.0);
  };

  const checkBrightness = async () => {
    const level = await WindowBrightness.getBrightness();
    console.log('Current level:', level);
  };

  const restoreSystemBrightness = async () => {
    await WindowBrightness.restoreBrightness();
  };

  return (
    <View>
      <Button title="Max Brightness" onPress={setMaxBrightness} />
      <Button title="Check Brightness" onPress={checkBrightness} />
      <Button title="Restore Default" onPress={restoreSystemBrightness} />
    </View>
  );
}
```

## API

### `setBrightness(value: number): Promise<void>`

Sets the screen brightness. `value` must be between `0.0` (darkest) and `1.0` (brightest).

- On **Android**, overrides brightness at the window level — only your app is affected.
- On **iOS**, sets `UIScreen.main.brightness`, which is a global value.

Throws a `RangeError` on the JS side if `value` is outside `[0.0, 1.0]`. The native layer also rejects with `ERR_BRIGHTNESS_RANGE` as a safety net.

---

### `getBrightness(): Promise<number>`

Returns the current brightness level as a number in `[0.0, 1.0]`.

- On **Android**, returns the active window-level override, or `-1` when no override is set (system brightness is in control).
- On **iOS**, returns the current `UIScreen.main.brightness` value.

---

### `restoreBrightness(): Promise<void>`

Restores the brightness to the value it had before your app started overriding it.

- On **Android**, clears the window-level override (`BRIGHTNESS_OVERRIDE_NONE`). The system or auto-brightness setting takes over immediately.
- On **iOS**, restores the brightness captured right before the **first** `setBrightness()` call of the current session. If `setBrightness()` was never called, it's a no-op (Apple exposes no public system-brightness API).

> **Note (iOS):** the restore target is snapshotted the first time you call `setBrightness()`, not continuously. If the user manually changes the system brightness *after* that first call, restoring will bring back the earlier snapshot, not that later manual value. This is a limitation of the iOS brightness API.

## Error Codes

| Code                   | Description                                                                |
|------------------------|----------------------------------------------------------------------------|
| `ERR_BRIGHTNESS_RANGE` | Value passed to `setBrightness` is outside `[0.0, 1.0]`.                   |
| `ERR_NO_ACTIVITY`      | Android only: no active Activity was found to apply the brightness change. |

## License

[MIT](./LICENSE)