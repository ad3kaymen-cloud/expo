import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/Button';
import { useTheme } from '@/utils/theme';

export default function ExpoImageIndex() {
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background.screen }]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.body, { color: theme.text.secondary }]}>
        The `expo-image` integration logs a warning when an image is decoded much larger than the
        size it is rendered at. Enabled in the root layout with{' '}
        {`integrations: { 'expo-image': { ratio: 2 } }`}. Open a page below, then check the Sessions
        tab for an `expo-image.oversized` log.
      </Text>
      <Button
        title="Correctly sized"
        description="Source fetched to match the rendered box — no warning"
        onPress={() => router.push('/examples/expo-image/correct')}
      />
      <Button
        title="Too big"
        description="A huge source rendered into a small box — logs a warning"
        onPress={() => router.push('/examples/expo-image/too-big')}
      />
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
  body: {
    fontSize: 15,
    marginBottom: 20,
  },
});
