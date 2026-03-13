/**
 * Authentication Modal
 * Handles login, signup, and password reset flows
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, User } from 'lucide-react';
import { useAuth } from '../../context/auth/AuthContext';
import { FadeIn } from '../Animations';
import { useMotionPreference } from '../../hooks/useMotionPreference';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'guest-confirm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultView?: AuthView;
  onAuthSuccess?: () => void;
}

export function AuthModal({ 
  isOpen, 
  onClose, 
  defaultView = 'login',
  onAuthSuccess 
}: AuthModalProps) {
  const [view, setView] = useState<AuthView>(defaultView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp, resetPassword, enableGuestMode, status } = useAuth();
  const { shouldAnimate, isMinimal } = useMotionPreference();

  // Track the element that triggered the modal for focus return
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Capture trigger element when modal opens
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus trap within modal
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Focus the first focusable element after animation settles
    const focusTimer = setTimeout(() => {
      const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const firstFocusable = modal.querySelector<HTMLElement>(focusableSelector);
      firstFocusable?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelector);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError(null);
    setSuccess(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
    // Return focus to the element that triggered the modal
    requestAnimationFrame(() => {
      triggerElementRef.current?.focus();
    });
  }, [onClose, resetForm]);

  const switchView = useCallback((newView: AuthView) => {
    resetForm();
    setView(newView);
  }, [resetForm]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      onAuthSuccess?.();
      handleClose();
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password);
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setSuccess('Account created! Please check your email to confirm.');
      setIsLoading(false);
      setTimeout(() => {
        switchView('login');
      }, 2000);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await resetPassword(email);
    
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      setSuccess('Password reset email sent! Check your inbox.');
      setIsLoading(false);
    }
  };

  const handleGuestMode = () => {
    enableGuestMode();
    onAuthSuccess?.();
    handleClose();
  };

  // Don't show modal if already authenticated (unless showing guest-confirm)
  if (!isOpen || (status === 'authenticated' && view !== 'guest-confirm')) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={isMinimal ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={isMinimal ? undefined : { opacity: 0 }}
            transition={isMinimal ? { duration: 0 } : { duration: 0.15 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={isMinimal ? false : { opacity: 0, scale: shouldAnimate ? 0.95 : 1, y: shouldAnimate ? 20 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={isMinimal ? undefined : { opacity: 0, scale: shouldAnimate ? 0.95 : 1, y: shouldAnimate ? 20 : 0 }}
            transition={shouldAnimate
              ? { type: 'spring', stiffness: 400, damping: 30 }
              : isMinimal ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }
            }
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative w-full max-w-md mystic-panel overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-2 rounded-lg text-pip-text-muted hover:text-pip-text-primary hover:bg-pip-surface transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-pip-border">
              <h2 id="auth-modal-title" className="text-xl font-semibold mystic-title">
                {view === 'login' && 'Welcome Back'}
                {view === 'signup' && 'Create Account'}
                {view === 'forgot-password' && 'Reset Password'}
                {view === 'guest-confirm' && 'Continue as Guest'}
              </h2>
              <p className="text-sm text-pip-text-muted mt-1">
                {view === 'login' && 'Sign in to access your sessions and history'}
                {view === 'signup' && 'Join to save your biofield analysis data'}
                {view === 'forgot-password' && "We'll send you a reset link"}
                {view === 'guest-confirm' && 'Your data will be stored locally only'}
              </p>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={isMinimal ? false : { opacity: 0, y: shouldAnimate ? -10 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={isMinimal ? undefined : { opacity: 0, y: shouldAnimate ? -10 : 0 }}
                    transition={isMinimal ? { duration: 0 } : { duration: 0.15 }}
                    className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                    role="alert"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success message */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={isMinimal ? false : { opacity: 0, y: shouldAnimate ? -10 : 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={isMinimal ? undefined : { opacity: 0, y: shouldAnimate ? -10 : 0 }}
                    transition={isMinimal ? { duration: 0 } : { duration: 0.15 }}
                    className="mb-4 p-3 rounded-lg bg-pip-emerald/10 border border-pip-emerald/30 text-pip-emerald text-sm"
                    role="status"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Login Form */}
              {view === 'login' && (
                <FadeIn>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-pip-text-muted mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pip-text-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full bg-pip-dark border border-pip-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-pip-text-primary placeholder:text-pip-text-muted focus:outline-none focus:border-pip-gold/50 transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-pip-text-muted mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pip-text-muted" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full bg-pip-dark border border-pip-border rounded-lg py-2.5 pl-10 pr-10 text-sm text-pip-text-primary placeholder:text-pip-text-muted focus:outline-none focus:border-pip-gold/50 transition-colors"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-pip-text-muted hover:text-pip-text-primary"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => switchView('guest-confirm')}
                        className="text-pip-gold hover:text-pip-gold/80 transition-colors"
                      >
                        Continue as Guest
                      </button>
                      <button
                        type="button"
                        onClick={() => switchView('forgot-password')}
                        className="text-pip-text-muted hover:text-pip-text-primary transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mystic-btn mystic-btn-primary py-3 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <span className="text-sm text-pip-text-muted">Don't have an account? </span>
                    <button
                      onClick={() => switchView('signup')}
                      className="text-sm text-pip-gold hover:text-pip-gold/80 font-medium transition-colors"
                    >
                      Sign up
                    </button>
                  </div>
                </FadeIn>
              )}

              {/* Signup Form */}
              {view === 'signup' && (
                <FadeIn>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-pip-text-muted mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pip-text-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full bg-pip-dark border border-pip-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-pip-text-primary placeholder:text-pip-text-muted focus:outline-none focus:border-pip-gold/50 transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-pip-text-muted mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pip-text-muted" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="w-full bg-pip-dark border border-pip-border rounded-lg py-2.5 pl-10 pr-10 text-sm text-pip-text-primary placeholder:text-pip-text-muted focus:outline-none focus:border-pip-gold/50 transition-colors"
                          placeholder="Min 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-pip-text-muted hover:text-pip-text-primary"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-pip-text-muted mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pip-text-muted" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full bg-pip-dark border border-pip-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-pip-text-primary placeholder:text-pip-text-muted focus:outline-none focus:border-pip-gold/50 transition-colors"
                          placeholder="Repeat password"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mystic-btn mystic-btn-primary py-3 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <button
                      onClick={() => switchView('login')}
                      className="text-sm text-pip-text-muted hover:text-pip-text-primary flex items-center justify-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back to sign in
                    </button>
                  </div>
                </FadeIn>
              )}

              {/* Forgot Password Form */}
              {view === 'forgot-password' && (
                <FadeIn>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-pip-text-muted mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pip-text-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full bg-pip-dark border border-pip-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-pip-text-primary placeholder:text-pip-text-muted focus:outline-none focus:border-pip-gold/50 transition-colors"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mystic-btn mystic-btn-primary py-3 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <button
                      onClick={() => switchView('login')}
                      className="text-sm text-pip-text-muted hover:text-pip-text-primary flex items-center justify-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Back to sign in
                    </button>
                  </div>
                </FadeIn>
              )}

              {/* Guest Mode Confirmation */}
              {view === 'guest-confirm' && (
                <FadeIn>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-pip-surface/50 border border-pip-border">
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-pip-gold mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-pip-text-primary">Guest Mode</h3>
                          <ul className="mt-2 text-xs text-pip-text-secondary space-y-1">
                            <li>• Your data is stored locally only</li>
                            <li>• Sessions won't sync across devices</li>
                            <li>• You can sign up anytime to save your data</li>
                            <li>• Some features may be limited</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleGuestMode}
                      className="w-full mystic-btn mystic-btn-secondary py-3"
                    >
                      Continue as Guest
                    </button>

                    <div className="text-center">
                      <button
                        onClick={() => switchView('login')}
                        className="text-sm text-pip-gold hover:text-pip-gold/80"
                      >
                        Sign in instead
                      </button>
                    </div>
                  </div>
                </FadeIn>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
