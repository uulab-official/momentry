import Constants from 'expo-constants';
import { StaticInfoScreen } from '@/src/features/settings/StaticInfoScreen';
export default function AboutRoute() { const config = Constants.expoConfig; return <StaticInfoScreen title="앱 정보">{`모멘트리\n\n버전 ${config?.version ?? '1.0.0'}\n빌드 ${config?.ios?.buildNumber ?? config?.android?.versionCode ?? '-'}\n런타임 ${config?.runtimeVersion ?? '-'}\n업데이트 채널 production\n\n내 안의 순간들을 일기, 영화, 책으로 모아 기억하는 개인 기록 앱입니다.`}</StaticInfoScreen>; }
