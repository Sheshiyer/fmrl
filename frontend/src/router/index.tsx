/**
 * React Router Configuration
 * Preserves all existing functionality: WebSocket, persistence, state management
 */
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/auth/AuthContext';
import { Shell } from '../components/Layout/Shell';
import { PageTransition } from '../components/Animations';
import { useMotionPreference } from '../hooks/useMotionPreference';

// Lazy load pages for better performance
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';

const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SettingsPageWrapper = lazy(() => import('../pages/SettingsPageWrapper').then(m => ({ default: m.SettingsPageWrapper })));
const DocsPageWrapper = lazy(() => import('../pages/DocsPageWrapper').then(m => ({ default: m.DocsPageWrapper })));
const InfoPageWrapper = lazy(() => import('../pages/InfoPageWrapper').then(m => ({ default: m.InfoPageWrapper })));
const AccountPageWrapper = lazy(() => import('../pages/AccountPageWrapper').then(m => ({ default: m.AccountPageWrapper })));
const DetailedAnalysisPage = lazy(() => import('../pages/DetailedAnalysisPage').then(m => ({ default: m.DetailedAnalysisPage })));
const MetricsGuidePage = lazy(() => import('../pages/MetricsGuidePage').then(m => ({ default: m.MetricsGuidePage })));
const OnboardingPage = lazy(() => import('../pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));

// Loading fallback
function PageLoader() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-pip-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-pip-gold/30 border-t-pip-gold rounded-full animate-spin" />
        <span className="text-pip-text-secondary text-sm tracking-wider uppercase">Loading...</span>
      </div>
    </div>
  );
}

// Animated outlet for page transitions
function AnimatedOutlet() {
  const location = useLocation();
  const { isMinimal } = useMotionPreference();
  
  // Minimal: skip AnimatePresence entirely — just render the page
  if (isMinimal) {
    return (
      <div className="h-full">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname} className="h-full">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </PageTransition>
    </AnimatePresence>
  );
}

// Main layout with Auth + Shell wrapper
function MainLayout() {
  const isOnboarded = typeof window !== 'undefined'
    && localStorage.getItem('biofield_onboarding_complete_v2') === 'true';

  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <Shell>
          <AnimatedOutlet />
        </Shell>
      </AppProvider>
    </AuthProvider>
  );
}

// Onboarding layout (no Auth — onboarding doesn't need it)
function OnboardingLayout() {
  return (
    <AppProvider>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    element: <OnboardingLayout />,
    children: [
      {
        index: true,
        element: <OnboardingPage />,
      },
    ],
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'settings',
        element: <SettingsPageWrapper />,
      },
      {
        path: 'docs',
        element: <DocsPageWrapper />,
      },
      {
        path: 'info',
        element: <InfoPageWrapper />,
      },
      {
        path: 'account',
        element: <AccountPageWrapper />,
      },
      {
        path: 'analysis',
        element: <DetailedAnalysisPage />,
      },
      {
        path: 'metrics-guide',
        element: <MetricsGuidePage />,
      },
    ],
  },
], {
  future: {
    v7_normalizeFormMethod: true,
  },
});
