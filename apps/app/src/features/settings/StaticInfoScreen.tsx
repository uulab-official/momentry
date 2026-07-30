import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar } from '@/src/components/AppBar';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';

export function StaticInfoScreen({ title, children }: { title: string; children: string }) {
  const { colors } = useAppTheme();
  const normalized = children.replace(/\\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return <View style={[styles.root, { backgroundColor: colors.background }]}><AppBar title={title} back /><ScrollView contentContainerStyle={styles.content}>{title === '공지사항' ? <NoticeContent paragraphs={paragraphs} /> : paragraphs.map((paragraph, index) => <Text key={`${index}-${paragraph.slice(0, 12)}`} style={[styles.body, { color: colors.text }]}>{paragraph}</Text>)}</ScrollView></View>;
}

function NoticeContent({ paragraphs }: { paragraphs: string[] }) {
  const { colors } = useAppTheme();
  const [headline, ...body] = paragraphs;
  return <>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>모멘트리 소식</Text>
    <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text>
    <View style={[styles.rule, { backgroundColor: colors.border }]} />
    {body.map((paragraph, index) => <Text key={`${index}-${paragraph.slice(0, 12)}`} style={[styles.body, { color: colors.text }]}>{paragraph}</Text>)}
  </>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 60, gap: 18 },
  eyebrow: typography.overline,
  headline: typography.screenTitle,
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  body: { ...typography.body, lineHeight: 25 },
});
