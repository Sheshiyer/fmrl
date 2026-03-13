/**
 * CSV Export Service - Generates CSV downloads from PIP analysis data
 *
 * Produces a single CSV file with three labelled sections:
 *   1. Composite Scores
 *   2. Raw Metrics
 *   3. Timeline
 */
import type { CapturedAnalysisData } from '../types';

export class CSVExportService {
  /**
   * Export captured analysis data as a downloadable CSV file.
   */
  exportSession(data: CapturedAnalysisData): void {
    const rows: string[] = [];

    // --- Section 1: Scores ---
    rows.push('=== Composite Scores ===');
    rows.push('Score,Value');
    rows.push(`Energy,${data.scores.energy}`);
    rows.push(`Symmetry,${data.scores.symmetry}`);
    rows.push(`Coherence,${data.scores.coherence}`);
    rows.push(`Complexity,${data.scores.complexity}`);
    rows.push(`Regulation,${data.scores.regulation}`);
    rows.push(`Color Balance,${data.scores.colorBalance}`);
    rows.push('');

    // --- Section 2: Metrics ---
    rows.push('=== Raw Metrics ===');
    rows.push('Metric,Value');
    rows.push(`Light Quanta Density (LQD),${data.metrics.lqd}`);
    rows.push(`Average Intensity,${data.metrics.avgIntensity}`);
    rows.push(`Inner Noise (%),${data.metrics.innerNoise}`);
    rows.push(`Fractal Dimension,${data.metrics.fractalDim}`);
    rows.push(`Hurst Exponent,${data.metrics.hurstExp}`);
    rows.push(`Horizontal Symmetry,${data.metrics.horizontalSymmetry}`);
    rows.push(`Vertical Symmetry,${data.metrics.verticalSymmetry}`);
    rows.push('');

    // --- Section 3: Timeline ---
    rows.push('=== Timeline ===');
    rows.push('Time (s),Energy,Symmetry,Coherence');
    for (const point of data.timeline) {
      rows.push(`${point.time},${point.energy},${point.symmetry},${point.coherence}`);
    }
    rows.push('');

    // --- Metadata footer ---
    rows.push('=== Session Metadata ===');
    rows.push(`Timestamp,${data.timestamp.toISOString()}`);
    rows.push(`Session Duration (s),${data.sessionDuration}`);

    const csvContent = rows.join('\n');
    const filename = `PIP_Analysis_${this.formatDateForFilename(data.timestamp)}.csv`;
    this.triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
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
export const csvExportService = new CSVExportService();
