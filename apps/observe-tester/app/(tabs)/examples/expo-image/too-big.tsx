import { Image, type ImageLoadEventData } from 'expo-image';
import { useState } from 'react';
import { PixelRatio, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/utils/theme';

// Render a large bundled image (1254×1254) into a 100pt box. `allowDownscaling={false}` keeps the
// full-resolution bitmap in memory (otherwise Android's loader would downsample it), so the
// integration sees a decoded size far larger than the rendered box and logs an
// `expo-image.oversized` warning.
const SIZE = 100;
const SOURCE = require('@/assets/images/test-image.png');

export default function TooBigImage() {
  const theme = useTheme();
  const [decoded, setDecoded] = useState<{ width: number; height: number } | null>(null);

  const onLoad = (event: ImageLoadEventData) => {
    setDecoded({ width: event.source.width, height: event.source.height });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background.screen }]}
      contentContainerStyle={styles.content}>
      <Image style={styles.image} source={SOURCE} allowDownscaling={false} onLoad={onLoad} />
      <Text style={[styles.heading, { color: theme.text.default }]}>Too big</Text>
      <Text style={[styles.body, { color: theme.text.secondary }]}>
        A large bundled image rendered into a {SIZE}×{SIZE}pt box (
        {Math.round(SIZE * PixelRatio.get())}px on this device). Decoded:{' '}
        {decoded ? `${decoded.width}×${decoded.height}px` : '…'}. This is far beyond the 2× ratio, so
        an `expo-image.oversized` warning is logged — check the Sessions tab.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: Platform.select({ ios: 30, android: 150 }),
  },
  image: {
    width: SIZE,
    height: SIZE,
    borderRadius: 8,
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
  },
});
