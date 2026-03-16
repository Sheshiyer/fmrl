/**
 * Onboarding Page
 * Handles initial app setup
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NativeOnboarding } from '../components/Onboarding/NativeOnboarding';
import { PageTransition } from '../components/Animations';

export function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if onboarding is already complete
    const isComplete = typeof window !== 'undefined' && 
      window.localStorage.getItem('selemene_onboarding_complete_v2') === 'true';
    
    if (isComplete) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleComplete = (options?: { force?: boolean }) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('selemene_onboarding_complete_v2', 'true');
      if (options?.force) {
        window.localStorage.setItem('selemene_runtime_preview_mode', 'true');
      } else {
        window.localStorage.removeItem('selemene_runtime_preview_mode');
      }
    }
    navigate('/dashboard', { replace: true });
  };

  return (
    <PageTransition>
      <NativeOnboarding onComplete={handleComplete} />
    </PageTransition>
  );
}
