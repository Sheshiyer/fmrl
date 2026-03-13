/**
 * Docs Page Wrapper
 */
import { DocsPage } from './DocsPage';
import { FadeIn } from '../components/Animations';

export function DocsPageWrapper() {
  return (
    <FadeIn className="h-full overflow-auto">
      <DocsPage />
    </FadeIn>
  );
}
