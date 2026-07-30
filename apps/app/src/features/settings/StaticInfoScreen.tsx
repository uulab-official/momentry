import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar } from '@/src/components/AppBar';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';

export function StaticInfoScreen({ title, children }: { title: string; children: string }) {
  const { colors } = useAppTheme();
  const paragraphs = children.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return <View style={[styles.root, { backgroundColor: colors.background }]}><AppBar title={title} back /><ScrollView contentContainerStyle={styles.content}>{paragraphs.map((paragraph, index) => <Text key={`${index}-${paragraph.slice(0, 12)}`} style={[styles.body, { color: colors.text }]}>{paragraph}</Text>)}</ScrollView></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 60, gap: 18 }, body: { ...typography.body, lineHeight: 25 } });
