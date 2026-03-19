/**
 * Shell Layout Component
 * Updated with React Router navigation and responsive design
 * Preserves all timeline, connection status, and navigation functionality
 */
import React, { type ReactNode, createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Settings,
  BookOpenText,
  Info,
  UserCircle2,
  Compass,
  History,
  Menu,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { TimelineDataPoint } from './TimelineStrip';
import { isTauriRuntime } from '../../utils/runtimeApi';
import { FadeIn } from '../Animations';
import { UserMenu } from '../Auth/UserMenu';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useMotionPreference } from '../../hooks/useMotionPreference';

export type ShellView = 'dashboard' | 'settings' | 'docs' | 'info' | 'account' | 'engines' | 'readings';

// Shell context for sharing state with child pages
interface ShellContextValue {
  currentView: ShellView;
  isSidebarOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  timelineData: TimelineDataPoint[];
  sessionDuration: number;
  isConnected: boolean;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within a Shell');
  }
  return context;
}

// Nav items configuration
const navItems: Array<{ 
  key: ShellView; 
  label: string; 
  icon: React.ReactNode;
  path: string;
}> = [
  { 
    key: 'dashboard', 
    label: 'Dashboard', 
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: '/dashboard',
  },
  { 
    key: 'settings', 
    label: 'Settings', 
    icon: <Settings className="w-4 h-4" />,
    path: '/settings',
  },
  { 
    key: 'docs', 
    label: 'Docs', 
    icon: <BookOpenText className="w-4 h-4" />,
    path: '/docs',
  },
  { 
    key: 'info', 
    label: 'Info', 
    icon: <Info className="w-4 h-4" />,
    path: '/info',
  },
  {
    key: 'account',
    label: 'Account',
    icon: <UserCircle2 className="w-4 h-4" />,
    path: '/account',
  },
  // --- Engine views ---
  {
    key: 'engines',
    label: 'Engines',
    icon: <Compass className="w-4 h-4" />,
    path: '/engines',
  },
  {
    key: 'readings',
    label: 'Readings',
    icon: <History className="w-4 h-4" />,
    path: '/readings',
  },
];

// Mobile breakpoint
const MOBILE_BREAKPOINT = 1024;

