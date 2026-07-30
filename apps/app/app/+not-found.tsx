import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/src/providers/ThemeProvider';

export default function NotFoundRoute() {
  const { colors } = useAppTheme();
  return <View style={[styles.root, { backgroundColor: colors.background }]}><Text style={[styles.title, { color: colors.text }]}>페이지를 찾을 수 없어요</Text><Link href="/" style={[styles.link, { color: colors.primary }]}>홈으로 돌아가기</Link></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }, title: { fontSize: 20, fontWeight: '800' }, link: { fontSize: 16, fontWeight: '700' } });
