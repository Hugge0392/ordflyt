import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { Chart } from 'chart.js';
import type { 
  StudentProgressReport, 
  ClassDataBackup, 
  ExportJob,
  StudentAnalytics,
  ClassAnalytics 
} from '@shared/schema';

export interface PDFExportOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  includeCharts?: boolean;
  colorScheme?: 'default' | 'professional' | 'colorful' | 'monochrome';
  language?: 'sv' | 'en';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any;
  options?: any;
}

export class PDFExportService {
  private chartRenderer: ChartJSNodeCanvas;
  private tempDir: string;

  constructor() {
    this.chartRenderer = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 400,
      backgroundColour: 'white',
      plugins: {
        modern: ['chartjs-adapter-date-fns'],
        requireLegacy: ['chartjs-plugin-datalabels']
      }
    });
    this.tempDir = path.join(process.cwd(), 'temp', 'pdf-exports');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Generate professional student progress report for parent meetings
   */
  async generateStudentProgressReport(
    report: StudentProgressReport,
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    const defaults: PDFExportOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      includeCharts: true,
      colorScheme: 'professional',
      language: 'sv'
    };

    const config = { ...defaults, ...options };
    
    // Generate charts if requested
    const charts: { [key: string]: string } = {};
    if (config.includeCharts && report.visualizations) {
      charts.progressChart = await this.generateChart(report.visualizations.progressChart);
      charts.comparisonChart = await this.generateChart(report.visualizations.comparisonChart);
      charts.trendsChart = await this.generateChart(report.visualizations.trendsChart);
    }

    // Generate HTML content
    const htmlContent = this.generateStudentReportHTML(report, charts, config);
    
    // Convert to PDF
    return await this.htmlToPDF(htmlContent, config);
  }

  /**
   * Generate class data backup report
   */
  async generateClassDataBackup(
    backup: ClassDataBackup,
    options: PDFExportOptions = {}
  ): Promise<Buffer> {
    const defaults: PDFExportOptions = {
      format: 'A4',
      orientation: 'landscape',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      includeCharts: true,
      colorScheme: 'default',
      language: 'sv'
    };

    const config = { ...defaults, ...options };
    
    // Generate charts for class overview
    const charts: { [key: string]: string } = {};
    if (config.includeCharts && backup.analytics) {
      charts.classOverview = await this.generateClassOverviewChart(backup.analytics);
      charts.studentProgress = await this.generateStudentProgressChart(backup.analytics);
    }

    const htmlContent = this.generateClassBackupHTML(backup, charts, config);
    return await this.htmlToPDF(htmlContent, config);
  }

  /**
   * Generate chart as base64 image
   */
  private async generateChart(chartConfig: ChartConfig): Promise<string> {
    try {
      const configuration = {
        type: chartConfig.type,
        data: chartConfig.data,
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: chartConfig.title,
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'bottom'
            }
          },
          scales: chartConfig.type !== 'pie' && chartConfig.type !== 'scatter' ? {
            y: {
              beginAtZero: true,
              grid: {
                color: '#e0e0e0'
              }
            },
            x: {
              grid: {
                color: '#e0e0e0'
              }
            }
          } : undefined,
          ...chartConfig.options
        }
      };

      const imageBuffer = await this.chartRenderer.renderToBuffer(configuration);
      return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.error('Error generating chart:', error);
      return '';
    }
  }

  /**
   * Generate class overview chart
   */
  private async generateClassOverviewChart(analytics: ClassAnalytics): Promise<string> {
    const chartConfig: ChartConfig = {
      type: 'bar',
      title: 'Klassöversikt - Genomsnittliga Resultat',
      data: {
        labels: analytics.assignmentBreakdown.map(a => a.title),
        datasets: [{
          label: 'Genomsnittlig Poäng',
          data: analytics.assignmentBreakdown.map(a => a.averageScore),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }, {
          label: 'Slutförandegrad (%)',
          data: analytics.assignmentBreakdown.map(a => a.completionRate),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      }
    };

    return await this.generateChart(chartConfig);
  }

  /**
   * Generate student progress chart for class backup
   */
  private async generateStudentProgressChart(analytics: ClassAnalytics): Promise<string> {
    const chartConfig: ChartConfig = {
      type: 'line',
      title: 'Klassens Framsteg Över Tid',
      data: {
        labels: analytics.progressTrends.map(t => t.date),
        datasets: [{
          label: 'Genomsnittlig Poäng',
          data: analytics.progressTrends.map(t => t.averageScore),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
          tension: 0.4
        }, {
          label: 'Antal Slutförda Uppgifter',
          data: analytics.progressTrends.map(t => t.completions),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: false,
          tension: 0.4
        }]
      }
    };

    return await this.generateChart(chartConfig);
  }

  /**
   * Generate HTML content for student progress report
   */
  private generateStudentReportHTML(
    report: StudentProgressReport, 
    charts: { [key: string]: string },
    options: PDFExportOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'professional');
    const isSwedish = options.language === 'sv';

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isSwedish ? 'Elevrapport' : 'Student Report'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        .student-header {
            background: ${colorScheme.primary};
            color: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        .performance-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: ${colorScheme.background};
            padding: 15px;
            border-radius: 8px;
            border: 1px solid ${colorScheme.border};
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: ${colorScheme.accent};
            margin-bottom: 5px;
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
        }
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .progress-section {
            margin: 20px 0;
            padding: 15px;
            background: ${colorScheme.light};
            border-radius: 8px;
        }
        .teacher-comments {
            background: #f8f9fa;
            padding: 15px;
            border-left: 4px solid ${colorScheme.primary};
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .recommendations {
            background: ${colorScheme.success}20;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid ${colorScheme.success};
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${isSwedish ? 'Elevrapport för Föräldramöte' : 'Student Progress Report for Parent Meeting'}</h1>
        <div class="report-meta">
            <p><strong>${isSwedish ? 'Genererad' : 'Generated'}:</strong> ${report.exportMetadata.generatedAt}</p>
            <p><strong>${isSwedish ? 'Rapportperiod' : 'Report Period'}:</strong> 
               ${report.exportMetadata.reportPeriod.start || isSwedish ? 'Hela terminen' : 'Full term'} - 
               ${report.exportMetadata.reportPeriod.end || ''}</p>
        </div>
    </div>

    <div class="student-header">
        <h2>${report.studentInfo.name}</h2>
        <p>${isSwedish ? 'Klass' : 'Class'}: ${report.studentInfo.className || 'N/A'}</p>
        <p>${isSwedish ? 'Senaste aktivitet' : 'Last Activity'}: ${report.studentInfo.lastActivity || (isSwedish ? 'Ingen data' : 'No data')}</p>
    </div>

    <div class="performance-grid">
        <div class="metric-card">
            <div class="metric-value">${report.studentInfo.overallScore}%</div>
            <div class="metric-label">${isSwedish ? 'Genomsnittlig Poäng' : 'Average Score'}</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.studentInfo.completionRate}%</div>
            <div class="metric-label">${isSwedish ? 'Slutförandegrad' : 'Completion Rate'}</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${Math.round(report.studentInfo.totalTimeSpent / 60)}</div>
            <div class="metric-label">${isSwedish ? 'Timmar Studerat' : 'Hours Studied'}</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${report.studentInfo.assignmentsCompleted}</div>
            <div class="metric-label">${isSwedish ? 'Uppgifter Klara' : 'Assignments Completed'}</div>
        </div>
    </div>

    ${charts.progressChart ? `
    <div class="chart-container">
        <h3>${isSwedish ? 'Framsteg Över Tid' : 'Progress Over Time'}</h3>
        <img src="${charts.progressChart}" alt="Progress Chart">
    </div>
    ` : ''}

    <div class="progress-section">
        <h3>${isSwedish ? 'Styrkor och Utvecklingsområden' : 'Strengths and Areas for Development'}</h3>
        
        <h4 style="color: ${colorScheme.success}">${isSwedish ? 'Styrkor' : 'Strengths'}:</h4>
        <ul>
            ${report.strengthsAndChallenges.strengths.length > 0 
              ? report.strengthsAndChallenges.strengths.map(h => `<li>${h}</li>`).join('')
              : `<li>${isSwedish ? 'Eleven visar god framsteg i sina studier' : 'Student shows good progress in studies'}</li>`
            }
        </ul>

        <h4 style="color: ${colorScheme.warning}">${isSwedish ? 'Utvecklingsområden' : 'Areas for Development'}:</h4>
        <ul>
            ${report.strengthsAndChallenges.challenges.length > 0
              ? report.strengthsAndChallenges.challenges.map(c => `<li>${c}</li>`).join('')
              : `<li>${isSwedish ? 'Fortsätt arbeta med regelbundna studier' : 'Continue working on regular study habits'}</li>`
            }
        </ul>
    </div>

    ${charts.comparisonChart ? `
    <div class="chart-container">
        <h3>${isSwedish ? 'Jämförelse med Klassgenomsnitt' : 'Comparison with Class Average'}</h3>
        <img src="${charts.comparisonChart}" alt="Comparison Chart">
    </div>
    ` : ''}

    <div class="teacher-comments">
        <h3>${isSwedish ? 'Lärarkommentarer' : 'Teacher Comments'}</h3>
        <p>${(report.exportMetadata && report.exportMetadata.teacherComments) || (isSwedish 
          ? 'Eleven visar god progression och är engagerad i sitt lärande.' 
          : 'Student shows good progression and is engaged in learning.')}</p>
    </div>

    <div class="recommendations">
        <h3>${isSwedish ? 'Rekommendationer för Hemstöd' : 'Recommendations for Home Support'}</h3>
        <ul>
            ${report.parentMeetingData && report.parentMeetingData.homeRecommendations.length > 0
              ? report.parentMeetingData.homeRecommendations.map(r => `<li>${r}</li>`).join('')
              : `
                <li>${isSwedish ? 'Uppmuntra regelbundna studievanor' : 'Encourage regular study habits'}</li>
                <li>${isSwedish ? 'Läs tillsammans med barnet' : 'Read together with your child'}</li>
                <li>${isSwedish ? 'Diskutera vad som lärs i skolan' : 'Discuss what is learned at school'}</li>
              `
            }
        </ul>
    </div>

    <div class="footer">
        <p>${isSwedish ? 'Denna rapport genererades automatiskt från elevens lärandedata.' : 'This report was automatically generated from student learning data.'}</p>
        <p>${isSwedish ? 'För frågor, kontakta läraren.' : 'For questions, please contact the teacher.'}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate HTML content for class data backup
   */
  private generateClassBackupHTML(
    backup: ClassDataBackup,
    charts: { [key: string]: string },
    options: PDFExportOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'default');
    const isSwedish = options.language === 'sv';

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isSwedish ? 'Klassdata Backup' : 'Class Data Backup'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        .class-header {
            background: ${colorScheme.primary};
            color: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 0.9em;
        }
        .data-table th,
        .data-table td {
            border: 1px solid ${colorScheme.border};
            padding: 8px;
            text-align: left;
        }
        .data-table th {
            background: ${colorScheme.light};
            font-weight: bold;
        }
        .data-table tr:nth-child(even) {
            background: ${colorScheme.background};
        }
        .section {
            margin: 30px 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .summary-card {
            background: ${colorScheme.background};
            padding: 15px;
            border-radius: 8px;
            border: 1px solid ${colorScheme.border};
            text-align: center;
        }
        .chart-container {
            margin: 20px 0;
            text-align: center;
        }
        .chart-container img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${isSwedish ? 'Klassdata Backup' : 'Class Data Backup'}</h1>
        <div class="report-meta">
            <p><strong>${isSwedish ? 'Exporterad' : 'Exported'}:</strong> ${backup.exportMetadata.exportedAt}</p>
            <p><strong>${isSwedish ? 'Skola' : 'School'}:</strong> ${backup.classInfo.schoolName}</p>
        </div>
    </div>

    <div class="class-header">
        <h2>${backup.classInfo.name}</h2>
        <p>${isSwedish ? 'Lärare' : 'Teacher'}: ${backup.classInfo.teacherName}</p>
        <p>${isSwedish ? 'Termin' : 'Term'}: ${backup.classInfo.term}</p>
        <p>${isSwedish ? 'Antal elever' : 'Number of students'}: ${backup.classInfo.studentCount}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="metric-value">${backup.analytics.classInfo.averageScore}%</div>
            <div class="metric-label">${isSwedish ? 'Genomsnittlig Poäng' : 'Average Score'}</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${backup.analytics.classInfo.averageCompletionRate}%</div>
            <div class="metric-label">${isSwedish ? 'Slutförandegrad' : 'Completion Rate'}</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${Math.round(backup.analytics.classInfo.totalTimeSpent / 60)}</div>
            <div class="metric-label">${isSwedish ? 'Totala Timmar' : 'Total Hours'}</div>
        </div>
        <div class="summary-card">
            <div class="metric-value">${backup.analytics.classInfo.studentCount}</div>
            <div class="metric-label">${isSwedish ? 'Aktiva Elever' : 'Active Students'}</div>
        </div>
    </div>

    ${charts.classOverview ? `
    <div class="chart-container">
        <h3>${isSwedish ? 'Klassöversikt' : 'Class Overview'}</h3>
        <img src="${charts.classOverview}" alt="Class Overview Chart">
    </div>
    ` : ''}

    <div class="section">
        <h3>${isSwedish ? 'Elevprestationer' : 'Student Performance'}</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>${isSwedish ? 'Elevnamn' : 'Student Name'}</th>
                    <th>${isSwedish ? 'Genomsnittlig Poäng' : 'Average Score'}</th>
                    <th>${isSwedish ? 'Slutförandegrad' : 'Completion Rate'}</th>
                    <th>${isSwedish ? 'Tid Spenderad' : 'Time Spent'}</th>
                    <th>${isSwedish ? 'Senaste Aktivitet' : 'Last Activity'}</th>
                    <th>${isSwedish ? 'Behöver Hjälp' : 'Needs Help'}</th>
                </tr>
            </thead>
            <tbody>
                ${backup.analytics.studentPerformance.map(student => `
                <tr>
                    <td>${student.studentName}</td>
                    <td>${student.averageScore}%</td>
                    <td>${student.completionRate}%</td>
                    <td>${Math.round(student.timeSpent / 60)}h</td>
                    <td>${student.lastActivity || 'N/A'}</td>
                    <td>${student.needsHelp ? (isSwedish ? 'Ja' : 'Yes') : (isSwedish ? 'Nej' : 'No')}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${charts.studentProgress ? `
    <div class="chart-container page-break">
        <h3>${isSwedish ? 'Klassens Framsteg Över Tid' : 'Class Progress Over Time'}</h3>
        <img src="${charts.studentProgress}" alt="Student Progress Chart">
    </div>
    ` : ''}

    <div class="section">
        <h3>${isSwedish ? 'Uppgiftsöversikt' : 'Assignment Overview'}</h3>
        <table class="data-table">
            <thead>
                <tr>
                    <th>${isSwedish ? 'Uppgift' : 'Assignment'}</th>
                    <th>${isSwedish ? 'Typ' : 'Type'}</th>
                    <th>${isSwedish ? 'Slutförandegrad' : 'Completion Rate'}</th>
                    <th>${isSwedish ? 'Genomsnittlig Poäng' : 'Average Score'}</th>
                    <th>${isSwedish ? 'Elever som Behöver Hjälp' : 'Students Needing Help'}</th>
                </tr>
            </thead>
            <tbody>
                ${backup.analytics.assignmentBreakdown.map(assignment => `
                <tr>
                    <td>${assignment.title}</td>
                    <td>${assignment.assignmentType}</td>
                    <td>${assignment.completionRate}%</td>
                    <td>${assignment.averageScore}%</td>
                    <td>${assignment.strugglingStudentCount}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    ${backup.teacherNotes.classNotes ? `
    <div class="section">
        <h3>${isSwedish ? 'Läraranteckningar' : 'Teacher Notes'}</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid ${colorScheme.primary};">
            <p>${backup.teacherNotes.classNotes}</p>
        </div>
    </div>
    ` : ''}

    <div class="footer">
        <p>${isSwedish ? 'Denna rapport innehåller all klassdata för backup och administrativa ändamål.' : 'This report contains all class data for backup and administrative purposes.'}</p>
        <p>${isSwedish ? 'Behandla denna information konfidentiellt enligt GDPR.' : 'Handle this information confidentially according to GDPR.'}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPDF(html: string, options: PDFExportOptions): Promise<Buffer> {
    let browser: any = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        margin: options.margin || {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        },
        printBackground: true
      });

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get color scheme for reports
   */
  private getColorScheme(scheme: string) {
    const schemes = {
      default: {
        primary: '#3b82f6',
        secondary: '#6b7280',
        accent: '#10b981',
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626',
        background: '#f8fafc',
        light: '#f1f5f9',
        border: '#e2e8f0'
      },
      professional: {
        primary: '#1e40af',
        secondary: '#475569',
        accent: '#0f766e',
        success: '#166534',
        warning: '#ca8a04',
        error: '#b91c1c',
        background: '#f9fafb',
        light: '#f3f4f6',
        border: '#d1d5db'
      },
      colorful: {
        primary: '#7c3aed',
        secondary: '#64748b',
        accent: '#ea580c',
        success: '#16a34a',
        warning: '#eab308',
        error: '#e11d48',
        background: '#fef7ff',
        light: '#faf5ff',
        border: '#e9d5ff'
      },
      monochrome: {
        primary: '#374151',
        secondary: '#6b7280',
        accent: '#111827',
        success: '#4b5563',
        warning: '#6b7280',
        error: '#374151',
        background: '#f9fafb',
        light: '#f3f4f6',
        border: '#d1d5db'
      }
    };

    return schemes[scheme as keyof typeof schemes] || schemes.default;
  }

  /**
   * Get common CSS styles for reports
   */
  private getCommonStyles(colorScheme: any): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        line-height: 1.6;
        color: #333;
        background: white;
      }
      
      .header {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid ${colorScheme.primary};
      }
      
      .header h1 {
        color: ${colorScheme.primary};
        margin-bottom: 10px;
        font-size: 1.8em;
      }
      
      .report-meta {
        color: ${colorScheme.secondary};
        font-size: 0.9em;
      }
      
      .report-meta p {
        margin: 5px 0;
      }
      
      .metric-label {
        font-size: 0.9em;
        color: ${colorScheme.secondary};
        font-weight: 500;
      }
      
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid ${colorScheme.border};
        font-size: 0.8em;
        color: ${colorScheme.secondary};
        text-align: center;
      }
      
      h1, h2, h3, h4, h5, h6 {
        margin-bottom: 10px;
        color: ${colorScheme.primary};
      }
      
      p {
        margin-bottom: 10px;
      }
      
      ul, ol {
        margin: 10px 0;
        padding-left: 20px;
      }
      
      li {
        margin-bottom: 5px;
      }
      
      .page-break {
        page-break-before: always;
      }
      
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
      }
    `;
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService();