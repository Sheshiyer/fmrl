/**
 * Info Page Wrapper
 */
import { InfoPage } from './InfoPage';
import { FadeIn } from '../components/Animations';

export function InfoPageWrapper() {
  return (
    <FadeIn className="h-full overflow-auto">
      <InfoPage />
    </FadeIn>
  );
}
