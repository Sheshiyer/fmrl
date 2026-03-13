/**
 * Auth Guard Component
 * Protects routes that require authentication
 * Shows auth modal or redirects for unauthenticated users
 */
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth/AuthContext';
import { AuthModal } from './AuthModal';
import { FadeIn } from '../Animations';

interface AuthGuardProps {
  children: React.ReactNode;
  allowGuest?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, allowGuest = false, fallback }: AuthGuardProps) {
  const { status, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Show auth modal if unauthenticated and not loading
    if (status === 'unauthenticated' && !isLoading) {
      setShowAuthModal(true);
    }
  }, [status, isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <FadeIn>
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-pip-gold/30 border-t-pip-gold rounded-full animate-spin" />
            <span className="text-pip-text-secondary text-sm tracking-wider uppercase">
              Checking authentication...
            </span>
          </div>
        </FadeIn>
      </div>
    );
  }

  // Allow guest access
  if (status === 'guest' && allowGuest) {
    return <>{children}</>;
  }

  // Authenticated
  if (status === 'authenticated') {
    return <>{children}</>;
  }

  // Unauthenticated - show auth modal or fallback
  if (fallback) {
    return (
      <>
        {fallback}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultView="login"
        />
      </>
    );
  }

  // Default: show auth modal
  return (
    <div className="h-full flex items-center justify-center">
      <FadeIn>
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-xl font-semibold mystic-title mb-2">
            Authentication Required
          </h2>
          <p className="text-pip-text-secondary text-sm mb-6">
            Please sign in to access this feature. Your data will be securely stored and synced across devices.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="mystic-btn mystic-btn-primary px-8 py-3"
          >
            Sign In
          </button>
        </div>
      </FadeIn>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultView="login"
      />
    </div>
  );
}

// Public only guard - redirects authenticated users away (e.g., login page)
interface PublicOnlyGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicOnlyGuard({ children, redirectTo = '/dashboard' }: PublicOnlyGuardProps) {
  const { status, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pip-gold/30 border-t-pip-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

// Hook to require auth for specific actions
export function useRequireAuth() {
  const { status } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const requireAuth = (callback: () => void) => {
    if (status === 'authenticated') {
      callback();
    } else {
      setPendingCallback(() => callback);
      setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingCallback) {
      setTimeout(pendingCallback, 100);
      setPendingCallback(null);
    }
  };

  const AuthModalComponent = () => (
    <AuthModal
      isOpen={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      onAuthSuccess={handleAuthSuccess}
    />
  );

  return { requireAuth, AuthModalComponent, showAuthModal, setShowAuthModal };
}
