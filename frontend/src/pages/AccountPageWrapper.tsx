/**
 * Account Page Wrapper
 * Preserves all account and persistence functionality
 */
import { useLocation } from 'react-router-dom';
import { AccountPage } from './AccountPage';
import { useBiofieldPersistence } from '../hooks/useBiofieldPersistence';
import { FadeIn } from '../components/Animations';

export function AccountPageWrapper() {
  const location = useLocation();
  const locationState = location.state as { 
    capturedAnalysis?: { persistedReadingId?: string | null; persistedSnapshotId?: string | null } 
  } | null;

  const persistence = useBiofieldPersistence({
    active: true,
  });

  const handleRefresh = () => {
    void persistence.refreshHealth();
    void persistence.refreshSessions();
    void persistence.refreshSnapshots();
    void persistence.refreshHistory();
    void persistence.refreshBaseline();
  };

  return (
    <FadeIn className="h-full overflow-auto">
      <AccountPage
        configuredUserId={persistence.configuredUserId ?? null}
        canPersist={persistence.canPersist}
        persistenceEnabled={persistence.enabled}
        persistenceHealthy={persistence.healthy}
        sessionId={persistence.session?.id ?? null}
        sessionStatus={persistence.session?.status ?? null}
        historyTotal={persistence.history?.total ?? 0}
        lastReadingId={
          locationState?.capturedAnalysis?.persistedReadingId ?? 
          persistence.history?.items?.[0]?.id ?? 
          persistence.snapshots?.[0]?.reading_id ?? 
          null
        }
        lastSnapshotId={
          locationState?.capturedAnalysis?.persistedSnapshotId ?? 
          persistence.lastSnapshot?.id ?? 
          persistence.snapshots?.[0]?.id ?? 
          null
        }
        baselineName={persistence.currentBaseline?.name ?? null}
        sessions={persistence.sessions}
        snapshots={persistence.snapshots}
        error={persistence.error}
        onSaveUserId={persistence.saveConfiguredUserId}
        onClearUserId={persistence.clearConfiguredUserId}
        onRefresh={handleRefresh}
      />
    </FadeIn>
  );
}
