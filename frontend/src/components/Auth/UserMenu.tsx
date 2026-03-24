/**
 * User Menu Component
 * Displays user avatar, name, and auth actions in the shell
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  LogOut, 
  Settings, 
  UserCircle, 
  ChevronDown,
  Loader2,
  Sparkles,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/auth/AuthContext';
import { AuthModal } from './AuthModal';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { SelemeneStatusBadge } from '../UI/SelemeneStatusBadge';

export function UserMenu() {
  const { 
    status, 
    user, 
    profile, 
    signOut, 
    disableGuestMode,
    isProfileLoading,
    selemeneStatus,
  } = useAuth();
  const { shouldAnimate, isMinimal } = useMotionPreference();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<'login' | 'signup' | 'guest-confirm'>('login');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for menu items
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const menu = menuRef.current;
    if (!menu) return;

    const menuItems = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
    const currentIndex = Array.from(menuItems).indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        menuItems[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        menuItems[prevIndex]?.focus();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        // Return focus to trigger button
        const trigger = menu.querySelector<HTMLElement>('[aria-haspopup="true"]');
        trigger?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        menuItems[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
      }
    }
  }, [isOpen]);

  // Focus first menu item when dropdown opens
  useEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    if (!menu) return;

    const focusTimer = setTimeout(() => {
      const firstItem = menu.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    }, 50);

    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    // Navigate to onboarding — localStorage flags cleared by AuthContext
    navigate('/onboarding', { replace: true });
  };

  const handleDisableGuest = () => {
    disableGuestMode();
    setIsOpen(false);
  };

  // Get display name from preferences or email
  const preferences = profile?.preferences as Record<string, unknown> | undefined;
  const displayName = (preferences?.name as string) || user?.email?.split('@')[0] || 'User';
  const email = user?.email;
  const avatarUrl = preferences?.avatar_url as string | undefined;

  // Loading state
  if (status === 'loading' || isProfileLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-pip-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  // Unauthenticated - show sign in button
  if (status === 'unauthenticated') {
    return (
      <>
        <button
          onClick={() => {
            setAuthModalView('login');
            setShowAuthModal(true);
          }}
          className="mystic-btn mystic-btn-primary text-xs px-4 py-2 flex items-center gap-2"
        >
          <User className="w-3.5 h-3.5" />
          Sign In
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultView={authModalView}
        />
      </>
    );
  }

  return (
    <>
      <div ref={menuRef} className="relative" onKeyDown={handleMenuKeyDown}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label={`User menu for ${displayName}`}
          className={`
            flex items-center gap-2 px-2 py-1.5 rounded-lg
            transition-colors duration-200
            ${isOpen ? 'bg-pip-surface' : 'hover:bg-pip-surface/50'}
          `}
        >
          {/* Avatar */}
          <div className={`
            w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
            ${status === 'guest' 
              ? 'bg-pip-text-muted/20 text-pip-text-muted' 
              : 'bg-pip-gold/20 text-pip-gold'
            }
          `}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          {/* Name & Status */}
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-medium text-pip-text-primary leading-tight">
              {displayName}
            </span>
            <span className="text-[10px] text-pip-text-muted leading-tight">
              {status === 'guest' ? 'Guest' : email}
            </span>
          </div>

          {/* Dropdown indicator */}
          <ChevronDown className={`
            w-3.5 h-3.5 text-pip-text-muted transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `} />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={isMinimal ? false : { opacity: 0, y: shouldAnimate ? 8 : 0, scale: shouldAnimate ? 0.95 : 1 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={isMinimal ? undefined : { opacity: 0, y: shouldAnimate ? 8 : 0, scale: shouldAnimate ? 0.95 : 1 }}
              transition={isMinimal ? { duration: 0 } : { duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 mystic-panel py-2 z-50"
              role="menu"
              aria-label="User actions"
            >
              {/* User Info Header */}
              <div className="px-3 py-2 border-b border-pip-border mb-1">
                <div className="flex items-center gap-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${status === 'guest' 
                      ? 'bg-pip-text-muted/20 text-pip-text-muted' 
                      : 'bg-pip-gold/20 text-pip-gold'
                    }
                  `}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-pip-text-primary truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-pip-text-muted truncate">
                      {status === 'guest' ? 'Guest User' : email}
                    </p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="mt-2 flex items-center gap-2">
                  {status === 'guest' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-pip-text-muted/10 text-pip-text-muted border border-pip-text-muted/20">
                      <Shield className="w-3 h-3" />
                      Local Only
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-pip-emerald/10 text-pip-emerald border border-pip-emerald/20">
                      <Sparkles className="w-3 h-3" />
                      Synced
                    </span>
                  )}
                  <SelemeneStatusBadge status={selemeneStatus} compact />
                </div>
              </div>

              {/* Menu Items */}
              <div className="px-1" role="none">
                {status === 'authenticated' && (
                  <>
                    <a
                      href="/account"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/account';
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-pip-text-secondary hover:bg-pip-surface hover:text-pip-text-primary transition-colors"
                    >
                      <UserCircle className="w-4 h-4" aria-hidden="true" />
                      Account
                    </a>
                    <a
                      href="/settings"
                      role="menuitem"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = '/settings';
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-pip-text-secondary hover:bg-pip-surface hover:text-pip-text-primary transition-colors"
                    >
                      <Settings className="w-4 h-4" aria-hidden="true" />
                      Settings
                    </a>
                  </>
                )}

                {/* Guest-specific actions */}
                {status === 'guest' && (
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => {
                      setAuthModalView('login');
                      setShowAuthModal(true);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-pip-gold hover:bg-pip-gold/10 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    Sign Up to Save Data
                  </button>
                )}

                <div className="my-1 border-t border-pip-border" role="separator" />

                {/* Sign Out / Exit Guest */}
                {status === 'guest' ? (
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    onClick={handleDisableGuest}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-pip-text-secondary hover:bg-pip-surface hover:text-pip-text-primary transition-colors"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Exit Guest Mode
                  </button>
                ) : (
                  <button
                    role="menuitem"
                    tabIndex={-1}
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-pip-danger hover:bg-pip-danger/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Sign Out
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultView={authModalView}
      />
    </>
  );
}
