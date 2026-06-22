import { Image, type ImageLoadEventData } from 'expo-image';
import { useState } from 'react';
import { PixelRatio, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/utils/theme';

// Render the image in a 220pt box and fetch the source at exactly that many device pixels, so the
// decoded image matches what is displayed. This is the recommended pattern — no oversized warning.
const SIZE = 220;
const PIXELS = Math.round(SIZE * PixelRatio.get());

export default function CorrectImage() {
  const theme = useTheme();
  const [decoded, setDecoded] = useState<{ width: number; height: number } | null>(null);

  const onLoad = (event: ImageLoadEventData) => {
    setDecoded({ width: event.source.width, height: event.source.height });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background.screen }]}
      contentContainerStyle={styles.content}>
      <Image
        style={styles.image}
        source={{ uri: `https://picsum.photos/seed/expo-image-correct/${PIXELS}/${PIXELS}` }}
        onLoad={onLoad}
      />
      <Text style={[styles.heading, { color: theme.text.default }]}>Correctly sized</Text>
      <Text style={[styles.body, { color: theme.text.secondary }]}>
        Rendered at {SIZE}×{SIZE}pt ({PIXELS}×{PIXELS}px on this device) and the source is fetched at
        the same pixel size. Decoded:{' '}
        {decoded ? `${decoded.width}×${decoded.height}px` : '…'}. No `expo-image.oversized` warning is
        logged.
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
