import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthModal } from '../../components/Auth/AuthModal';

const useAuthMock = vi.fn();

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

vi.mock('../../context/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../hooks/useMotionPreference', () => ({
  useMotionPreference: () => ({
    shouldAnimate: false,
    isMinimal: true,
  }),
}));

describe('AuthModal', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAuthMock.mockReturnValue({
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signInWithDiscord: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null, user: null }),
      resetPassword: vi.fn().mockResolvedValue({ error: null }),
      enableGuestMode: vi.fn(),
      status: 'unauthenticated',
    });
  });

  it('renders a Discord sign-in action on the login view', () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /continue with discord/i })).toBeInTheDocument();
  });

  it('starts Discord sign-in when the Discord action is clicked', async () => {
    const signInWithDiscord = vi.fn().mockResolvedValue({ error: null });
    const onAuthSuccess = vi.fn();

    useAuthMock.mockReturnValue({
      signIn: vi.fn().mockResolvedValue({ error: null }),
      signInWithDiscord,
      signUp: vi.fn().mockResolvedValue({ error: null, user: null }),
      resetPassword: vi.fn().mockResolvedValue({ error: null }),
      enableGuestMode: vi.fn(),
      status: 'unauthenticated',
    });

    render(<AuthModal isOpen={true} onClose={vi.fn()} onAuthSuccess={onAuthSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /continue with discord/i }));

    expect(signInWithDiscord).toHaveBeenCalledTimes(1);
  });
});
