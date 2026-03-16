import { useEffect, useMemo, useState } from 'react';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useStoragePermission } from '../../hooks/useStoragePermission';
import { useAuth } from '../../context/auth/AuthContext';
import { ensureBackendReady, getBackendLogs, isTauriRuntime, openNativeSettings, repairCameraPermissionState } from '../../utils/runtimeApi';

type Step = 'intent' | 'auth' | 'camera' | 'storage' | 'runtime';

interface NativeOnboardingProps {
  onComplete: (options?: { force?: boolean }) => void;
}

const STEP_FLOW: Step[] = ['intent', 'auth', 'camera', 'storage', 'runtime'];

function stepLabel(step: Step): string {
  switch (step) {
    case 'intent':
      return 'Intent';
    case 'auth':
      return 'Account';
    case 'camera':
      return 'Camera';
    case 'storage':
      return 'Storage';
    case 'runtime':
      return 'Runtime';
    default:
      return 'Step';
  }
}

export function NativeOnboarding({ onComplete }: NativeOnboardingProps) {
  const [step, setStep] = useState<Step>('intent');
  const auth = useAuth();
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);
  const [repairInProgress, setRepairInProgress] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [, setRuntimeDetail] = useState<string | null>(null);
  const [runtimeChecking, setRuntimeChecking] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);

  const { state: cameraState, error: cameraError, requestPermission, checkPermission } = useCameraPermission();
  const {
    state: storageState,
    error: storageError,
    directoryLabel,
    requestPermission: requestStoragePermission,
    checkPermission: checkStoragePermission,
  } = useStoragePermission();

  const isDesktopRuntime = useMemo(() => isTauriRuntime(), []);
  const stepIndex = useMemo(() => STEP_FLOW.indexOf(step), [step]);

  // Auto-advance past auth step when returning from OAuth callback
  // Handles both: landing on 'intent' after redirect, and auth resolving while on 'auth' step
  useEffect(() => {
    if (auth.status === 'authenticated' && (step === 'intent' || step === 'auth')) {
      setStep('camera');
    }
  }, [auth.status, step]);

  const cameraGranted = cameraState === 'granted';
  const storageReady = storageState === 'ready';

  const cameraLabel = useMemo(() => {
    switch (cameraState) {
      case 'checking':
        return 'Checking camera access';
      case 'prompt':
        return 'Camera permission required';
      case 'granted':
        return 'Camera permission granted';
      case 'denied':
        return 'Camera permission denied';
      case 'unsupported':
        return 'Camera API unsupported';
      default:
        return 'Camera permission error';
    }
  }, [cameraState]);

  const storageLabel = useMemo(() => {
    switch (storageState) {
      case 'checking':
        return 'Checking storage setup';
      case 'ready':
        return `Export path configured${directoryLabel ? ` · ${directoryLabel}` : ''}`;
      case 'requires-picker':
        return 'Select an export destination to enable guided saves';
      case 'denied':
        return 'Storage access denied';
      default:
        return 'Storage setup error';
    }
  }, [directoryLabel, storageState]);

  const openSettings = async (target: 'camera' | 'storage') => {
    setSettingsError(null);
    try {
      const opened = await openNativeSettings(target);
      if (!opened) {
        setSettingsError('Native settings deep-link is available only in desktop runtime.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open system settings.';
      setSettingsError(message);
    }
  };

  const runPermissionRepair = async () => {
    setSettingsError(null);
    setRepairMessage(null);
    setRepairInProgress(true);
    try {
      const message = await repairCameraPermissionState();
      setRepairMessage(message);
      await checkPermission();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run permission repair.';
      setSettingsError(message);
    } finally {
      setRepairInProgress(false);
    }
  };

  const handleRuntimeCheck = async () => {
    setRuntimeChecking(true);
    setRuntimeError(null);
    setRuntimeDetail(null);

    try {
      let finalStatus = await ensureBackendReady(4000);
      if (!finalStatus.ready) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        finalStatus = await ensureBackendReady(4500);
      }

      setRuntimeReady(finalStatus.ready);
      if (finalStatus.ready) {
        // Backend connected — clear any previous errors
        setRuntimeError(null);
      }
      if (!finalStatus.ready) {
        setRuntimeError(finalStatus.error ?? 'Backend is not ready yet.');

        const logsResult = await getBackendLogs(20);
        if (logsResult.supported && logsResult.logs.length > 0) {
          const lastLog = logsResult.logs[logsResult.logs.length - 1];
          setRuntimeDetail(lastLog);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check runtime health.';
      setRuntimeReady(false);
      setRuntimeError(message);
    } finally {
      setRuntimeChecking(false);
    }
  };

  // Runtime check is manual-only — no auto-fire
  // User clicks "Check Backend Connection" if they want to verify

  return (
    <div className="mystic-bg min-h-screen text-pip-text-primary flex items-center justify-center p-4 sm:p-6">
      <div className="mystic-panel w-full max-w-3xl p-6 sm:p-8 lg:p-10 space-y-7">
        <div className="space-y-2 text-center">
          <p className="text-xs tracking-[0.35em] uppercase text-pip-gold/90">Consciousness Interface</p>
          <h1 className="mystic-title text-3xl sm:text-4xl">Selemene Engine Setup</h1>
          <p className="text-pip-text-secondary max-w-xl mx-auto">
            Configure native permissions with a guided flow for camera access, export readiness, and runtime health.
          </p>
        </div>

        <div className="mystic-divider" />

        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {STEP_FLOW.map((item, index) => {
            const active = item === step;
            const complete = index < stepIndex;
            return (
              <div key={item} className={`mystic-step-chip ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}>
                <span className="text-[10px] tracking-[0.22em] uppercase">{String(index + 1).padStart(2, '0')}</span>
                <span>{stepLabel(item)}</span>
              </div>
            );
          })}
        </div>

        {step === 'intent' && (
          <section className="mystic-card space-y-5">
            <h2 className="text-xl font-medium tracking-wide">Before you begin</h2>
            <p className="text-pip-text-secondary leading-relaxed">
              This native onboarding ensures your camera signal can be accessed securely and your export destination is configured
              for reliable session capture and report delivery.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-xs text-pip-text-secondary">
              <div className="mystic-status">1 · Sign in or continue as guest</div>
              <div className="mystic-status">2 · Camera permission request</div>
              <div className="mystic-status">3 · Storage &amp; runtime setup</div>
            </div>
            <div>
              <button type="button" className="mystic-btn mystic-btn-primary" onClick={() => setStep('auth')}>
                Start Native Setup
              </button>
            </div>
          </section>
        )}

        {step === 'auth' && (
          <section className="mystic-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-medium tracking-wide">Sign In</h2>
              <span className={`mystic-badge ${auth.status === 'authenticated' ? 'is-success' : auth.status === 'guest' ? 'is-info' : 'is-warning'}`}>
                {auth.status === 'authenticated' ? 'Signed in' : auth.status === 'guest' ? 'Guest mode' : 'Not signed in'}
              </span>
            </div>

            <p className="text-sm text-pip-text-secondary">
              Sign in with Discord to sync your sessions across devices and access community features.
              Or continue as a guest — all core features work offline.
            </p>

            {auth.status === 'authenticated' && auth.user && (
              <div className="mystic-success text-sm flex items-center gap-2">
                <span>✓</span>
                <span>Signed in as <strong>{auth.user.user_metadata?.full_name || auth.user.email || 'User'}</strong></span>
                {auth.user.user_metadata?.avatar_url && (
                  <img
                    src={auth.user.user_metadata.avatar_url as string}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                )}
              </div>
            )}

            {auth.status !== 'authenticated' && (
              <div className="space-y-3">
                <button
                  type="button"
                  className="mystic-btn mystic-btn-primary w-full flex items-center justify-center gap-2"
                  onClick={() => void auth.signInWithDiscord()}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                  Sign in with Discord
                </button>

                <button
                  type="button"
                  className="mystic-btn mystic-btn-ghost w-full"
                  onClick={() => {
                    auth.enableGuestMode();
                    setStep('camera');
                  }}
                >
                  Continue as Guest
                </button>
              </div>
            )}

            {auth.error && (
              <p className="text-xs text-red-400">
                {auth.error.message}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="mystic-btn mystic-btn-ghost" onClick={() => setStep('intent')}>
                Back
              </button>
              {(auth.status === 'authenticated' || auth.status === 'guest') && (
                <button type="button" className="mystic-btn mystic-btn-primary" onClick={() => setStep('camera')}>
                  Continue
                </button>
              )}
            </div>
          </section>
        )}

        {step === 'camera' && (
          <section className="mystic-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-medium tracking-wide">Camera Permission</h2>
              <span className={`mystic-badge ${cameraGranted ? 'is-success' : 'is-warning'}`}>{cameraLabel}</span>
            </div>

            <p className="text-sm text-pip-text-secondary">
              Request camera access. If access was denied earlier, use native System Settings and then recheck.
            </p>

            {(cameraError || settingsError) && (
              <div className="mystic-error">{cameraError ?? settingsError}</div>
            )}

            {repairMessage && (
              <div className="rounded-xl border border-emerald-300/35 bg-emerald-950/35 px-3 py-2 text-xs text-emerald-200">
                {repairMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" className="mystic-btn mystic-btn-primary" onClick={() => void requestPermission()}>
                Request Camera Access
              </button>
              <button type="button" className="mystic-btn mystic-btn-secondary" onClick={() => void checkPermission()}>
                Recheck
              </button>
              {cameraState === 'denied' && isDesktopRuntime && (
                <>
                  <button
                    type="button"
                    className="mystic-btn mystic-btn-recovery"
                    onClick={() => void openSettings('camera')}
                  >
                    Open System Settings
                  </button>
                  <button
                    type="button"
                    className="mystic-btn mystic-btn-ghost"
                    onClick={() => void runPermissionRepair()}
                    disabled={repairInProgress}
                  >
                    {repairInProgress ? 'Repairing…' : 'Repair Permissions'}
                  </button>
                </>
              )}
            </div>

            {cameraState === 'denied' && isDesktopRuntime && (
              <ol className="list-decimal list-inside text-xs text-pip-text-muted space-y-1">
                <li>Click <strong>Repair Permissions</strong> once if the app is missing from the Camera list.</li>
                <li>Quit and reopen Selemene Engine from Applications.</li>
                <li>Click <strong>Request Camera Access</strong> to trigger a fresh macOS prompt.</li>
              </ol>
            )}

            {cameraState === 'denied' && !isDesktopRuntime && (
              <p className="text-xs text-pip-text-muted">
                Open browser or device settings, grant camera permission for this app, then recheck.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" className="mystic-btn mystic-btn-ghost" onClick={() => setStep('auth')}>
                Back
              </button>
              <button
                type="button"
                className="mystic-btn mystic-btn-primary"
                disabled={!cameraGranted}
                onClick={() => setStep('storage')}
              >
                Continue to Storage
              </button>
            </div>
          </section>
        )}

        {step === 'storage' && (
          <section className="mystic-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-medium tracking-wide">Storage & Exports</h2>
              <span className={`mystic-badge ${storageReady ? 'is-success' : 'is-warning'}`}>{storageLabel}</span>
            </div>

            <p className="text-sm text-pip-text-secondary">
              Choose where generated reports should be saved. This keeps exports predictable in desktop runtime.
            </p>

            {(storageError || settingsError) && <div className="mystic-error">{storageError ?? settingsError}</div>}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="mystic-btn mystic-btn-primary"
                onClick={() => void requestStoragePermission()}
              >
                Choose Export Folder
              </button>
              <button
                type="button"
                className="mystic-btn mystic-btn-secondary"
                onClick={() => void checkStoragePermission()}
              >
                Recheck
              </button>
              {storageState === 'denied' && isDesktopRuntime && (
                <button
                  type="button"
                  className="mystic-btn mystic-btn-recovery"
                  onClick={() => void openSettings('storage')}
                >
                  Open System Settings
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" className="mystic-btn mystic-btn-ghost" onClick={() => setStep('camera')}>
                Back
              </button>
              <button
                type="button"
                className="mystic-btn mystic-btn-primary"
                disabled={!storageReady}
                onClick={() => setStep('runtime')}
              >
                Continue to Runtime
              </button>
            </div>
          </section>
        )}

        {step === 'runtime' && (
          <section className="mystic-card space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-medium tracking-wide">Ready to Go</h2>
              <span className={`mystic-badge ${runtimeReady ? 'is-success' : 'is-info'}`}>
                {runtimeReady ? 'Backend connected' : 'Offline mode available'}
              </span>
            </div>

            <p className="text-sm text-pip-text-secondary">
              Selemene Engine works fully offline with local compute. The backend server connects automatically in the background when available.
            </p>

            {runtimeReady && (
              <div className="mystic-success text-sm">✓ Backend is online and ready.</div>
            )}

            {!runtimeReady && !runtimeChecking && (
              <button
                type="button"
                className="mystic-btn mystic-btn-secondary"
                onClick={() => void handleRuntimeCheck()}
              >
                Check Backend Connection (Optional)
              </button>
            )}

            {runtimeChecking && (
              <p className="text-xs text-pip-text-muted animate-pulse">Checking backend connection…</p>
            )}

            {runtimeError && (
              <p className="text-xs text-pip-text-muted">
                Backend not available — that&apos;s fine. All core features work offline.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="mystic-btn mystic-btn-ghost" onClick={() => setStep('storage')}>
                Back
              </button>
              <button
                type="button"
                className="mystic-btn mystic-btn-primary"
                onClick={() => onComplete({ force: !runtimeReady })}
              >
                Enter Selemene Engine
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
