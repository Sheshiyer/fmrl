/**
 * ShortcutsHelp — Modal overlay listing all keyboard shortcuts
 *
 * Triggered by pressing ? (Shift+Slash).
 * Grouped into Actions, Navigation, and Display categories.
 * Respects prefers-reduced-motion via framer-motion's useReducedMotion.
 * Styled with existing CSS custom properties (--color-pip-*).
 */
import { useReducedMotion, motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shortcut display data
// ---------------------------------------------------------------------------

interface ShortcutEntry {
  key: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Actions',
    items: [
      { key: 'Space', label: 'Capture Frame' },
      { key: 'P', label: 'Play / Pause' },
      { key: '1', label: 'Full Body Mode' },
      { key: '2', label: 'Face Mode' },
      { key: '3', label: 'Body Mode' },
    ],
  },
  {
    title: 'Navigation',
    items: [
      { key: 'Esc', label: 'Close Modal / Menu' },
      { key: '?', label: 'Show Shortcuts' },
    ],
  },
  {
    title: 'Display',
    items: [
      { key: 'F', label: 'Toggle Fullscreen' },
      { key: '[', label: 'Toggle Sidebar' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  const shouldReduceMotion = useReducedMotion();

  const overlayVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      };

  const panelVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 12 },
        visible: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 12 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard Shortcuts"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            data-testid="shortcuts-backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="
              relative z-10 w-full max-w-md mx-4
              rounded-xl border border-pip-border
              bg-pip-panel shadow-2xl
              overflow-hidden
            "
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-pip-border">
              <h2 className="text-base font-semibold text-pip-text-primary tracking-wide">
                Keyboard Shortcuts
              </h2>
              <button
                type="button"
                aria-label="Close shortcuts help"
                onClick={onClose}
                className="
                  p-1.5 rounded-lg
                  text-pip-text-muted hover:text-pip-text-primary
                  hover:bg-white/5 transition-colors
                "
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-medium uppercase tracking-widest text-pip-text-muted mb-2.5">
                    {group.title}
                  </h3>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.03]"
                      >
                        <span className="text-sm text-pip-text-secondary">
                          {item.label}
                        </span>
                        <kbd className="
                          inline-flex items-center justify-center
                          min-w-[2rem] px-2 py-0.5
                          text-xs font-mono
                          rounded-md border border-pip-border
                          bg-white/[0.04] text-pip-text-primary
                          shadow-sm
                        ">
                          {item.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-3 border-t border-pip-border">
              <p className="text-xs text-pip-text-muted text-center">
                Press <kbd className="px-1 py-0.5 text-[10px] font-mono rounded border border-pip-border bg-white/[0.04]">Esc</kbd> to dismiss
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