interface ShellProps {
  children: ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shouldAnimate, isMinimal } = useMotionPreference();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Determine current view from path
  const currentPath = location.pathname;
  const currentView = (currentPath.split('/')[1] || 'dashboard') as ShellView;

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(isMobileView);
      if (isMobileView) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!isTauriRuntime()) {
      // Web fullscreen
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
    // Tauri fullscreen handled via native API if needed
  }, []);

  // Global Escape handler — close sidebar on mobile
  useKeyboardShortcuts({
    'close': useCallback(() => {
      if (isMobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }, [isMobile, isSidebarOpen]),
  });

  // Timeline and connection data from children pages
  // These are passed via ShellContext
  const [timelineData] = useState<TimelineDataPoint[]>([]);
  const [sessionDuration] = useState(0);
  const [isConnected] = useState(false);

  // Focus trap for mobile sidebar
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isMobile || !isSidebarOpen) return;

    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = sidebar.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element when sidebar opens
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;

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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isSidebarOpen]);

  const shellContextValue: ShellContextValue = {
    currentView,
    isSidebarOpen,
    isMobile,
    toggleSidebar,
    timelineData,
    sessionDuration,
    isConnected,
  };

  const handleShowMetricsGuide = useCallback(() => {
    navigate('/metrics-guide');
  }, [navigate]);

  return (
    <ShellContext.Provider value={shellContextValue}>
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      <div className="mystic-bg h-screen min-h-[600px] text-pip-text-primary overflow-hidden">
        <div className="h-full p-1.5 sm:p-2.5">
          <div className={`
            mystic-app-frame h-full 
            grid gap-2 sm:gap-2.5
            transition-all duration-300 ease-out
            ${isSidebarOpen && !isMobile 
              ? 'grid-cols-[190px_minmax(0,1fr)]' 
              : 'grid-cols-[auto_minmax(0,1fr)]'
            }
          `}>
            {/* Sidebar */}
            <AnimatePresence mode="wait">
              {(isSidebarOpen || !isMobile) && (
                <motion.aside
                  ref={sidebarRef}
                  initial={isMobile && shouldAnimate ? { x: -190, opacity: 0 } : { opacity: isMinimal ? 1 : 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={isMobile && shouldAnimate ? { x: -190, opacity: 0 } : { opacity: isMinimal ? 1 : 0 }}
                  transition={shouldAnimate
                    ? { type: 'spring', stiffness: 400, damping: 32 }
                    : isMinimal ? { duration: 0 } : { duration: 0.15, ease: 'easeOut' }
                  }
                  role="complementary"
                  aria-label="Sidebar"
                  className={`
                    mystic-side-nav mystic-panel flex flex-col gap-3
                    ${isMobile ? 'fixed inset-y-1.5 left-1.5 z-50 w-[190px]' : ''}
                    ${!isSidebarOpen && !isMobile ? '!p-2 w-[60px]' : '!p-3'}
                  `}
                >
                  {/* Logo Section */}
                  <div className={`px-1 pt-1 ${!isSidebarOpen && !isMobile ? 'text-center' : ''}`}>
                    <AnimatePresence mode="wait">
                      {(!isMobile || isSidebarOpen) && (
                        <motion.div
                          initial={isMinimal ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={isMinimal ? undefined : { opacity: 0 }}
                          transition={isMinimal ? { duration: 0 } : { duration: 0.15 }}
                        >
                          <h1 className={`
                            mystic-title text-lg tracking-[0.08em] uppercase
                            transition-all duration-200
                            ${!isSidebarOpen && !isMobile ? 'text-sm' : ''}
                          `}>
                            {!isSidebarOpen && !isMobile ? 'F' : 'FMRL'}
                          </h1>
                          {(isSidebarOpen || isMobile) && (
                            <p className="text-xs text-pip-text-muted mt-1">
                              Frequency Modulated Reality Lens
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Navigation */}
                  <nav aria-label="Main navigation" className="flex flex-col gap-1.5 mt-2 flex-1">
                    {navItems.map((item, index) => (
                      <motion.div
                        key={item.key}
                        initial={isMinimal ? false : { opacity: 0, x: shouldAnimate ? -10 : 0 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={shouldAnimate
                          ? { delay: index * 0.05 }
                          : isMinimal ? { duration: 0 } : { duration: 0.15 }
                        }
                      >
                        <NavLink
                          to={item.path}
                          onClick={() => isMobile && setIsSidebarOpen(false)}
                          end={item.path === '/dashboard'}
                          className={({ isActive }) => `
                            mystic-nav-item
                            ${isActive ? 'is-active' : ''}
                            ${!isSidebarOpen && !isMobile ? '!justify-center !px-2' : ''}
                          `}
                        >
                          {item.icon}
                          {(isSidebarOpen || isMobile) && <span>{item.label}</span>}
                        </NavLink>
                      </motion.div>
                    ))}
                  </nav>

                  {/* Status Section */}
                  <div className={`
                    mystic-status text-xs text-pip-text-secondary
                    ${!isSidebarOpen && !isMobile ? 'hidden' : ''}
                  `}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-pip-emerald animate-pulse' : 'bg-pip-warning'}`} />
                      {isConnected ? 'Connected' : 'Local Mode'}
                    </div>
                    <div className="text-pip-text-muted mt-1">
                      {Math.floor(sessionDuration / 60)}:{String(sessionDuration % 60).padStart(2, '0')}
                    </div>
                    <div className="text-pip-text-muted mt-1">v{__APP_VERSION__}</div>
                  </div>

                  {/* Sidebar Toggle (desktop only) */}
                  {!isMobile && (
                    <button
                      type="button"
                      onClick={toggleSidebar}
                      aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                      aria-expanded={isSidebarOpen}
                      className="mystic-btn mystic-btn-ghost !p-2 flex items-center justify-center"
                    >
                      {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  )}
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
              {isMobile && isSidebarOpen && (
                <motion.div
                  initial={isMinimal ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={isMinimal ? undefined : { opacity: 0 }}
                  transition={isMinimal ? { duration: 0 } : { duration: 0.15 }}
                  onClick={() => setIsSidebarOpen(false)}
                  aria-hidden="true"
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                />
              )}
            </AnimatePresence>

            {/* Main Workspace */}
            <section
              id="main-content"
              aria-label="Main content"
              className="mystic-main-workspace h-full min-h-0 flex flex-col gap-2.5 sm:gap-3 overflow-hidden"
            >
              {/* Header */}
              <header className="flex items-center justify-between gap-3 py-1">
                <div className="flex items-center gap-2">
                  {isMobile && (
                    <motion.button
                      whileTap={shouldAnimate ? { scale: 0.95 } : {}}
                      type="button"
                      onClick={toggleSidebar}
                      aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                      aria-expanded={isSidebarOpen}
                      aria-controls="mobile-sidebar"
                      className="mystic-btn mystic-btn-ghost !p-2"
                    >
                      <Menu className="w-5 h-5" />
                    </motion.button>
                  )}
                  <FadeIn>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-pip-text-muted capitalize">
                        {currentView}
                      </span>
                      {isConnected && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-pip-emerald/20 text-pip-emerald border border-pip-emerald/30">
                          Live
                        </span>
                      )}
                    </div>
                  </FadeIn>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={shouldAnimate ? { scale: 1.02 } : {}}
                    whileTap={shouldAnimate ? { scale: 0.98 } : {}}
                    type="button"
                    onClick={handleShowMetricsGuide}
                    className="mystic-btn mystic-btn-ghost text-xs hidden sm:flex items-center gap-2"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Metrics Guide</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={shouldAnimate ? { scale: 1.02 } : {}}
                    whileTap={shouldAnimate ? { scale: 0.98 } : {}}
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    className="mystic-btn mystic-btn-ghost !p-2 hidden sm:flex"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </motion.button>

                  {/* User Menu */}
                  <div className="pl-2 border-l border-pip-border">
                    <UserMenu />
                  </div>
                </div>
              </header>

              {/* Page Content */}
              <main className="flex-1 min-h-0 overflow-hidden">
                {children}
              </main>
            </section>
          </div>
        </div>
      </div>
    </ShellContext.Provider>
  );
};

// Re-export TimelineDataPoint for convenience
export type { TimelineDataPoint };
