/**
 * XLSX Export Service - Generates Excel-compatible XML Spreadsheet downloads
 *
 * Uses the SpreadsheetML 2003 XML format that Excel, LibreOffice, and
 * Google Sheets can all open natively. No third-party XLSX library required.
 *
 * Produces three worksheets:
 *   1. Scores   – Composite score name/value pairs
 *   2. Metrics  – Raw metric name/value pairs
 *   3. Timeline – Time-series data (time, energy, symmetry, coherence)
 */
import type { CapturedAnalysisData } from '../types';

export class XLSXExportService {
  /**
   * Export captured analysis data as a downloadable .xlsx file
   * (SpreadsheetML XML format).
   */
  exportSession(data: CapturedAnalysisData): void {
    const xml = this.buildSpreadsheetML(data);
    const filename = `PIP_Analysis_${this.formatDateForFilename(data.timestamp)}.xlsx`;
    this.triggerDownload(xml, filename, 'application/vnd.ms-excel');
  }

  // ---------------------------------------------------------------------------
  // SpreadsheetML builder
  // ---------------------------------------------------------------------------

  private buildSpreadsheetML(data: CapturedAnalysisData): string {
    const lines: string[] = [];

    // XML header & workbook root
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<?mso-application progid="Excel.Sheet"?>');
    lines.push(
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
      ' xmlns:o="urn:schemas-microsoft-com:office:office"',
      ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
    );

    // Styles (header row bold)
    lines.push('<Styles>');
    lines.push('  <Style ss:ID="header">');
    lines.push('    <Font ss:Bold="1" ss:Size="11"/>');
    lines.push('    <Interior ss:Color="#E8E8E8" ss:Pattern="Solid"/>');
    lines.push('  </Style>');
    lines.push('  <Style ss:ID="meta">');
    lines.push('    <Font ss:Italic="1" ss:Color="#666666"/>');
    lines.push('  </Style>');
    lines.push('</Styles>');

    // Worksheet 1: Scores
    lines.push(this.buildScoresSheet(data));

    // Worksheet 2: Metrics
    lines.push(this.buildMetricsSheet(data));

    // Worksheet 3: Timeline
    lines.push(this.buildTimelineSheet(data));

    lines.push('</Workbook>');
    return lines.join('\n');
  }

  private buildScoresSheet(data: CapturedAnalysisData): string {
    const rows: string[] = [];
    rows.push('<Worksheet ss:Name="Scores">');
    rows.push('  <Table>');

    // Header row
    rows.push(this.headerRow(['Score', 'Value']));

    // Data rows
    rows.push(this.dataRow([this.str('Energy'), this.num(data.scores.energy)]));
    rows.push(this.dataRow([this.str('Symmetry'), this.num(data.scores.symmetry)]));
    rows.push(this.dataRow([this.str('Coherence'), this.num(data.scores.coherence)]));
    rows.push(this.dataRow([this.str('Complexity'), this.num(data.scores.complexity)]));
    rows.push(this.dataRow([this.str('Regulation'), this.num(data.scores.regulation)]));
    rows.push(this.dataRow([this.str('Color Balance'), this.num(data.scores.colorBalance)]));

    // Blank row + metadata
    rows.push('    <Row/>');
    rows.push(this.metaRow('Captured', data.timestamp.toISOString()));
    rows.push(this.metaRow('Session Duration (s)', String(data.sessionDuration)));

    rows.push('  </Table>');
    rows.push('</Worksheet>');
    return rows.join('\n');
  }

  private buildMetricsSheet(data: CapturedAnalysisData): string {
    const rows: string[] = [];
    rows.push('<Worksheet ss:Name="Metrics">');
    rows.push('  <Table>');

    // Header row
    rows.push(this.headerRow(['Metric', 'Value']));

    // Data rows
    rows.push(this.dataRow([this.str('Light Quanta Density (LQD)'), this.num(data.metrics.lqd)]));
    rows.push(this.dataRow([this.str('Average Intensity'), this.num(data.metrics.avgIntensity)]));
    rows.push(this.dataRow([this.str('Inner Noise (%)'), this.num(data.metrics.innerNoise)]));
    rows.push(this.dataRow([this.str('Fractal Dimension'), this.num(data.metrics.fractalDim)]));
    rows.push(this.dataRow([this.str('Hurst Exponent'), this.num(data.metrics.hurstExp)]));
    rows.push(this.dataRow([this.str('Horizontal Symmetry'), this.num(data.metrics.horizontalSymmetry)]));
    rows.push(this.dataRow([this.str('Vertical Symmetry'), this.num(data.metrics.verticalSymmetry)]));

    rows.push('  </Table>');
    rows.push('</Worksheet>');
    return rows.join('\n');
  }

  private buildTimelineSheet(data: CapturedAnalysisData): string {
    const rows: string[] = [];
    rows.push('<Worksheet ss:Name="Timeline">');
    rows.push('  <Table>');

    // Header row
    rows.push(this.headerRow(['Time (s)', 'Energy', 'Symmetry', 'Coherence']));

    // Data rows
    for (const point of data.timeline) {
      rows.push(this.dataRow([
        this.num(point.time),
        this.num(point.energy),
        this.num(point.symmetry),
        this.num(point.coherence),
      ]));
    }

    rows.push('  </Table>');
    rows.push('</Worksheet>');
    return rows.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Cell helpers
  // ---------------------------------------------------------------------------

  private headerRow(labels: string[]): string {
    const cells = labels
      .map((l) => `<Cell ss:StyleID="header"><Data ss:Type="String">${this.esc(l)}</Data></Cell>`)
      .join('');
    return `    <Row>${cells}</Row>`;
  }

  private dataRow(cells: string[]): string {
    return `    <Row>${cells.join('')}</Row>`;
  }

  private metaRow(label: string, value: string): string {
    return `    <Row><Cell ss:StyleID="meta"><Data ss:Type="String">${this.esc(label)}</Data></Cell><Cell ss:StyleID="meta"><Data ss:Type="String">${this.esc(value)}</Data></Cell></Row>`;
  }

  private str(value: string): string {
    return `<Cell><Data ss:Type="String">${this.esc(value)}</Data></Cell>`;
  }

  private num(value: number): string {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }

  /** Escape XML special characters */
  private esc(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---------------------------------------------------------------------------
  // Download & formatting helpers
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
export const xlsxExportService = new XLSXExportService();
