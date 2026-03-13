/**
 * Unified Export Service - Dispatches export requests to the appropriate
 * format-specific service (PDF, CSV, JSON, XLSX).
 */
import type { CapturedAnalysisData, ExportFormat } from '../types';
import { pdfExportService } from './PDFExportService';
import { csvExportService } from './CSVExportService';
import { jsonExportService } from './JSONExportService';
import { xlsxExportService } from './XLSXExportService';

interface InsightItem {
  type: 'positive' | 'warning' | 'info';
  text: string;
}

/**
 * Export a captured analysis session in the requested format.
 *
 * - `pdf`  – Full report with image, insights, and notes
 * - `csv`  – Scores, metrics, and timeline as CSV
 * - `json` – Pretty-printed JSON of all data
 * - `xlsx` – Excel-compatible SpreadsheetML workbook
 */
export function exportSession(
  format: ExportFormat,
  data: CapturedAnalysisData,
  insights?: InsightItem[],
  notes?: string,
): void {
  switch (format) {
    case 'pdf':
      // PDF is async (image embedding) – fire and forget
      pdfExportService.generateReport(data, insights ?? [], notes ?? '');
      break;
    case 'csv':
      csvExportService.exportSession(data);
      break;
    case 'json':
      jsonExportService.exportSession(data);
      break;
    case 'xlsx':
      xlsxExportService.exportSession(data);
      break;
    default: {
      // Exhaustive check – will be a compile error if a new ExportFormat is added
      const _exhaustive: never = format;
      throw new Error(`Unsupported export format: ${_exhaustive}`);
    }
  }
}
