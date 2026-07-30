import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';

export function StaticInfoScreen({ title, children }: { title: string; children: string }) {
  const { colors } = useAppTheme();
  const normalized = children.replace(/\\n/g, '\n');
  const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  return <View style={[styles.root, { backgroundColor: colors.background }]}><AppBar title={title} back /><ScrollView contentContainerStyle={[styles.content, title === '자주 묻는 질문' && styles.faqContent]}>{title === '공지사항' ? <NoticeContent paragraphs={paragraphs} /> : title === '자주 묻는 질문' ? <FaqContent paragraphs={paragraphs} /> : title === '앱 정보' ? <AboutContent paragraphs={paragraphs} /> : paragraphs.map((paragraph, index) => <Text key={`${index}-${paragraph.slice(0, 12)}`} style={[styles.body, { color: colors.text }]}>{paragraph}</Text>)}</ScrollView></View>;
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

function FaqContent({ paragraphs }: { paragraphs: string[] }) {
  const { colors } = useAppTheme();
  const [openIndex, setOpenIndex] = useState(0);
  return <>
    <Text style={[styles.faqIntro, { color: colors.textMuted }]}>궁금한 항목을 눌러 답변을 확인하세요.</Text>
    {paragraphs.map((paragraph, index) => {
      const [question, ...answerLines] = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
      const expanded = openIndex === index;
      return <View key={`${index}-${question}`} style={[styles.faqItem, { borderColor: colors.border }]}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${question} 답변 ${expanded ? '접기' : '열기'}`}
          onPress={() => {
            setOpenIndex(expanded ? -1 : index);
            Haptics.selectionAsync().catch(() => undefined);
          }}
          style={styles.faqQuestion}
          pressedOpacity={0.7}
          scaleTo={0.995}
        >
          <Text style={[styles.faqQuestionText, { color: colors.text }]}>{question}</Text>
          <Ionicons name={expanded ? 'remove' : 'add'} size={20} color={colors.primary} />
        </AnimatedPressable>
        {expanded ? <Text style={[styles.faqAnswer, { color: colors.textMuted }]}>{answerLines.join('\n')}</Text> : null}
      </View>;
    })}
  </>;
}

function AboutContent({ paragraphs }: { paragraphs: string[] }) {
  const { colors } = useAppTheme();
  const [name = '모멘트리', metadataBlock = '', description = ''] = paragraphs;
  const metadata = metadataBlock.split('\n').map((line) => {
    if (line.startsWith('업데이트 채널 ')) return { label: '업데이트 채널', value: line.slice('업데이트 채널 '.length) };
    const separator = line.indexOf(' ');
    return { label: separator > 0 ? line.slice(0, separator) : line, value: separator > 0 ? line.slice(separator + 1) : '-' };
  });
  return <>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>개인 기록 아카이브</Text>
    <Text style={[styles.aboutName, { color: colors.text }]}>{name}</Text>
    <Text style={[styles.aboutDescription, { color: colors.textMuted }]}>{description}</Text>
    <Text style={[styles.aboutSection, { color: colors.text }]}>현재 앱 정보</Text>
    <View style={[styles.aboutMetadata, { borderColor: colors.border }]}>
      {metadata.map(({ label, value }) => <View key={label} style={[styles.aboutRow, { borderColor: colors.border }]}>
        <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.aboutValue, { color: colors.text }]}>{value}</Text>
      </View>)}
    </View>
  </>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 60, gap: 18 },
  faqContent: { paddingTop: 8, gap: 0 },
  eyebrow: typography.overline,
  headline: typography.screenTitle,
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  body: { ...typography.body, lineHeight: 25 },
  faqIntro: { ...typography.caption, paddingVertical: 14 },
  faqItem: { borderBottomWidth: StyleSheet.hairlineWidth },
  faqQuestion: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQuestionText: { ...typography.itemTitle, flex: 1 },
  faqAnswer: { ...typography.body, lineHeight: 24, paddingBottom: 18, paddingRight: 28 },
  aboutName: typography.screenTitle,
  aboutDescription: { ...typography.body, lineHeight: 24, maxWidth: 330 },
  aboutSection: { ...typography.label, marginTop: 12 },
  aboutMetadata: { borderTopWidth: StyleSheet.hairlineWidth },
  aboutRow: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  aboutLabel: typography.caption,
  aboutValue: { ...typography.label, fontVariant: ['tabular-nums'] },
});
