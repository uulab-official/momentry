import { StyleSheet, View } from 'react-native';

import { ShimmerBlock, useShimmerAnimation } from '@/src/components/Skeleton';
import { useAppTheme } from '@/src/providers/ThemeProvider';

export function EntryListSkeleton({ rows = 4, showMedia = true }: { rows?: number; showMedia?: boolean }) {
  const { colors } = useAppTheme();
  const { progress, reduceMotion } = useShimmerAnimation();
  const blockProps = {
    progress,
    reduceMotion,
    baseColor: colors.surfaceMuted,
    highlightColor: colors.surface,
  };

  return (
    <View accessibilityLabel="기억을 불러오는 중" style={styles.list}>
      <View style={styles.header}>
        <ShimmerBlock {...blockProps} style={styles.headerCount} />
        <ShimmerBlock {...blockProps} style={styles.headerHint} />
      </View>
      {Array.from({ length: rows }, (_, index) => (
        <View
          key={index}
          style={[styles.card, { borderColor: colors.border }]}
        >
          {showMedia ? <ShimmerBlock {...blockProps} style={styles.image} /> : null}
          <View style={styles.content}>
            <View style={styles.meta}>
              <ShimmerBlock {...blockProps} style={styles.kind} />
              <ShimmerBlock {...blockProps} style={styles.date} />
            </View>
            <ShimmerBlock {...blockProps} style={styles.title} />
            <ShimmerBlock {...blockProps} style={styles.line} />
            <ShimmerBlock {...blockProps} style={styles.shortLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingTop: 10 },
  header: {
    minHeight: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCount: { width: 74, height: 14, borderRadius: 7 },
  headerHint: { width: 90, height: 12, borderRadius: 6 },
  card: {
    minHeight: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  image: { width: 62, height: 88, borderRadius: 8 },
  content: { flex: 1, gap: 8 },
  meta: { flexDirection: 'row', gap: 8 },
  kind: { width: 34, height: 12, borderRadius: 6 },
  date: { width: 72, height: 12, borderRadius: 6 },
  title: { width: '74%', height: 18, borderRadius: 7 },
  line: { width: '92%', height: 12, borderRadius: 6 },
  shortLine: { width: '58%', height: 12, borderRadius: 6 },
});
