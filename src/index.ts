import ExpoWindowBrightnessModule from './ExpoWindowBrightnessModule';


export async function setBrightness(value: number) {
  return await ExpoWindowBrightnessModule.setBrightness(value);
}

export async function restoreBrightness() {
  return await ExpoWindowBrightnessModule.restoreBrightness();
}

export async function getBrightness(): Promise<number> {
  return await ExpoWindowBrightnessModule.getBrightness?.() ?? -1;
}
