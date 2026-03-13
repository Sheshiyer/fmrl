import { useMemo, useState } from 'react';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useStoragePermission } from '../../hooks/useStoragePermission';
import { ensureBackendReady, getBackendLogs, isTauriRuntime, openNativeSettings, repairCameraPermissionState } from '../../utils/runtimeApi';

type Step = 'intent' | 'camera' | 'storage' | 'runtime';

interface NativeOnboardingProps {
  onComplete: (options?: { force?: boolean }) => void;
}

const STEP_FLOW: Step[] = ['intent', 'camera', 'storage', 'runtime'];

function stepLabel(step: Step): string {
  switch (step) {
    case 'intent':
      return 'Intent';
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
          <h1 className="mystic-title text-3xl sm:text-4xl">Biofield Mirror Setup</h1>
          <p className="text-pip-text-secondary max-w-xl mx-auto">
            Configure native permissions with a guided flow for camera access, export readiness, and runtime health.
          </p>
        </div>

        <div className="mystic-divider" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
              <div className="mystic-status">1 · Camera permission request</div>
              <div className="mystic-status">2 · Storage destination setup</div>
              <div className="mystic-status">3 · Runtime health verification</div>
            </div>
            <div>
              <button type="button" className="mystic-btn mystic-btn-primary" onClick={() => setStep('camera')}>
                Start Native Setup
              </button>
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
                <li>Quit and reopen Biofield Mirror from Applications.</li>
                <li>Click <strong>Request Camera Access</strong> to trigger a fresh macOS prompt.</li>
              </ol>
            )}

            {cameraState === 'denied' && !isDesktopRuntime && (
              <p className="text-xs text-pip-text-muted">
                Open browser or device settings, grant camera permission for this app, then recheck.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" className="mystic-btn mystic-btn-ghost" onClick={() => setStep('intent')}>
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
              Biofield Mirror works fully offline with local compute. The backend server connects automatically in the background when available.
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
                Enter Biofield Mirror
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
