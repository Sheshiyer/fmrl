/**
 * JSON Export Service - Generates pretty-printed JSON downloads from PIP analysis data
 *
 * Exports the full CapturedAnalysisData structure as a human-readable
 * JSON file that can be re-imported or processed by other tools.
 */
import type { CapturedAnalysisData } from '../types';

export class JSONExportService {
  /**
   * Export captured analysis data as a downloadable JSON file.
   */
  exportSession(data: CapturedAnalysisData): void {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      capturedAt: data.timestamp.toISOString(),
      sessionDuration: data.sessionDuration,
      scores: data.scores,
      metrics: data.metrics,
      timeline: data.timeline,
      metadata: {
        persistedReadingId: data.persistedReadingId ?? null,
        persistedSnapshotId: data.persistedSnapshotId ?? null,
        persistenceState: data.persistenceState ?? null,
        captureRoute: data.captureRoute ?? null,
      },
    };

    const jsonContent = JSON.stringify(exportPayload, null, 2);
    const filename = `PIP_Analysis_${this.formatDateForFilename(data.timestamp)}.json`;
    this.triggerDownload(jsonContent, filename, 'application/json;charset=utf-8;');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private formatDateForFilename(date: Date): string {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}_${h}-${mi}`;
  }

  private triggerDownload(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const jsonExportService = new JSONExportService();
