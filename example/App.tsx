import { useState, useEffect } from 'react';
import { Button, Platform, StyleSheet, Text, View  } from 'react-native';
import * as WindowBrightness from 'expo-window-brightness';


export default function App() {
  const [currentBrightness, setCurrentBrightness] = useState<number>(-1);
  const [initialBrightness, setInitialBrightness] = useState<number>(-1);

  const fetchBrightness = async () => {
    const val = await WindowBrightness.getBrightness();
    setCurrentBrightness(val);
    return val;
  };

  useEffect(() => {
    fetchBrightness().then((val) => {
      setInitialBrightness(val);
    });
  }, []);

  const handleSetBrightness = async (value: number) => {
    console.log('Set brightness to:', value);
    await WindowBrightness.setBrightness(value);
    await fetchBrightness();
  };

  const handleRestore = async () => {
    if (Platform.OS === 'ios') {
      if (initialBrightness !== -1) {
        console.log('Restoring iOS brightness to:', initialBrightness);
        await WindowBrightness.setBrightness(initialBrightness);
      }
    }
    else {
      console.log('Calling native restoreBrightness');
      await WindowBrightness.restoreBrightness();
    }

    await fetchBrightness();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Brightness Control ☀️</Text>
      <Text style={styles.value}>
        Detected level: {currentBrightness !== -1 ? currentBrightness.toFixed(2) : 'Default (-1)'}
      </Text>

      <View style={styles.buttonContainer}>
        <Button title="Set to 10%" onPress={() => handleSetBrightness(0.1)} />
        <Button title="Set to 50%" onPress={() => handleSetBrightness(0.5)} />
        <Button title="Set to 100%" onPress={() => handleSetBrightness(1.0)} />

        <View style={styles.separator} />

        <Button
          title="Restore System Default"
          color="#d9534f"
          onPress={handleRestore}
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
  },
  buttonContainer: {
    width: '80%',
    gap: 15,
  },
  separator: {
    height: 20,
  }
});
