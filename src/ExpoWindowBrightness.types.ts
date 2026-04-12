export type BrightnessChangeEventPayload = {
  value: number;
};

export type ExpoWindowBrightnessModuleEvents = {
  onBrightnessChange: (params: BrightnessChangeEventPayload) => void;
};
