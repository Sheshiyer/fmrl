/**
 * Account Page Wrapper
 * Preserves all account and persistence functionality
 * Auto-fetches Selemene user profile via getMe() for seamless ID resolution
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AccountPage } from './AccountPage';
import { useSelemenePersistence } from '../hooks/useSelemenePersistence';
import { useSelemene } from '../hooks/useSelemene';
import { FadeIn } from '../components/Animations';
import type { SelemeneUserProfile } from '../types/selemene';

export function AccountPageWrapper() {
  const location = useLocation();
  const locationState = location.state as { 
    capturedAnalysis?: { persistedReadingId?: string | null; persistedSnapshotId?: string | null } 
  } | null;

  const persistence = useSelemenePersistence({
    active: true,
  });

  // Auto-fetch Selemene user profile for seamless ID resolution
  const { client, isConnected } = useSelemene();
  const [selemeneProfile, setSelemeneProfile] = useState<SelemeneUserProfile | null>(null);

  useEffect(() => {
    if (!isConnected || !client) return;
    let cancelled = false;
    client.getMe().then(profile => {
      if (!cancelled) setSelemeneProfile(profile);
    }).catch(() => { /* not critical — manual UUID entry still available */ });
    return () => { cancelled = true; };
  }, [client, isConnected]);

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
        configuredUserId={persistence.configuredUserId ?? selemeneProfile?.id ?? null}
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
