/**
 * Metrics Guide Page
 */
import { useNavigate } from 'react-router-dom';
import { MetricsGuide } from './MetricsGuide';
import { SlideIn } from '../components/Animations';

export function MetricsGuidePage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <SlideIn direction="up" className="h-full overflow-auto">
      <MetricsGuide onBack={handleBack} />
    </SlideIn>
  );
}
