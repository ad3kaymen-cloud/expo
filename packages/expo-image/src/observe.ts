import { requireOptionalNativeModule } from 'expo';
// Type-only imports: erased at runtime, so they add no runtime dependency on these packages.
import type { ExpoAppMetricsModuleType } from 'expo-app-metrics';
import type { ObserveIntegrationsConfig, ObserveModule } from 'expo-observe';

/**
 * Configuration for the `expo-observe` integration, set through
 * `Observe.configure({ integrations: { 'expo-image': ... } })`. Passing `true` enables it with
 * defaults; the object form tunes the behavior.
 *
 * The `declare module 'expo-observe'` augmentation that registers the `'expo-image'` key lives in
 * `Image.types.ts` (always in the package's public type graph, so it is picked up whenever
 * expo-image is imported). `Image.types.ts` `import type`s this from here. It is exported from this
 * module but not from the package entry, so it is not part of the public API.
 */
export type ExpoImageIntegrationConfig = {
  /**
   * An image is reported as oversized when the larger of its decoded width/height ratios over the
   * rendered size (in device pixels) exceeds this value. For example, `2` flags an image decoded
   * at more than twice the pixels it is displayed at.
   *
   * @default 2
   */
  ratio?: number;
};

const DEFAULT_RATIO = 2;

// `ExpoObserve` supplies the integration config (`getIntegrations` + the `onConfigure` event).
const observe = requireOptionalNativeModule<ObserveModule>('ExpoObserve');

// `logEvent` lives on the `ExpoAppMetrics` native module (the `Observe` JS object only surfaces it
// by forwarding to app-metrics), so reporting goes through it directly.
const appMetrics = requireOptionalNativeModule<ExpoAppMetricsModuleType>('ExpoAppMetrics');

let enabled = false;
let threshold = DEFAULT_RATIO;
// URLs of images already reported this launch. Only oversized images are added (see below), so this
// stays small and bounded by the number of distinct offenders — not every loaded image.
const reported = new Set<string>();

function activate(integrations: ObserveIntegrationsConfig) {
  const config = integrations['expo-image'];
  enabled = !!config;
  threshold =
    typeof config === 'object' && config !== null ? (config.ratio ?? DEFAULT_RATIO) : DEFAULT_RATIO;
  // A new configure may change the threshold (or enable the integration), so images already
  // reported under the previous settings should be eligible to report again.
  reported.clear();
}

if (observe) {
  // Read the current config (covers `configure(...)` already run before this view mounted), then
  // listen for later re-configures. Subscribed once for the app's lifetime — the module and this
  // listener live as long as the JS runtime, so there is nothing to unsubscribe.
  activate(observe.getIntegrations());
  observe.addListener('onConfigure', ({ integrations }) => activate(integrations));
}

/** Decoded pixel size of a loaded image and the device-pixel size of the box it renders into. */
export type OversizeCheck = {
  url: string;
  decodedWidth: number;
  decodedHeight: number;
  displayWidth: number;
  displayHeight: number;
};

/**
 * Logs a warning to expo-observe when an image was decoded much larger than the size it is
 * rendered at — a common source of wasted memory and bandwidth. No-op unless the `expo-image`
 * Observe integration is enabled. Best-effort: never throws into the image render path.
 *
 * Display size comes from the view's `onLayout` (in device pixels), decoded size from `onLoad`.
 */
export function reportIfOversized(check: OversizeCheck): void {
  if (!enabled || !appMetrics) {
    return;
  }
  const { url, decodedWidth, decodedHeight, displayWidth, displayHeight } = check;
  if (!url || displayWidth <= 0 || displayHeight <= 0) {
    return;
  }
  if (reported.has(url)) {
    return;
  }
  const ratio = Math.max(decodedWidth / displayWidth, decodedHeight / displayHeight);
  if (ratio < threshold) {
    return;
  }
  reported.add(url);
  try {
    appMetrics.logEvent('expo-image.oversized', {
      severity: 'warn',
      body: `Image decoded at ${decodedWidth}×${decodedHeight}px but rendered at ${displayWidth}×${displayHeight}px.`,
      attributes: {
        url,
        originalImageWidth: decodedWidth,
        originalImageHeight: decodedHeight,
        renderedImageWidth: displayWidth,
        renderedImageHeight: displayHeight,
        originalToRenderedRatio: Math.round(ratio * 100) / 100,
      },
    });
  } catch {
    // Reporting is best-effort; a logging failure must not disrupt image rendering.
  }
}
