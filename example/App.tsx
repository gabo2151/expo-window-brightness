import * as WindowBrightness from '@gabo2151/expo-window-brightness';
import { useState, useEffect, useCallback } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [currentBrightness, setCurrentBrightness] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);

  const fetchBrightness = useCallback(async () => {
    const val = await WindowBrightness.getBrightness();
    setCurrentBrightness(val);
    return val;
  }, []);

  // Any handler can fail: RangeError from the JS guard, ERR_NO_ACTIVITY from
  // Android, or ERR_UNAVAILABLE when the native module isn't loaded. Surface
  // it on screen instead of leaving an unhandled rejection in the logs.
  const run = useCallback(
    (action: () => Promise<unknown>) => async () => {
      try {
        setError(null);
        await action();
        await fetchBrightness();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [fetchBrightness]
  );

  useEffect(() => {
    run(async () => {})().catch(() => {});
  }, [run]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brightness Control ☀️</Text>

      <Text style={styles.value}>
        {Platform.OS === 'android' ? 'Window override: ' : 'Screen brightness: '}
        {currentBrightness !== -1
          ? currentBrightness.toFixed(2)
          : 'none (-1) — system in control'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttonContainer}>
        <Button
          title="Set to 10%"
          onPress={run(() => WindowBrightness.setBrightness(0.1))}
        />
        <Button
          title="Set to 50%"
          onPress={run(() => WindowBrightness.setBrightness(0.5))}
        />
        <Button
          title="Set to 100%"
          onPress={run(() => WindowBrightness.setBrightness(1.0))}
        />

        <View style={styles.separator} />

        {/* One call, both platforms — the module handles the iOS snapshot
            internally. Don't reimplement the restore in JS. */}
        <Button
          title="Restore System Default"
          color="#d9534f"
          onPress={run(WindowBrightness.restoreBrightness)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  value: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  error: {
    fontSize: 13,
    color: '#d9534f',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '80%',
    gap: 15,
  },
  separator: {
    height: 20,
  },
});
