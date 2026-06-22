import { requireNativeViewManager } from 'expo-modules-core';
import React from 'react';
import type { LayoutChangeEvent, NativeSyntheticEvent } from 'react-native';
import { PixelRatio, StyleSheet, Platform, processColor } from 'react-native';

import type {
  ImageErrorEventData,
  ImageLoadEventData,
  ImageNativeProps,
  ImageProgressEventData,
} from './Image.types';
import { reportIfOversized } from './observe';

const NativeExpoImage = requireNativeViewManager('ExpoImage');

function withDeprecatedNativeEvent<NativeEvent>(
  event: NativeSyntheticEvent<NativeEvent>
): NativeEvent {
  Object.defineProperty(event.nativeEvent, 'nativeEvent', {
    get() {
      console.warn(
        '[expo-image]: Accessing event payload through "nativeEvent" is deprecated, it is now part of the event object itself'
      );
      return event.nativeEvent;
    },
  });
  return event.nativeEvent;
}

class ExpoImage extends React.PureComponent<ImageNativeProps> {
  // NOTE(@kitten): native methods
  startAnimating!: () => Promise<unknown> | unknown;
  stopAnimating!: () => Promise<unknown> | unknown;
  lockResourceAsync!: () => Promise<void>;
  unlockResourceAsync!: () => Promise<void>;
  reloadAsync!: () => Promise<void>;

  // Latest decoded size (from `onLoad`, pixels) and rendered box (from `onLayout`, dp). The two
  // events fire independently and in either order, so we keep both and check on whichever arrives
  // second — and again on later layout changes — to detect images decoded larger than displayed.
  private decodedSize: { url: string; width: number; height: number } | null = null;
  private layoutSize: { width: number; height: number } | null = null;

  onLoadStart = () => {
    this.props.onLoadStart?.();
  };

  onLoad = (event: NativeSyntheticEvent<ImageLoadEventData>) => {
    const { source } = event.nativeEvent;
    this.decodedSize = { url: source.url, width: source.width, height: source.height };
    this.maybeReportOversized();
    this.props.onLoad?.(withDeprecatedNativeEvent(event));
    this.onLoadEnd();
  };

  onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    this.layoutSize = { width, height };
    this.props.onLayout?.(event);
    this.maybeReportOversized();
  };

  // Reports once both sizes are known. `onLayout` gives the box in dp; multiplying by the screen's
  // pixel ratio yields device pixels, matching the decoded pixel size for the ratio comparison.
  private maybeReportOversized() {
    if (!this.decodedSize || !this.layoutSize) {
      return;
    }
    const scale = PixelRatio.get();
    reportIfOversized({
      url: this.decodedSize.url,
      decodedWidth: this.decodedSize.width,
      decodedHeight: this.decodedSize.height,
      displayWidth: this.layoutSize.width * scale,
      displayHeight: this.layoutSize.height * scale,
    });
  }

  onProgress = (event: NativeSyntheticEvent<ImageProgressEventData>) => {
    this.props.onProgress?.(withDeprecatedNativeEvent(event));
  };

  onError = (event: NativeSyntheticEvent<ImageErrorEventData>) => {
    this.props.onError?.(withDeprecatedNativeEvent(event));
    this.onLoadEnd();
  };

  onLoadEnd = () => {
    this.props.onLoadEnd?.();
  };

  render() {
    const { style, accessibilityLabel, alt, ...props } = this.props;
    const resolvedStyle = StyleSheet.flatten(style);

    // Shadows behave different on iOS, Android & Web.
    // Android uses the `elevation` prop, whereas iOS
    // and web use the regular `shadow...` props.
    if (Platform.OS === 'android') {
      delete resolvedStyle.shadowColor;
      delete resolvedStyle.shadowOffset;
      delete resolvedStyle.shadowOpacity;
      delete resolvedStyle.shadowRadius;
    } else {
      // @ts-expect-error
      delete resolvedStyle.elevation;
    }

    // @ts-ignore
    const backgroundColor = processColor(resolvedStyle.backgroundColor);
    // On Android, we have to set the `backgroundColor` directly on the correct component.
    // So we have to remove it from styles. Otherwise, the background color won't take into consideration the border-radius.
    if (Platform.OS === 'android') {
      delete resolvedStyle.backgroundColor;
    }

    const tintColor = processColor(props.tintColor || resolvedStyle.tintColor);

    const borderColor = processColor(resolvedStyle.borderColor);
    // @ts-ignore
    const borderStartColor = processColor(resolvedStyle.borderStartColor);
    // @ts-ignore
    const borderEndColor = processColor(resolvedStyle.borderEndColor);
    // @ts-ignore
    const borderLeftColor = processColor(resolvedStyle.borderLeftColor);
    // @ts-ignore
    const borderRightColor = processColor(resolvedStyle.borderRightColor);
    // @ts-ignore
    const borderTopColor = processColor(resolvedStyle.borderTopColor);
    // @ts-ignore
    const borderBottomColor = processColor(resolvedStyle.borderBottomColor);

    return (
      <NativeExpoImage
        {...props}
        {...resolvedStyle}
        accessibilityLabel={accessibilityLabel ?? alt}
        style={resolvedStyle}
        onLoadStart={this.onLoadStart}
        onLoad={this.onLoad}
        onLayout={this.onLayout}
        onProgress={this.onProgress}
        onError={this.onError}
        tintColor={tintColor}
        borderColor={borderColor}
        borderLeftColor={borderLeftColor}
        borderRightColor={borderRightColor}
        borderTopColor={borderTopColor}
        borderBottomColor={borderBottomColor}
        borderStartColor={borderStartColor}
        borderEndColor={borderEndColor}
        backgroundColor={backgroundColor}
        ref={props.nativeViewRef}
      />
    );
  }
}

export default ExpoImage;
