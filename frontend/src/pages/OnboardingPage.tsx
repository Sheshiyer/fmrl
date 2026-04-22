/**
 * Onboarding Page
 * Handles initial app setup with a shader splash intro
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NativeOnboarding } from '../components/Onboarding/NativeOnboarding';
import { ShaderSplash } from '../components/Onboarding/ShaderSplash';
import { PageTransition } from '../components/Animations';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [splashDone, setSplashDone] = useState(false);

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
    <>
      {!splashDone && <ShaderSplash onDone={() => setSplashDone(true)} />}
      {splashDone && (
        <PageTransition>
          <NativeOnboarding onComplete={handleComplete} />
        </PageTransition>
      )}
    </>
  );
}
