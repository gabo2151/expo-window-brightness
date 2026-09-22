import type { ExpoWindowBrightnessNativeModule } from '../ExpoWindowBrightness.types';

// The module handle is captured when `../index` is first evaluated, so each
// test reloads the module with the native side it wants to exercise.
const mockRequireOptionalNativeModule = jest.fn();

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: (...args: unknown[]) =>
    mockRequireOptionalNativeModule(...args) as unknown,
}));

type Api = typeof import('../index');

const load = (native: ExpoWindowBrightnessNativeModule | null): Api => {
  mockRequireOptionalNativeModule.mockReset().mockReturnValue(native);

  let api!: Api;
  jest.isolateModules(() => {
    api = require('../index') as Api;
  });

  return api;
};

const fakeNative = (): jest.Mocked<ExpoWindowBrightnessNativeModule> => ({
  setBrightness: jest.fn().mockResolvedValue(undefined),
  restoreBrightness: jest.fn().mockResolvedValue(undefined),
  getBrightness: jest.fn().mockResolvedValue(0.42),
});

describe('setBrightness argument validation', () => {
  // The whole point of the guard: `NaN < 0` and `NaN > 1` are both false, so a
  // naive range check waves it straight through to the native layer.
  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['below range', -0.1],
    ['above range', 1.1],
    ['undefined', undefined],
    ['null', null],
    ['a numeric string', '0.5'],
    ['an object', {}],
  ])('rejects %s without touching the native module', async (_label, value) => {
    const native = fakeNative();
    const api = load(native);

    await expect(api.setBrightness(value as number)).rejects.toThrow(RangeError);
    expect(native.setBrightness).not.toHaveBeenCalled();
  });

  it.each([0, 0.5, 1])('accepts %p and forwards it unchanged', async (value) => {
    const native = fakeNative();
    const api = load(native);

    await expect(api.setBrightness(value)).resolves.toBeUndefined();
    expect(native.setBrightness).toHaveBeenCalledWith(value);
  });
});

describe('when the native module is missing', () => {
  it('still imports without throwing', () => {
    expect(() => load(null)).not.toThrow();
  });

  it('reports itself as unavailable', () => {
    expect(load(null).isAvailable()).toBe(false);
    expect(load(fakeNative()).isAvailable()).toBe(true);
  });

  it.each(['setBrightness', 'restoreBrightness', 'getBrightness'] as const)(
    '%s rejects with ERR_UNAVAILABLE',
    async (name) => {
      const api = load(null);
      const call = name === 'setBrightness' ? api.setBrightness(0.5) : api[name]();

      await expect(call).rejects.toBeInstanceOf(api.BrightnessUnavailableError);
      await expect(call).rejects.toMatchObject({ code: 'ERR_UNAVAILABLE' });
    }
  );

  // A bad argument is a bad argument whether or not the native side is there,
  // and the range guard runs first.
  it('still reports a range error rather than unavailability', async () => {
    await expect(load(null).setBrightness(NaN)).rejects.toThrow(RangeError);
  });
});

describe('delegation to the native module', () => {
  it('passes getBrightness through, including the Android -1 sentinel', async () => {
    const native = fakeNative();
    native.getBrightness.mockResolvedValue(-1);

    await expect(load(native).getBrightness()).resolves.toBe(-1);
  });

  it('calls restoreBrightness with no arguments', async () => {
    const native = fakeNative();

    await load(native).restoreBrightness();

    expect(native.restoreBrightness).toHaveBeenCalledWith();
  });

  it('asks for the module by the name the native side registers', () => {
    load(fakeNative());

    expect(mockRequireOptionalNativeModule).toHaveBeenCalledWith('ExpoWindowBrightness');
  });
});
