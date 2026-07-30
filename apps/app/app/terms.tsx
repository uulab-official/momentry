import { StaticInfoScreen } from '@/src/features/settings/StaticInfoScreen';
import { TERMS_COPY } from '@/src/content/legal';

export default function TermsRoute() {
  return <StaticInfoScreen title="이용약관">{TERMS_COPY}</StaticInfoScreen>;
}
