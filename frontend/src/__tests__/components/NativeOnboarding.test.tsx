import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NativeOnboarding } from '../../components/Onboarding/NativeOnboarding';

const useAuthMock = vi.fn();
const useAppStateMock = vi.fn();

vi.mock('../../context/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../context/appState', () => ({
  useAppState: () => useAppStateMock(),
}));

vi.mock('../../hooks/useCameraPermission', () => ({
  useCameraPermission: () => ({
    state: 'granted',
    error: null,
    requestPermission: vi.fn(),
    checkPermission: vi.fn(),
  }),
}));

vi.mock('../../hooks/useStoragePermission', () => ({
  useStoragePermission: () => ({
    state: 'ready',
    error: null,
    directoryLabel: 'Exports',
    requestPermission: vi.fn(),
    checkPermission: vi.fn(),
  }),
}));

vi.mock('../../utils/runtimeApi', () => ({
  ensureBackendReady: vi.fn().mockResolvedValue({ ready: true, baseUrl: 'http://localhost:8000' }),
  getBackendLogs: vi.fn().mockResolvedValue({ supported: true, logs: [] }),
  isTauriRuntime: vi.fn().mockReturnValue(false),
  openNativeSettings: vi.fn().mockResolvedValue(false),
  repairCameraPermissionState: vi.fn().mockResolvedValue('ok'),
}));

describe('NativeOnboarding', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAppStateMock.mockReset();

    useAuthMock.mockReturnValue({
      status: 'authenticated',
      user: { email: 'user@example.com', user_metadata: { full_name: 'User' } },
      error: null,
      selemeneStatus: 'connected',
      signInWithDiscord: vi.fn().mockResolvedValue({ error: null }),
      enableGuestMode: vi.fn(),
      setSelemeneApiKey: vi.fn(),
      connectSelemene: vi.fn().mockResolvedValue({ error: null }),
    });

    useAppStateMock.mockReturnValue({
      state: { birthData: null },
      setBirthData: vi.fn(),
    });
  });

  it('does not require a separate Selemene step for authenticated users', () => {
    render(<NativeOnboarding onComplete={vi.fn()} />);

    expect(screen.queryByText('Engine')).toBeNull();
    expect(screen.queryByRole('heading', { name: /birth data/i })).not.toBeNull();
  });
});
