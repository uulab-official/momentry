import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar } from '@/src/components/AppBar';
import { useAppTheme } from '@/src/providers/ThemeProvider';

export function StaticInfoScreen({ title, children }: { title: string; children: string }) {
  const { colors } = useAppTheme();
  const paragraphs = children.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return <View style={[styles.root, { backgroundColor: colors.background }]}><AppBar title={title} back /><ScrollView contentContainerStyle={styles.content}>{paragraphs.map((paragraph, index) => <View key={`${index}-${paragraph.slice(0, 12)}`} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.body, { color: colors.text }]}>{paragraph}</Text></View>)}</ScrollView></View>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 16, paddingBottom: 60, gap: 12 }, card: { borderWidth: 1, borderRadius: 18, padding: 18 }, body: { fontSize: 15, lineHeight: 25 } });
