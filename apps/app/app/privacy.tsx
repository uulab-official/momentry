import { StaticInfoScreen } from '@/src/features/settings/StaticInfoScreen';
import { PRIVACY_COPY } from '@/src/content/legal';

export default function PrivacyRoute() {
  return <StaticInfoScreen title="개인정보 처리방침">{PRIVACY_COPY}</StaticInfoScreen>;
}
