import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShortcutsHelp } from '../../components/UI/ShortcutsHelp';

/**
 * TDD Tests for ShortcutsHelp overlay component
 * RED phase — all tests written before implementation
 */

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
        ({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>,
      ),
    },
    useReducedMotion: () => false,
  };
});

describe('ShortcutsHelp', () => {
  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <ShortcutsHelp isOpen={false} onClose={vi.fn()} />,
      );
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('renders dialog when isOpen is true', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('displays title "Keyboard Shortcuts"', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  describe('shortcut groups', () => {
    it('displays Actions group', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays Navigation group', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('displays Display group', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Display')).toBeInTheDocument();
    });

    it('displays Space shortcut for Capture', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Capture Frame')).toBeInTheDocument();
    });

    it('displays P shortcut for Play/Pause', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Play / Pause')).toBeInTheDocument();
    });

    it('displays analysis region shortcuts', () => {
      render(<ShortcutsHelp isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Full Body Mode')).toBeInTheDocument();
      expect(screen.getByText('Face Mode')).toBeInTheDocument();
      expect(screen.getByText('Body Mode')).toBeInTheDocument();
    });
  });

  describe('dismissal', () => {
    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<ShortcutsHelp isOpen={true} onClose={onClose} />);
      const backdrop = screen.getByTestId('shortcuts-backdrop');
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ShortcutsHelp isOpen={true} onClose={onClose} />);
      const closeButton = screen.getByLabelText('Close shortcuts help');
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
