import type { OversizeCheck } from '../observe';

type FakeObserve = {
  logEvent: jest.Mock;
  getIntegrations: jest.Mock;
  addListener: jest.Mock;
  emit: (name: string, payload: unknown) => void;
};

function makeObserve(integrations: Record<string, unknown>): FakeObserve {
  const listeners: Record<string, ((payload: unknown) => void)[]> = {};
  return {
    logEvent: jest.fn(),
    getIntegrations: jest.fn(() => integrations),
    addListener: jest.fn((name: string, cb: (payload: unknown) => void) => {
      (listeners[name] ??= []).push(cb);
      return { remove: jest.fn() };
    }),
    emit(name, payload) {
      (listeners[name] ?? []).forEach((cb) => cb(payload));
    },
  };
}

// Re-import `observe.ts` with a fresh module state and a controlled `expo` mock so each test
// observes activation/dedup from a clean slate.
function loadObserveModule(observe: FakeObserve | null) {
  let mod: typeof import('../observe');
  jest.isolateModules(() => {
    jest.doMock('expo', () => ({ requireOptionalNativeModule: () => observe }));
    mod = require('../observe');
  });
  jest.dontMock('expo');
  return mod!;
}

// `display` is in device pixels — the component multiplies onLayout dp by PixelRatio before calling.
function check(decoded: number, display: number, url = 'https://example.com/a.png'): OversizeCheck {
  return {
    url,
    decodedWidth: decoded,
    decodedHeight: decoded,
    displayWidth: display,
    displayHeight: display,
  };
}

describe('reportIfOversized', () => {
  it('logs a warning once when the image is oversized beyond the configured ratio', () => {
    const observe = makeObserve({ 'expo-image': { ratio: 3 } });
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(1000, 100)); // ratio 10 > 3

    expect(observe.logEvent).toHaveBeenCalledTimes(1);
    const [name, options] = observe.logEvent.mock.calls[0];
    expect(name).toBe('expo-image.oversized');
    expect(options.severity).toBe('warn');
    expect(options.attributes).toMatchObject({
      url: 'https://example.com/a.png',
      originalImageWidth: 1000,
      renderedImageWidth: 100,
    });
  });

  it('does not log when the image is within the ratio', () => {
    const observe = makeObserve({ 'expo-image': { ratio: 3 } });
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(120, 100)); // ratio 1.2 < 3

    expect(observe.logEvent).not.toHaveBeenCalled();
  });

  it('uses the default ratio of 2 when enabled with `true`', () => {
    const observe = makeObserve({ 'expo-image': true });
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(250, 100)); // ratio 2.5 > 2

    expect(observe.logEvent).toHaveBeenCalledTimes(1);
  });

  it('does not log when the integration is not enabled', () => {
    const observe = makeObserve({}); // no 'expo-image' key
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(1000, 100));

    expect(observe.logEvent).not.toHaveBeenCalled();
  });

  it('activates from a later `onConfigure` event', () => {
    const observe = makeObserve({}); // disabled at load
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(1000, 100));
    expect(observe.logEvent).not.toHaveBeenCalled();

    observe.emit('onConfigure', { integrations: { 'expo-image': { ratio: 2 } } });
    reportIfOversized(check(1000, 100, 'https://example.com/b.png'));
    expect(observe.logEvent).toHaveBeenCalledTimes(1);
  });

  it('reports each source url at most once', () => {
    const observe = makeObserve({ 'expo-image': { ratio: 2 } });
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(1000, 100));
    reportIfOversized(check(1000, 100));

    expect(observe.logEvent).toHaveBeenCalledTimes(1);
  });

  it('clears the dedup set on a new configure so a reported url can report again', () => {
    const observe = makeObserve({ 'expo-image': { ratio: 2 } });
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(1000, 100));
    expect(observe.logEvent).toHaveBeenCalledTimes(1);

    observe.emit('onConfigure', { integrations: { 'expo-image': { ratio: 2 } } });
    reportIfOversized(check(1000, 100));
    expect(observe.logEvent).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when expo-observe is not installed', () => {
    const { reportIfOversized } = loadObserveModule(null);

    expect(() => reportIfOversized(check(1000, 100))).not.toThrow();
  });

  it('logs when the ratio exactly equals the threshold', () => {
    const observe = makeObserve({ 'expo-image': { ratio: 2 } });
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(200, 100)); // ratio exactly 2

    expect(observe.logEvent).toHaveBeenCalledTimes(1);
  });

  it('does not log or throw when the container has not been laid out', () => {
    const observe = makeObserve({ 'expo-image': { ratio: 2 } });
    const { reportIfOversized } = loadObserveModule(observe);

    expect(() => reportIfOversized(check(1000, 0))).not.toThrow();
    expect(observe.logEvent).not.toHaveBeenCalled();
  });

  it('reports distinct oversized urls independently', () => {
    const observe = makeObserve({ 'expo-image': { ratio: 2 } });
    const { reportIfOversized } = loadObserveModule(observe);

    reportIfOversized(check(1000, 100, 'https://example.com/a.png'));
    reportIfOversized(check(1000, 100, 'https://example.com/b.png'));

    expect(observe.logEvent).toHaveBeenCalledTimes(2);
  });
});
