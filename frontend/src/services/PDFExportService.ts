/**
 * PDF Export Service - Generates PDF reports from PIP analysis data
 */
import { jsPDF } from 'jspdf';
import type { CapturedAnalysisData } from '../pages/DetailedAnalysis';

interface InsightItem {
  type: 'positive' | 'warning' | 'info';
  text: string;
}

export class PDFExportService {
  private doc!: jsPDF;
  private yPos: number = 20;
  private pageWidth: number = 210;
  private pageHeight: number = 297;
  private margin: number = 20;

  /**
   * Generate a complete PDF report from captured analysis data
   */
  async generateReport(
    data: CapturedAnalysisData,
    insights: InsightItem[],
    notes: string
  ): Promise<void> {
    // Create fresh jsPDF instance for each export
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.yPos = 20;

    try {
      console.log('PDF: Adding header...');
      // Header
      this.addHeader(data);

      console.log('PDF: Adding image...');
      // Visual Section (Image)
      await this.addImage(data.imageUrl);

      console.log('PDF: Adding scores...');
      // Scores Section
      this.addScoresSection(data.scores);

      console.log('PDF: Adding metrics...');
      // Raw Metrics Section
      this.addMetricsSection(data.metrics);

      console.log('PDF: Adding insights...');
      // Insights Section
      this.addInsightsSection(insights);

      console.log('PDF: Adding notes...');
      // Notes Section
      this.addNotesSection(notes);

      console.log('PDF: Adding footer...');
      // Footer
      this.addFooter();

      console.log('PDF: Saving file...');
      // Download the PDF
      const filename = `PIP_Analysis_Report_${this.formatDateForFilename(data.timestamp)}.pdf`;
      this.doc.save(filename);
      console.log('PDF: File saved as', filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  private addHeader(data: CapturedAnalysisData): void {
    // Title
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(79, 70, 229); // Indigo color
    this.doc.text('PIP Analysis Report', this.pageWidth / 2, this.yPos, { align: 'center' });
    this.yPos += 12;

    // Capture info
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    const dateStr = data.timestamp.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const timeStr = data.timestamp.toLocaleTimeString();
    const durationStr = this.formatDuration(data.sessionDuration);
    
    this.doc.text(`Captured: ${dateStr} at ${timeStr}`, this.pageWidth / 2, this.yPos, { align: 'center' });
    this.yPos += 6;
    this.doc.text(`Session Duration: ${durationStr}`, this.pageWidth / 2, this.yPos, { align: 'center' });
    this.yPos += 10;

    // Divider line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.yPos, this.pageWidth - this.margin, this.yPos);
    this.yPos += 10;
  }

  private async addImage(imageUrl?: string): Promise<void> {
    if (!imageUrl) {
      console.log('PDF addImage: No image URL provided');
      this.doc.setFontSize(12);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text('No image captured', this.pageWidth / 2, this.yPos + 20, { align: 'center' });
      this.yPos += 50;
      return;
    }

    try {
      console.log('PDF addImage: Image URL length:', imageUrl.length);
      // Calculate image dimensions to fit page width with margins
      const imgWidth = this.pageWidth - (this.margin * 2);
      const imgHeight = imgWidth * 0.75; // 4:3 aspect ratio

      // jsPDF 3.x API - addImage with data URL
      this.doc.addImage({
        imageData: imageUrl,
        format: 'PNG',
        x: this.margin,
        y: this.yPos,
        width: imgWidth,
        height: imgHeight
      });
      this.yPos += imgHeight + 10;
      console.log('PDF addImage: Image added successfully');
    } catch (error) {
      console.error('Failed to add image to PDF:', error);
      this.doc.setFontSize(12);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text('Image could not be loaded', this.pageWidth / 2, this.yPos + 20, { align: 'center' });
      this.yPos += 50;
    }
  }

  private addScoresSection(scores: CapturedAnalysisData['scores']): void {
    this.checkPageBreak(60);
    
    // Section title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Composite Scores', this.margin, this.yPos);
    this.yPos += 8;

    const scoreItems = [
      { name: 'Energy', value: scores.energy, desc: 'Overall vitality and field intensity' },
      { name: 'Symmetry', value: scores.symmetry, desc: 'Bilateral balance and alignment' },
      { name: 'Coherence', value: scores.coherence, desc: 'Pattern organization and stability' },
      { name: 'Complexity', value: scores.complexity, desc: 'Richness of energy patterns' },
      { name: 'Regulation', value: scores.regulation, desc: 'Self-regulation capacity' },
      { name: 'Color Balance', value: scores.colorBalance, desc: 'Spectral distribution harmony' },
    ];

    // Draw score grid (2 columns)
    const colWidth = (this.pageWidth - this.margin * 2) / 2;
    scoreItems.forEach((item, index) => {
      const col = index % 2;
      const x = this.margin + (col * colWidth);
      
      if (col === 0 && index > 0) this.yPos += 16;

      this.drawScoreBox(x, this.yPos, colWidth - 5, item.name, item.value, item.desc);
    });
    
    this.yPos += 20;
  }

  private drawScoreBox(x: number, y: number, width: number, name: string, value: number, desc: string): void {
    // Score name
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(name, x, y);

    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(80, 80, 80);
    this.doc.text(desc, x, y + 5, { maxWidth: width - 20 });

    // Score value with color coding
    const color = this.getScoreColor(value);
    this.doc.setTextColor(color.r, color.g, color.b);
    this.doc.setFontSize(18);
    this.doc.text(Math.round(value).toString(), x + width - 15, y, { align: 'right' });
  }

  private addMetricsSection(metrics: CapturedAnalysisData['metrics']): void {
    this.checkPageBreak(50);

    // Section title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Raw Metrics', this.margin, this.yPos);
    this.yPos += 8;

    const metricItems = [
      { name: 'Light Quanta Density (LQD)', value: metrics.lqd.toFixed(2) },
      { name: 'Average Intensity', value: Math.round(metrics.avgIntensity).toString() },
      { name: 'Inner Noise', value: `${metrics.innerNoise.toFixed(1)}%` },
      { name: 'Fractal Dimension', value: metrics.fractalDim.toFixed(2) },
      { name: 'Hurst Exponent', value: metrics.hurstExp.toFixed(2) },
      { name: 'Horizontal Symmetry', value: `${(metrics.horizontalSymmetry * 100).toFixed(0)}%` },
      { name: 'Vertical Symmetry', value: `${(metrics.verticalSymmetry * 100).toFixed(0)}%` },
    ];

    // Draw metrics table
    this.doc.setFontSize(10);
    metricItems.forEach((item) => {
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(80, 80, 80);
      this.doc.text(item.name, this.margin, this.yPos);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);
      this.doc.text(item.value, this.pageWidth - this.margin, this.yPos, { align: 'right' });

      this.yPos += 6;
    });

    this.yPos += 5;
  }

  private addInsightsSection(insights: InsightItem[]): void {
    if (insights.length === 0) return;

    this.checkPageBreak(40);

    // Section title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Analysis Insights', this.margin, this.yPos);
    this.yPos += 8;

    this.doc.setFontSize(10);
    insights.forEach((insight) => {
      this.checkPageBreak(10);

      // Icon/indicator based on type
      const icon = insight.type === 'positive' ? '✓' : insight.type === 'warning' ? '!' : 'i';
      const color = this.getInsightColor(insight.type);

      this.doc.setTextColor(color.r, color.g, color.b);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`[${icon}]`, this.margin, this.yPos);

      this.doc.setTextColor(60, 60, 60);
      this.doc.setFont('helvetica', 'normal');

      // Wrap text if too long
      const textWidth = this.pageWidth - this.margin * 2 - 10;
      const lines = this.doc.splitTextToSize(insight.text, textWidth);
      this.doc.text(lines, this.margin + 10, this.yPos);
      this.yPos += lines.length * 5 + 3;
    });

    this.yPos += 5;
  }

  private addNotesSection(notes: string): void {
    if (!notes.trim()) return;

    this.checkPageBreak(30);

    // Section title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Session Notes', this.margin, this.yPos);
    this.yPos += 8;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(60, 60, 60);

    const textWidth = this.pageWidth - this.margin * 2;
    const lines = this.doc.splitTextToSize(notes, textWidth);
    this.doc.text(lines, this.margin, this.yPos);
    this.yPos += lines.length * 5 + 5;
  }

  private addFooter(): void {
    const footerY = this.pageHeight - 15;

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(150, 150, 150);

    this.doc.text(
      'Generated by PIP Analysis System',
      this.margin,
      footerY
    );

    this.doc.text(
      `Report generated: ${new Date().toLocaleString()}`,
      this.pageWidth - this.margin,
      footerY,
      { align: 'right' }
    );
  }

  private checkPageBreak(requiredSpace: number): void {
    if (this.yPos + requiredSpace > this.pageHeight - 25) {
      this.doc.addPage();
      this.yPos = 20;
    }
  }

  private getScoreColor(value: number): { r: number; g: number; b: number } {
    if (value >= 80) return { r: 34, g: 197, b: 94 };  // Green
    if (value >= 50) return { r: 234, g: 179, b: 8 };  // Yellow/Amber
    return { r: 239, g: 68, b: 68 };  // Red
  }

  private getInsightColor(type: string): { r: number; g: number; b: number } {
    switch (type) {
      case 'positive': return { r: 34, g: 197, b: 94 };
      case 'warning': return { r: 234, g: 179, b: 8 };
      default: return { r: 59, g: 130, b: 246 };
    }
  }

  private formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} seconds`;
    return `${mins} min ${secs} sec`;
  }

  private formatDateForFilename(date: Date): string {
    return date.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService();
