/**
 * Detailed Analysis Page
 * Displays captured analysis results
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { DetailedAnalysis } from './DetailedAnalysis';
import { SlideIn } from '../components/Animations';
import type { CapturedAnalysisData } from '../types';

export function DetailedAnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { capturedData?: CapturedAnalysisData } | null;

  const handleBack = () => {
    navigate('/dashboard');
  };

  // If no captured data, redirect to dashboard
  if (!locationState?.capturedData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-pip-text-secondary mb-4">No analysis data available</p>
          <button 
            onClick={handleBack}
            className="mystic-btn mystic-btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <SlideIn direction="right" className="h-full overflow-auto">
      <DetailedAnalysis 
        onBack={handleBack}
        capturedData={locationState.capturedData}
      />
    </SlideIn>
  );
}
