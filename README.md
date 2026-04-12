# Expo Window Brightness

A simple, lightweight Expo module to control screen brightness at the window level. It overrides the brightness only while your app is in the foreground, without requiring invasive system-level permissions (like `WRITE_SETTINGS` on Android).

## Installation

### Add the package to your npm dependencies

```shell
npx expo install @gabo2151/expo-window-brightness
```

## Supported Platforms
- **Android:** Supported
- **iOS:** Supported

## Usage

```typescript jsx
import { useEffect, useState } from 'react';
import { View, Button } from 'react-native';
import * as WindowBrightness from '@gabo2151/expo-window-brightness';

export default function App() {
  // Set window brightness (accepts a value between 0.0 and 1.0)
  const setMaxBrightness = async () => {
    await WindowBrightness.setBrightness(1.0);
  };

  // Get current brightness level
  const checkBrightness = async () => {
    const level = await WindowBrightness.getBrightness();
    console.log('Current level:', level);
  };

  // Restore brightness to system default
  const restoreSystemBrightness = async () => {
    await WindowBrightness.restoreBrightness();
  };

  return (
    <View>
      <Button title="Max Brightness" onPress={setMaxBrightness} />
      <Button title="Restore Default" onPress={restoreSystemBrightness} />
    </View>
  );
}
```

## API
- `setBrightness(value: number): Promise<void>`
  Sets the screen brightness. `value` must be between `0.0` (darkest) and `1.0` (brightest). 
- `getBrightness(): Promise<number>`
  Returns the current brightness level. Returns `-1` if it hasn't been overridden or cannot be determined. 
- `restoreBrightness(): Promise<void>` **(Android only)**
  Removes the window-level override, returning control to the system settings.
  > **Note for iOS:** iOS does not support releasing control back to the system natively. To achieve a "restore" effect on iOS, you must capture the initial brightness using `getBrightness()` when your component mounts, and then use `setBrightness(initialValue)` to restore it manually.
