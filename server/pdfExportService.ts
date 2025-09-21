import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import {
  Chart,
  registerables,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ArcElement
} from 'chart.js';
// Import the date adapter at the top level to ensure proper initialization order
import 'chartjs-adapter-date-fns';
import type { 
  StudentProgressReport, 
  ClassDataBackup, 
  ExportJob,
  StudentAnalytics,
  ClassAnalytics,
  VocabularySet,
  VocabularyWord,
  VocabularyExercise 
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

export interface VocabularyPDFOptions extends PDFExportOptions {
  exportType: 'teacher' | 'student' | 'answer_key' | 'complete';
  includeExercises?: boolean;
  includeImages?: boolean;
  includePhonetics?: boolean;
  includeSynonymsAntonyms?: boolean;
  exerciseTypes?: string[]; // Filter specific exercise types
  customHeader?: {
    schoolName?: string;
    className?: string;
    teacherName?: string;
    date?: string;
  };
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any;
  options?: any;
}

export class PDFExportService {
  private chartRenderer!: ChartJSNodeCanvas;
  private tempDir: string;
  private initialized: boolean = false;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'pdf-exports');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Register Chart.js components before initializing the renderer
      Chart.register(...registerables);
      Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        Title,
        Tooltip,
        Legend,
        TimeScale,
        ArcElement
      );

      // Date adapter is already imported at the top level, so we can directly create the renderer
      this.chartRenderer = new ChartJSNodeCanvas({ 
        width: 800, 
        height: 400,
        backgroundColour: 'white',
        plugins: {
          modern: ['chartjs-adapter-date-fns'],
          requireLegacy: ['chartjs-plugin-datalabels']
        }
      });

      await fs.mkdir(this.tempDir, { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing PDF export service:', error);
      throw error;
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
    await this.initialize();
    
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
   * Generate vocabulary set PDF export
   */
  async generateVocabularySetPDF(
    vocabularySet: VocabularySet,
    words: VocabularyWord[],
    exercises: VocabularyExercise[] = [],
    options: VocabularyPDFOptions
  ): Promise<Buffer> {
    const defaults: VocabularyPDFOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      includeCharts: false,
      colorScheme: 'professional',
      language: 'sv',
      exportType: 'teacher',
      includeExercises: true,
      includeImages: true,
      includePhonetics: true,
      includeSynonymsAntonyms: true
    };

    const config = { ...defaults, ...options };
    
    // Sort words by order index
    const sortedWords = [...words].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    // Sort exercises by order index
    const sortedExercises = [...exercises].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    // Generate HTML content based on export type
    let htmlContent: string;
    
    switch (config.exportType) {
      case 'student':
        htmlContent = this.generateStudentVocabularyHTML(vocabularySet, sortedWords, sortedExercises, config);
        break;
      case 'teacher':
        htmlContent = this.generateTeacherVocabularyHTML(vocabularySet, sortedWords, sortedExercises, config);
        break;
      case 'answer_key':
        htmlContent = this.generateAnswerKeyHTML(vocabularySet, sortedWords, sortedExercises, config);
        break;
      case 'complete':
        htmlContent = this.generateCompleteVocabularyHTML(vocabularySet, sortedWords, sortedExercises, config);
        break;
      default:
        htmlContent = this.generateTeacherVocabularyHTML(vocabularySet, sortedWords, sortedExercises, config);
    }
    
    // Convert to PDF
    return await this.htmlToPDF(htmlContent, config);
  }

  /**
   * Generate exercise worksheet PDF
   */
  async generateExerciseWorksheetPDF(
    vocabularySet: VocabularySet,
    words: VocabularyWord[],
    exercise: VocabularyExercise,
    options: VocabularyPDFOptions
  ): Promise<Buffer> {
    const defaults: VocabularyPDFOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      includeCharts: false,
      colorScheme: 'professional',
      language: 'sv',
      exportType: 'student',
      includeImages: false,
      includePhonetics: false,
      includeSynonymsAntonyms: false
    };

    const config = { ...defaults, ...options };
    
    // Sort words by order index
    const sortedWords = [...words].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    // Generate worksheet HTML based on exercise type
    const htmlContent = this.generateExerciseWorksheetHTML(vocabularySet, sortedWords, exercise, config);
    
    return await this.htmlToPDF(htmlContent, config);
  }

  /**
   * Generate batch export for multiple vocabulary sets
   */
  async generateBatchVocabularyPDF(
    vocabularySets: Array<{
      set: VocabularySet;
      words: VocabularyWord[];
      exercises: VocabularyExercise[];
    }>,
    options: VocabularyPDFOptions
  ): Promise<Buffer> {
    const defaults: VocabularyPDFOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      includeCharts: false,
      colorScheme: 'professional',
      language: 'sv',
      exportType: 'teacher',
      includeExercises: true,
      includeImages: true,
      includePhonetics: true,
      includeSynonymsAntonyms: true
    };

    const config = { ...defaults, ...options };
    
    // Generate combined HTML for all sets
    const htmlContent = this.generateBatchVocabularyHTML(vocabularySets, config);
    
    return await this.htmlToPDF(htmlContent, config);
  }

  /**
   * Generate student-friendly vocabulary HTML
   */
  private generateStudentVocabularyHTML(
    vocabularySet: VocabularySet,
    words: VocabularyWord[],
    exercises: VocabularyExercise[],
    options: VocabularyPDFOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'professional');
    const isSwedish = options.language === 'sv';
    const setThemeColor = vocabularySet.themeColor || colorScheme.primary;

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vocabularySet.title} - ${isSwedish ? 'Elevmaterial' : 'Student Material'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        ${this.getVocabularyStyles(setThemeColor, colorScheme)}
    </style>
</head>
<body>
    ${this.generateCustomHeader(options.customHeader, isSwedish)}
    
    <div class="header">
        <h1>${vocabularySet.title}</h1>
        <p class="subtitle">${isSwedish ? 'Ordförråd för Elever' : 'Student Vocabulary'}</p>
        ${vocabularySet.description ? `<p class="description">${vocabularySet.description}</p>` : ''}
        ${options.customHeader?.date ? `<p class="date">${isSwedish ? 'Datum' : 'Date'}: ${options.customHeader.date}</p>` : ''}
    </div>

    <div class="vocabulary-section">
        <h2>${isSwedish ? 'Ordlista' : 'Word List'}</h2>
        <div class="word-grid">
            ${words.map((word, index) => `
                <div class="word-card student-card">
                    <div class="word-number">${index + 1}</div>
                    <div class="word-content">
                        <div class="word-term">${word.term}</div>
                        ${options.includePhonetics && word.phonetic ? `<div class="word-phonetic">[${word.phonetic}]</div>` : ''}
                        <div class="word-definition">${word.definition}</div>
                        ${word.example ? `<div class="word-example"><em>${word.example}</em></div>` : ''}
                        ${options.includeSynonymsAntonyms && (word.synonym || word.antonym) ? `
                            <div class="word-relations">
                                ${word.synonym ? `<span class="synonym">${isSwedish ? 'Synonym' : 'Synonym'}: ${word.synonym}</span>` : ''}
                                ${word.antonym ? `<span class="antonym">${isSwedish ? 'Antonym' : 'Antonym'}: ${word.antonym}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    ${options.includeExercises && exercises.length > 0 ? `
    <div class="page-break"></div>
    <div class="exercises-section">
        <h2>${isSwedish ? 'Övningar' : 'Exercises'}</h2>
        ${exercises.map((exercise, index) => this.generateStudentExerciseHTML(exercise, words, index + 1, isSwedish)).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>${isSwedish ? 'Använd detta material för att öva på ditt ordförråd.' : 'Use this material to practice your vocabulary.'}</p>
        <p>${isSwedish ? 'Fråga din lärare om hjälp när det behövs.' : 'Ask your teacher for help when needed.'}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate teacher vocabulary HTML with full details
   */
  private generateTeacherVocabularyHTML(
    vocabularySet: VocabularySet,
    words: VocabularyWord[],
    exercises: VocabularyExercise[],
    options: VocabularyPDFOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'professional');
    const isSwedish = options.language === 'sv';
    const setThemeColor = vocabularySet.themeColor || colorScheme.primary;

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vocabularySet.title} - ${isSwedish ? 'Lärarmaterial' : 'Teacher Material'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        ${this.getVocabularyStyles(setThemeColor, colorScheme)}
    </style>
</head>
<body>
    ${this.generateCustomHeader(options.customHeader, isSwedish)}
    
    <div class="header">
        <h1>${vocabularySet.title}</h1>
        <p class="subtitle">${isSwedish ? 'Lärarmaterial och Handleding' : 'Teacher Material and Guide'}</p>
        ${vocabularySet.description ? `<p class="description">${vocabularySet.description}</p>` : ''}
    </div>

    <div class="overview-section">
        <h2>${isSwedish ? 'Översikt' : 'Overview'}</h2>
        <div class="overview-grid">
            <div class="overview-card">
                <div class="overview-number">${words.length}</div>
                <div class="overview-label">${isSwedish ? 'Ord Totalt' : 'Total Words'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-number">${exercises.length}</div>
                <div class="overview-label">${isSwedish ? 'Övningar' : 'Exercises'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-number">${words.filter(w => w.imageUrl).length}</div>
                <div class="overview-label">${isSwedish ? 'Med Bilder' : 'With Images'}</div>
            </div>
            <div class="overview-card">
                <div class="overview-number">${words.filter(w => w.pronunciationUrl || w.phonetic).length}</div>
                <div class="overview-label">${isSwedish ? 'Med Uttal' : 'With Pronunciation'}</div>
            </div>
        </div>
    </div>

    <div class="vocabulary-section">
        <h2>${isSwedish ? 'Komplett Ordlista' : 'Complete Word List'}</h2>
        <div class="word-list-table">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>${isSwedish ? 'Ord' : 'Word'}</th>
                        <th>${isSwedish ? 'Definition' : 'Definition'}</th>
                        ${options.includePhonetics ? `<th>${isSwedish ? 'Uttal' : 'Pronunciation'}</th>` : ''}
                        ${options.includeSynonymsAntonyms ? `<th>${isSwedish ? 'Synonym' : 'Synonym'}</th>` : ''}
                        ${options.includeSynonymsAntonyms ? `<th>${isSwedish ? 'Antonym' : 'Antonym'}</th>` : ''}
                        <th>${isSwedish ? 'Exempel' : 'Example'}</th>
                        ${options.includeImages ? `<th>${isSwedish ? 'Bild' : 'Image'}</th>` : ''}
                    </tr>
                </thead>
                <tbody>
                    ${words.map((word, index) => `
                        <tr>
                            <td class="number-cell">${index + 1}</td>
                            <td class="word-cell"><strong>${word.term}</strong></td>
                            <td class="definition-cell">${word.definition}</td>
                            ${options.includePhonetics ? `<td class="phonetic-cell">${word.phonetic || '-'}</td>` : ''}
                            ${options.includeSynonymsAntonyms ? `<td class="relation-cell">${word.synonym || '-'}</td>` : ''}
                            ${options.includeSynonymsAntonyms ? `<td class="relation-cell">${word.antonym || '-'}</td>` : ''}
                            <td class="example-cell">${word.example || '-'}</td>
                            ${options.includeImages ? `<td class="image-cell">${word.imageUrl ? '✓' : '-'}</td>` : ''}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    ${options.includeExercises && exercises.length > 0 ? `
    <div class="page-break"></div>
    <div class="exercises-section">
        <h2>${isSwedish ? 'Övningar med Facit' : 'Exercises with Answer Keys'}</h2>
        ${exercises.map((exercise, index) => this.generateTeacherExerciseHTML(exercise, words, index + 1, isSwedish)).join('')}
    </div>
    ` : ''}

    <div class="teaching-notes">
        <h2>${isSwedish ? 'Undervisningsförslag' : 'Teaching Suggestions'}</h2>
        <div class="suggestions-grid">
            <div class="suggestion-card">
                <h4>${isSwedish ? 'Introduktion' : 'Introduction'}</h4>
                <ul>
                    <li>${isSwedish ? 'Gå igenom orden tillsammans med klassen' : 'Review words together with the class'}</li>
                    <li>${isSwedish ? 'Låt eleverna uttala orden högt' : 'Have students pronounce words aloud'}</li>
                    <li>${isSwedish ? 'Diskutera betydelser och användning' : 'Discuss meanings and usage'}</li>
                </ul>
            </div>
            <div class="suggestion-card">
                <h4>${isSwedish ? 'Aktiviteter' : 'Activities'}</h4>
                <ul>
                    <li>${isSwedish ? 'Använd orden i egna meningar' : 'Use words in own sentences'}</li>
                    <li>${isSwedish ? 'Skapa ordassociationer' : 'Create word associations'}</li>
                    <li>${isSwedish ? 'Grupparbete med synonymer och antonymer' : 'Group work with synonyms and antonyms'}</li>
                </ul>
            </div>
            <div class="suggestion-card">
                <h4>${isSwedish ? 'Bedömning' : 'Assessment'}</h4>
                <ul>
                    <li>${isSwedish ? 'Muntliga prov av uttal' : 'Oral pronunciation tests'}</li>
                    <li>${isSwedish ? 'Skriftliga övningar' : 'Written exercises'}</li>
                    <li>${isSwedish ? 'Användning i sammanhang' : 'Usage in context'}</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>${isSwedish ? 'Detta material är avsett för lärare att använda tillsammans med elevmaterialet.' : 'This material is intended for teachers to use alongside student materials.'}</p>
        <p>${isSwedish ? 'Anpassa övningarna efter elevernas nivå och behov.' : 'Adapt exercises according to students\' level and needs.'}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate answer key HTML
   */
  private generateAnswerKeyHTML(
    vocabularySet: VocabularySet,
    words: VocabularyWord[],
    exercises: VocabularyExercise[],
    options: VocabularyPDFOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'professional');
    const isSwedish = options.language === 'sv';
    const setThemeColor = vocabularySet.themeColor || colorScheme.primary;

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vocabularySet.title} - ${isSwedish ? 'Facit' : 'Answer Key'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        ${this.getVocabularyStyles(setThemeColor, colorScheme)}
        .answer-key-note {
            background: ${colorScheme.warning}20;
            border: 2px solid ${colorScheme.warning};
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
        }
    </style>
</head>
<body>
    ${this.generateCustomHeader(options.customHeader, isSwedish)}
    
    <div class="header">
        <h1>${vocabularySet.title}</h1>
        <p class="subtitle">${isSwedish ? 'Facit och Svar' : 'Answer Key'}</p>
        <div class="answer-key-note">
            ${isSwedish ? '⚠️ ENDAST FÖR LÄRARE - Innehåller alla svar' : '⚠️ TEACHER ONLY - Contains all answers'}
        </div>
    </div>

    <div class="vocabulary-section">
        <h2>${isSwedish ? 'Ordlista med Svar' : 'Word List with Answers'}</h2>
        <div class="answer-list">
            ${words.map((word, index) => `
                <div class="answer-item">
                    <div class="answer-number">${index + 1}.</div>
                    <div class="answer-content">
                        <strong>${word.term}</strong> - ${word.definition}
                        ${word.example ? `<br><em>${isSwedish ? 'Exempel' : 'Example'}: ${word.example}</em>` : ''}
                        ${word.synonym ? `<br><span class="synonym">${isSwedish ? 'Synonym' : 'Synonym'}: ${word.synonym}</span>` : ''}
                        ${word.antonym ? `<br><span class="antonym">${isSwedish ? 'Antonym' : 'Antonym'}: ${word.antonym}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    ${exercises.length > 0 ? `
    <div class="exercises-section">
        <h2>${isSwedish ? 'Övningar med Facit' : 'Exercise Answer Keys'}</h2>
        ${exercises.map((exercise, index) => this.generateExerciseAnswerKeyHTML(exercise, words, index + 1, isSwedish)).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>${isSwedish ? 'Detta facit är endast avsett för lärare.' : 'This answer key is intended for teachers only.'}</p>
        <p>${isSwedish ? 'Använd för att kontrollera elevernas svar och ge feedback.' : 'Use to check student answers and provide feedback.'}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate complete vocabulary HTML (all materials combined)
   */
  private generateCompleteVocabularyHTML(
    vocabularySet: VocabularySet,
    words: VocabularyWord[],
    exercises: VocabularyExercise[],
    options: VocabularyPDFOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'professional');
    const isSwedish = options.language === 'sv';
    const setThemeColor = vocabularySet.themeColor || colorScheme.primary;

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${vocabularySet.title} - ${isSwedish ? 'Komplett Paket' : 'Complete Package'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        ${this.getVocabularyStyles(setThemeColor, colorScheme)}
    </style>
</head>
<body>
    ${this.generateCustomHeader(options.customHeader, isSwedish)}
    
    <div class="header">
        <h1>${vocabularySet.title}</h1>
        <p class="subtitle">${isSwedish ? 'Komplett Undervisningsmaterial' : 'Complete Teaching Material'}</p>
        ${vocabularySet.description ? `<p class="description">${vocabularySet.description}</p>` : ''}
    </div>

    <!-- Table of Contents -->
    <div class="toc-section">
        <h2>${isSwedish ? 'Innehållsförteckning' : 'Table of Contents'}</h2>
        <ol class="toc-list">
            <li>${isSwedish ? 'Lärarguide och Översikt' : 'Teacher Guide and Overview'}</li>
            <li>${isSwedish ? 'Komplett Ordlista' : 'Complete Word List'}</li>
            <li>${isSwedish ? 'Elevmaterial' : 'Student Materials'}</li>
            ${exercises.length > 0 ? `<li>${isSwedish ? 'Övningar' : 'Exercises'}</li>` : ''}
            <li>${isSwedish ? 'Facit och Svar' : 'Answer Keys'}</li>
        </ol>
    </div>

    <!-- Teacher Guide Section -->
    <div class="page-break"></div>
    ${this.generateTeacherVocabularyHTML(vocabularySet, words, exercises, { ...options, includeExercises: false }).replace(/^.*<body[^>]*>|<\/body>.*$/gs, '').replace(/^.*<div class="header">.*?<\/div>/s, '')}

    <!-- Student Materials Section -->
    <div class="page-break"></div>
    <div class="section-header">
        <h1>${isSwedish ? 'Elevmaterial' : 'Student Materials'}</h1>
        <p>${isSwedish ? 'Material för utdelning till elever' : 'Materials for distribution to students'}</p>
    </div>
    ${this.generateStudentVocabularyHTML(vocabularySet, words, exercises, { ...options, includeExercises: false }).replace(/^.*<body[^>]*>|<\/body>.*$/gs, '').replace(/^.*<div class="header">.*?<\/div>/s, '')}

    <!-- Answer Keys Section -->
    ${exercises.length > 0 ? `
    <div class="page-break"></div>
    <div class="section-header">
        <h1>${isSwedish ? 'Facit och Svar' : 'Answer Keys'}</h1>
        <p>${isSwedish ? 'Endast för lärare' : 'Teacher only'}</p>
    </div>
    ${this.generateAnswerKeyHTML(vocabularySet, words, exercises, options).replace(/^.*<body[^>]*>|<\/body>.*$/gs, '').replace(/^.*<div class="header">.*?<\/div>/s, '')}
    ` : ''}

    <div class="footer">
        <p>${isSwedish ? 'Detta är ett komplett undervisningspaket för ordförrådsundervisning.' : 'This is a complete teaching package for vocabulary instruction.'}</p>
        <p>${isSwedish ? 'Anpassa materialet efter elevernas behov och nivå.' : 'Adapt materials according to students\' needs and level.'}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate exercise worksheet HTML
   */
  private generateExerciseWorksheetHTML(
    vocabularySet: VocabularySet,
    words: VocabularyWord[],
    exercise: VocabularyExercise,
    options: VocabularyPDFOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'professional');
    const isSwedish = options.language === 'sv';
    const setThemeColor = vocabularySet.themeColor || colorScheme.primary;

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exercise.title} - ${isSwedish ? 'Övningsblad' : 'Worksheet'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        ${this.getVocabularyStyles(setThemeColor, colorScheme)}
        ${this.getExerciseWorksheetStyles(colorScheme)}
    </style>
</head>
<body>
    ${this.generateCustomHeader(options.customHeader, isSwedish)}
    
    <div class="header">
        <h1>${exercise.title}</h1>
        <p class="subtitle">${vocabularySet.title}</p>
        ${exercise.description ? `<p class="description">${exercise.description}</p>` : ''}
        ${exercise.instructions ? `
        <div class="instructions">
            <strong>${isSwedish ? 'Instruktioner' : 'Instructions'}:</strong> ${exercise.instructions}
        </div>
        ` : ''}
    </div>

    <div class="worksheet-content">
        ${this.generateExerciseWorksheetContent(exercise, words, isSwedish)}
    </div>

    ${options.exportType === 'teacher' || options.exportType === 'answer_key' ? `
    <div class="page-break"></div>
    <div class="answer-section">
        <h2>${isSwedish ? 'Facit' : 'Answer Key'}</h2>
        ${this.generateExerciseAnswerKeyHTML(exercise, words, 1, isSwedish)}
    </div>
    ` : ''}

    <div class="footer">
        <p>${isSwedish ? 'Använd ordlistan ovan för att hjälpa dig.' : 'Use the word list above to help you.'}</p>
        ${exercise.timeLimit ? `<p>${isSwedish ? 'Tid' : 'Time'}: ${Math.floor(exercise.timeLimit / 60)} ${isSwedish ? 'minuter' : 'minutes'}</p>` : ''}
    </div>
</body>
</html>`;
  }

  /**
   * Generate batch vocabulary HTML
   */
  private generateBatchVocabularyHTML(
    vocabularySets: Array<{
      set: VocabularySet;
      words: VocabularyWord[];
      exercises: VocabularyExercise[];
    }>,
    options: VocabularyPDFOptions
  ): string {
    const colorScheme = this.getColorScheme(options.colorScheme || 'professional');
    const isSwedish = options.language === 'sv';

    return `
<!DOCTYPE html>
<html lang="${options.language || 'sv'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isSwedish ? 'Ordförrådssamling' : 'Vocabulary Collection'}</title>
    <style>
        ${this.getCommonStyles(colorScheme)}
        ${this.getVocabularyStyles(colorScheme.primary, colorScheme)}
    </style>
</head>
<body>
    ${this.generateCustomHeader(options.customHeader, isSwedish)}
    
    <div class="header">
        <h1>${isSwedish ? 'Ordförrådssamling' : 'Vocabulary Collection'}</h1>
        <p class="subtitle">${vocabularySets.length} ${isSwedish ? 'ordförrådsset' : 'vocabulary sets'}</p>
    </div>

    <!-- Table of Contents -->
    <div class="toc-section">
        <h2>${isSwedish ? 'Innehållsförteckning' : 'Table of Contents'}</h2>
        <ol class="toc-list">
            ${vocabularySets.map((item, index) => `
                <li>${item.set.title} (${item.words.length} ${isSwedish ? 'ord' : 'words'})</li>
            `).join('')}
        </ol>
    </div>

    ${vocabularySets.map((item, index) => `
        ${index > 0 ? '<div class="page-break"></div>' : ''}
        <div class="set-section">
            <div class="set-header">
                <h2>${item.set.title}</h2>
                ${item.set.description ? `<p class="set-description">${item.set.description}</p>` : ''}
                <div class="set-stats">
                    <span class="stat">${item.words.length} ${isSwedish ? 'ord' : 'words'}</span>
                    ${item.exercises.length > 0 ? `<span class="stat">${item.exercises.length} ${isSwedish ? 'övningar' : 'exercises'}</span>` : ''}
                </div>
            </div>
            
            <div class="word-grid">
                ${item.words.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((word, wordIndex) => `
                    <div class="word-card">
                        <div class="word-number">${wordIndex + 1}</div>
                        <div class="word-content">
                            <div class="word-term">${word.term}</div>
                            ${options.includePhonetics && word.phonetic ? `<div class="word-phonetic">[${word.phonetic}]</div>` : ''}
                            <div class="word-definition">${word.definition}</div>
                            ${word.example ? `<div class="word-example"><em>${word.example}</em></div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('')}

    <div class="footer">
        <p>${isSwedish ? 'Denna samling innehåller ' : 'This collection contains '} ${vocabularySets.reduce((total, item) => total + item.words.length, 0)} ${isSwedish ? 'ord totalt.' : 'words in total.'}</p>
        <p>${isSwedish ? 'Använd materialet för att bygga elevernas ordförråd systematiskt.' : 'Use the material to build students\' vocabulary systematically.'}</p>
    </div>
</body>
</html>`;
  }

  /**
   * Generate custom header HTML
   */
  private generateCustomHeader(customHeader: VocabularyPDFOptions['customHeader'], isSwedish: boolean): string {
    if (!customHeader) return '';

    return `
    <div class="custom-header">
        <div class="custom-header-content">
            ${customHeader.schoolName ? `<div class="school-name">${customHeader.schoolName}</div>` : ''}
            ${customHeader.className ? `<div class="class-name">${isSwedish ? 'Klass' : 'Class'}: ${customHeader.className}</div>` : ''}
            ${customHeader.teacherName ? `<div class="teacher-name">${isSwedish ? 'Lärare' : 'Teacher'}: ${customHeader.teacherName}</div>` : ''}
            ${customHeader.date ? `<div class="header-date">${isSwedish ? 'Datum' : 'Date'}: ${customHeader.date}</div>` : ''}
        </div>
    </div>`;
  }

  /**
   * Generate student exercise HTML
   */
  private generateStudentExerciseHTML(exercise: VocabularyExercise, words: VocabularyWord[], exerciseNumber: number, isSwedish: boolean): string {
    return `
    <div class="exercise-container">
        <div class="exercise-header">
            <h3>${isSwedish ? 'Övning' : 'Exercise'} ${exerciseNumber}: ${exercise.title}</h3>
            ${exercise.description ? `<p class="exercise-description">${exercise.description}</p>` : ''}
            ${exercise.instructions ? `<p class="exercise-instructions"><strong>${isSwedish ? 'Instruktioner' : 'Instructions'}:</strong> ${exercise.instructions}</p>` : ''}
        </div>
        <div class="exercise-content">
            ${this.generateExerciseWorksheetContent(exercise, words, isSwedish)}
        </div>
    </div>`;
  }

  /**
   * Generate teacher exercise HTML with answers
   */
  private generateTeacherExerciseHTML(exercise: VocabularyExercise, words: VocabularyWord[], exerciseNumber: number, isSwedish: boolean): string {
    return `
    <div class="exercise-container teacher-exercise">
        <div class="exercise-header">
            <h3>${isSwedish ? 'Övning' : 'Exercise'} ${exerciseNumber}: ${exercise.title}</h3>
            ${exercise.description ? `<p class="exercise-description">${exercise.description}</p>` : ''}
            ${exercise.instructions ? `<p class="exercise-instructions"><strong>${isSwedish ? 'Instruktioner' : 'Instructions'}:</strong> ${exercise.instructions}</p>` : ''}
            <div class="exercise-meta">
                <span class="exercise-type">${isSwedish ? 'Typ' : 'Type'}: ${this.getExerciseTypeLabel(exercise.type, isSwedish)}</span>
                ${exercise.timeLimit ? `<span class="exercise-time">${isSwedish ? 'Tid' : 'Time'}: ${Math.floor(exercise.timeLimit / 60)} min</span>` : ''}
                <span class="exercise-points">${exercise.pointsPerCorrect} ${isSwedish ? 'poäng/rätt' : 'points/correct'}</span>
            </div>
        </div>
        <div class="exercise-content">
            ${this.generateExerciseWorksheetContent(exercise, words, isSwedish)}
        </div>
        <div class="teacher-answer-key">
            <h4>${isSwedish ? 'Facit' : 'Answer Key'}:</h4>
            ${this.generateExerciseAnswerKeyHTML(exercise, words, exerciseNumber, isSwedish)}
        </div>
    </div>`;
  }

  /**
   * Generate exercise answer key HTML
   */
  private generateExerciseAnswerKeyHTML(exercise: VocabularyExercise, words: VocabularyWord[], exerciseNumber: number, isSwedish: boolean): string {
    switch (exercise.type) {
      case 'multiple_choice':
        return this.generateMultipleChoiceAnswerKey(exercise, words, isSwedish);
      case 'fill_in_blank':
        return this.generateFillInBlankAnswerKey(exercise, words, isSwedish);
      case 'matching':
        return this.generateMatchingAnswerKey(exercise, words, isSwedish);
      case 'flashcards':
        return this.generateFlashcardsAnswerKey(exercise, words, isSwedish);
      case 'word_association':
        return this.generateWordAssociationAnswerKey(exercise, words, isSwedish);
      case 'sentence_completion':
        return this.generateSentenceCompletionAnswerKey(exercise, words, isSwedish);
      case 'definition_matching':
        return this.generateDefinitionMatchingAnswerKey(exercise, words, isSwedish);
      case 'synonym_antonym':
        return this.generateSynonymAntonymAnswerKey(exercise, words, isSwedish);
      case 'image_matching':
        return this.generateImageMatchingAnswerKey(exercise, words, isSwedish);
      case 'spelling':
        return this.generateSpellingAnswerKey(exercise, words, isSwedish);
      default:
        return `<p>${isSwedish ? 'Svar: Se ordlistan ovan' : 'Answers: See word list above'}</p>`;
    }
  }

  /**
   * Generate exercise worksheet content based on type
   */
  private generateExerciseWorksheetContent(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    switch (exercise.type) {
      case 'multiple_choice':
        return this.generateMultipleChoiceWorksheet(exercise, words, isSwedish);
      case 'fill_in_blank':
        return this.generateFillInBlankWorksheet(exercise, words, isSwedish);
      case 'matching':
        return this.generateMatchingWorksheet(exercise, words, isSwedish);
      case 'flashcards':
        return this.generateFlashcardsWorksheet(exercise, words, isSwedish);
      case 'word_association':
        return this.generateWordAssociationWorksheet(exercise, words, isSwedish);
      case 'sentence_completion':
        return this.generateSentenceCompletionWorksheet(exercise, words, isSwedish);
      case 'definition_matching':
        return this.generateDefinitionMatchingWorksheet(exercise, words, isSwedish);
      case 'synonym_antonym':
        return this.generateSynonymAntonymWorksheet(exercise, words, isSwedish);
      case 'image_matching':
        return this.generateImageMatchingWorksheet(exercise, words, isSwedish);
      case 'spelling':
        return this.generateSpellingWorksheet(exercise, words, isSwedish);
      default:
        return this.generateGenericWorksheet(exercise, words, isSwedish);
    }
  }

  /**
   * Generate multiple choice worksheet
   */
  private generateMultipleChoiceWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    const selectedWords = words.slice(0, 10); // Limit to 10 questions for printability
    
    return `
    <div class="multiple-choice-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Välj rätt svar för varje fråga.' : 'Choose the correct answer for each question.'}</p>
        ${selectedWords.map((word, index) => {
          // Create wrong options by using other words' definitions
          const wrongOptions = words.filter(w => w.id !== word.id).slice(0, 3).map(w => w.definition);
          const allOptions = [word.definition, ...wrongOptions].sort(() => Math.random() - 0.5);
          
          return `
          <div class="mc-question">
              <div class="question-number">${index + 1}.</div>
              <div class="question-content">
                  <p class="question-text">${isSwedish ? 'Vad betyder' : 'What does'} "<strong>${word.term}</strong>" ${isSwedish ? 'betyder' : 'mean'}?</p>
                  <div class="mc-options">
                      ${allOptions.map((option, optIndex) => `
                          <div class="mc-option">
                              <span class="option-letter">${String.fromCharCode(65 + optIndex)})</span>
                              <span class="option-text">${option}</span>
                          </div>
                      `).join('')}
                  </div>
              </div>
          </div>`;
        }).join('')}
    </div>`;
  }

  /**
   * Generate fill in the blank worksheet
   */
  private generateFillInBlankWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    const selectedWords = words.filter(w => w.example).slice(0, 10);
    
    return `
    <div class="fill-blank-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Fyll i de tomma rutorna med rätt ord.' : 'Fill in the blanks with the correct words.'}</p>
        <div class="word-bank">
            <strong>${isSwedish ? 'Ordbank' : 'Word Bank'}:</strong>
            ${selectedWords.map(word => `<span class="bank-word">${word.term}</span>`).join(', ')}
        </div>
        ${selectedWords.map((word, index) => {
          const sentence = word.example?.replace(new RegExp(word.term, 'gi'), '_______') || `${isSwedish ? 'Skriv en mening med ordet' : 'Write a sentence with the word'} _______`;
          
          return `
          <div class="fill-blank-question">
              <div class="question-number">${index + 1}.</div>
              <div class="sentence-with-blank">${sentence}</div>
          </div>`;
        }).join('')}
    </div>`;
  }

  /**
   * Generate matching worksheet
   */
  private generateMatchingWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    const selectedWords = words.slice(0, 8);
    const shuffledDefinitions = [...selectedWords.map(w => w.definition)].sort(() => Math.random() - 0.5);
    
    return `
    <div class="matching-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Matcha varje ord med dess definition genom att dra linjer.' : 'Match each word with its definition by drawing lines.'}</p>
        <div class="matching-grid">
            <div class="words-column">
                <h4>${isSwedish ? 'Ord' : 'Words'}</h4>
                ${selectedWords.map((word, index) => `
                    <div class="match-item">
                        <span class="match-number">${index + 1}.</span>
                        <span class="match-word">${word.term}</span>
                    </div>
                `).join('')}
            </div>
            <div class="definitions-column">
                <h4>${isSwedish ? 'Definitioner' : 'Definitions'}</h4>
                ${shuffledDefinitions.map((definition, index) => `
                    <div class="match-item">
                        <span class="match-letter">${String.fromCharCode(65 + index)}.</span>
                        <span class="match-definition">${definition}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>`;
  }

  /**
   * Generate generic exercise answer keys
   */
  private generateMultipleChoiceAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${words.slice(0, 10).map((word, index) => `${index + 1}. ${word.term} - ${word.definition}`).join('<br>')}</div>`;
  }

  private generateFillInBlankAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${words.filter(w => w.example).slice(0, 10).map((word, index) => `${index + 1}. ${word.term}`).join('<br>')}</div>`;
  }

  private generateMatchingAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${words.slice(0, 8).map((word, index) => `${index + 1}. ${word.term} - ${word.definition}`).join('<br>')}</div>`;
  }

  private generateFlashcardsAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${isSwedish ? 'Se ordlistan för alla svar' : 'See word list for all answers'}</div>`;
  }

  private generateWordAssociationAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${words.map((word, index) => `${word.term}: ${[word.synonym, word.antonym].filter(Boolean).join(', ') || isSwedish ? 'Olika svar möjliga' : 'Various answers possible'}`).join('<br>')}</div>`;
  }

  private generateSentenceCompletionAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${isSwedish ? 'Acceptera meningar som använder orden korrekt i sammanhang' : 'Accept sentences that use words correctly in context'}</div>`;
  }

  private generateDefinitionMatchingAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return this.generateMatchingAnswerKey(exercise, words, isSwedish);
  }

  private generateSynonymAntonymAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${words.filter(w => w.synonym || w.antonym).map((word, index) => `${word.term}: ${isSwedish ? 'Synonym' : 'Synonym'}: ${word.synonym || '-'}, ${isSwedish ? 'Antonym' : 'Antonym'}: ${word.antonym || '-'}`).join('<br>')}</div>`;
  }

  private generateImageMatchingAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${words.filter(w => w.imageUrl).map((word, index) => `${word.term} - ${isSwedish ? 'Se bild' : 'See image'}`).join('<br>')}</div>`;
  }

  private generateSpellingAnswerKey(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="answer-key-simple">${words.map((word, index) => `${index + 1}. ${word.term}`).join('<br>')}</div>`;
  }

  /**
   * Generate generic worksheets for exercise types
   */
  private generateFlashcardsWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `<div class="flashcards-note"><p>${isSwedish ? 'Detta är en flashcard-övning som fungerar bäst digitalt. Se ordlistan för studier.' : 'This is a flashcard exercise that works best digitally. See word list for studying.'}</p></div>`;
  }

  private generateWordAssociationWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `
    <div class="word-association-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Skriv ord som du associerar med varje ord nedan.' : 'Write words you associate with each word below.'}</p>
        ${words.slice(0, 10).map((word, index) => `
            <div class="association-item">
                <div class="base-word">${index + 1}. <strong>${word.term}</strong></div>
                <div class="association-lines">
                    <div class="association-line">_________________________</div>
                    <div class="association-line">_________________________</div>
                    <div class="association-line">_________________________</div>
                </div>
            </div>
        `).join('')}
    </div>`;
  }

  private generateSentenceCompletionWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `
    <div class="sentence-completion-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Skriv en komplett mening med varje ord.' : 'Write a complete sentence using each word.'}</p>
        ${words.slice(0, 8).map((word, index) => `
            <div class="sentence-item">
                <div class="word-prompt">${index + 1}. <strong>${word.term}</strong></div>
                <div class="sentence-lines">
                    <div class="sentence-line">_________________________________________________</div>
                    <div class="sentence-line">_________________________________________________</div>
                </div>
            </div>
        `).join('')}
    </div>`;
  }

  private generateDefinitionMatchingWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return this.generateMatchingWorksheet(exercise, words, isSwedish);
  }

  private generateSynonymAntonymWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    const wordsWithSynAnt = words.filter(w => w.synonym || w.antonym).slice(0, 10);
    return `
    <div class="synonym-antonym-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Skriv synonymer och antonymer för varje ord.' : 'Write synonyms and antonyms for each word.'}</p>
        ${wordsWithSynAnt.map((word, index) => `
            <div class="syn-ant-item">
                <div class="word-center"><strong>${word.term}</strong></div>
                <div class="syn-ant-grid">
                    <div class="synonym-section">
                        <label>${isSwedish ? 'Synonym' : 'Synonym'}:</label>
                        <div class="answer-line">_________________________</div>
                    </div>
                    <div class="antonym-section">
                        <label>${isSwedish ? 'Antonym' : 'Antonym'}:</label>
                        <div class="answer-line">_________________________</div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>`;
  }

  private generateImageMatchingWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    const wordsWithImages = words.filter(w => w.imageUrl).slice(0, 8);
    return `
    <div class="image-matching-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Matcha varje ord med rätt bild (bilder visas inte i utskrift).' : 'Match each word with the correct image (images not shown in print).'}</p>
        <div class="image-word-list">
            ${wordsWithImages.map((word, index) => `
                <div class="image-word-item">
                    <span class="word-number">${index + 1}.</span>
                    <span class="word-text">${word.term}</span>
                    <span class="image-placeholder">[${isSwedish ? 'Bild' : 'Image'} ${String.fromCharCode(65 + index)}]</span>
                </div>
            `).join('')}
        </div>
    </div>`;
  }

  private generateSpellingWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `
    <div class="spelling-worksheet">
        <p class="worksheet-instructions">${isSwedish ? 'Stava orden korrekt. Din lärare kommer att läsa upp orden.' : 'Spell the words correctly. Your teacher will read the words aloud.'}</p>
        ${words.slice(0, 15).map((word, index) => `
            <div class="spelling-item">
                <span class="spelling-number">${index + 1}.</span>
                <div class="spelling-line">_________________________</div>
            </div>
        `).join('')}
    </div>`;
  }

  private generateGenericWorksheet(exercise: VocabularyExercise, words: VocabularyWord[], isSwedish: boolean): string {
    return `
    <div class="generic-worksheet">
        <p class="worksheet-instructions">${exercise.instructions || (isSwedish ? 'Följ instruktionerna från din lärare.' : 'Follow instructions from your teacher.')}</p>
        <div class="word-reference">
            <h4>${isSwedish ? 'Ordlista' : 'Word List'}:</h4>
            ${words.map((word, index) => `<div class="ref-word">${index + 1}. ${word.term} - ${word.definition}</div>`).join('')}
        </div>
    </div>`;
  }

  /**
   * Get exercise type label in appropriate language
   */
  private getExerciseTypeLabel(type: string, isSwedish: boolean): string {
    const labels = {
      flashcards: isSwedish ? 'Flashcards' : 'Flashcards',
      multiple_choice: isSwedish ? 'Flervalsuppgift' : 'Multiple Choice',
      fill_in_blank: isSwedish ? 'Fyll i luckorna' : 'Fill in the Blank',
      matching: isSwedish ? 'Matchning' : 'Matching',
      word_association: isSwedish ? 'Ordassociation' : 'Word Association',
      sentence_completion: isSwedish ? 'Meningskomplettering' : 'Sentence Completion',
      definition_matching: isSwedish ? 'Definitionsmatchning' : 'Definition Matching',
      synonym_antonym: isSwedish ? 'Synonymer/Antonymer' : 'Synonym/Antonym',
      image_matching: isSwedish ? 'Bildmatchning' : 'Image Matching',
      spelling: isSwedish ? 'Stavning' : 'Spelling'
    };
    return labels[type as keyof typeof labels] || type;
  }

  /**
   * Get vocabulary-specific CSS styles
   */
  private getVocabularyStyles(themeColor: string, colorScheme: any): string {
    return `
        .custom-header {
            background: ${colorScheme.light};
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 8px;
            border: 1px solid ${colorScheme.border};
        }
        
        .custom-header-content {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .school-name, .class-name, .teacher-name, .header-date {
            font-weight: 500;
            color: ${colorScheme.secondary};
        }
        
        .subtitle {
            color: ${colorScheme.secondary};
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        
        .description {
            font-style: italic;
            color: ${colorScheme.secondary};
            margin-bottom: 15px;
        }
        
        .word-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .word-card {
            background: white;
            border: 2px solid ${themeColor}30;
            border-radius: 8px;
            padding: 15px;
            position: relative;
        }
        
        .word-card.student-card {
            border-left: 4px solid ${themeColor};
        }
        
        .word-number {
            position: absolute;
            top: -10px;
            left: 10px;
            background: ${themeColor};
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .word-content {
            margin-top: 10px;
        }
        
        .word-term {
            font-size: 1.3em;
            font-weight: bold;
            color: ${themeColor};
            margin-bottom: 5px;
        }
        
        .word-phonetic {
            color: ${colorScheme.secondary};
            font-style: italic;
            margin-bottom: 8px;
        }
        
        .word-definition {
            line-height: 1.5;
            margin-bottom: 10px;
        }
        
        .word-example {
            background: ${colorScheme.light};
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 8px;
            border-left: 3px solid ${colorScheme.accent};
        }
        
        .word-relations {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
        }
        
        .synonym {
            color: ${colorScheme.success};
        }
        
        .antonym {
            color: ${colorScheme.warning};
        }
        
        .overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .overview-card {
            background: ${colorScheme.background};
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid ${colorScheme.border};
        }
        
        .overview-number {
            font-size: 2em;
            font-weight: bold;
            color: ${themeColor};
            margin-bottom: 5px;
        }
        
        .overview-label {
            font-size: 0.9em;
            color: ${colorScheme.secondary};
        }
        
        .word-list-table table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .word-list-table th,
        .word-list-table td {
            border: 1px solid ${colorScheme.border};
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }
        
        .word-list-table th {
            background: ${themeColor};
            color: white;
            font-weight: bold;
        }
        
        .word-list-table tr:nth-child(even) {
            background: ${colorScheme.light};
        }
        
        .number-cell {
            text-align: center;
            font-weight: bold;
            width: 40px;
        }
        
        .word-cell {
            font-weight: bold;
            color: ${themeColor};
        }
        
        .phonetic-cell {
            font-style: italic;
            color: ${colorScheme.secondary};
        }
        
        .relation-cell {
            font-size: 0.9em;
        }
        
        .example-cell {
            font-style: italic;
        }
        
        .image-cell {
            text-align: center;
            color: ${colorScheme.success};
        }
        
        .suggestions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .suggestion-card {
            background: ${colorScheme.light};
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${themeColor};
        }
        
        .suggestion-card h4 {
            color: ${themeColor};
            margin-bottom: 10px;
        }
        
        .suggestion-card ul {
            margin: 0;
            padding-left: 15px;
        }
        
        .suggestion-card li {
            margin-bottom: 5px;
        }
        
        .toc-section {
            background: ${colorScheme.light};
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .toc-list {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .toc-list li {
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .answer-list {
            margin: 20px 0;
        }
        
        .answer-item {
            display: flex;
            margin-bottom: 15px;
            padding: 10px;
            background: ${colorScheme.light};
            border-radius: 8px;
        }
        
        .answer-number {
            font-weight: bold;
            color: ${themeColor};
            margin-right: 10px;
            min-width: 30px;
        }
        
        .answer-content {
            flex: 1;
        }
        
        .section-header {
            background: ${themeColor};
            color: white;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
        }
        
        .section-header h1 {
            color: white;
            margin-bottom: 5px;
        }
        
        .set-section {
            margin: 30px 0;
        }
        
        .set-header {
            background: ${colorScheme.light};
            padding: 15px;
            border-radius: 8px 8px 0 0;
            border-bottom: 2px solid ${themeColor};
        }
        
        .set-header h2 {
            color: ${themeColor};
            margin-bottom: 5px;
        }
        
        .set-description {
            color: ${colorScheme.secondary};
            margin-bottom: 10px;
        }
        
        .set-stats {
            display: flex;
            gap: 15px;
        }
        
        .stat {
            background: ${themeColor}20;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.9em;
            font-weight: 500;
        }
    `;
  }

  /**
   * Get exercise worksheet specific CSS styles
   */
  private getExerciseWorksheetStyles(colorScheme: any): string {
    return `
        .instructions {
            background: ${colorScheme.light};
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid ${colorScheme.primary};
            margin: 15px 0;
        }
        
        .worksheet-content {
            margin: 30px 0;
        }
        
        .worksheet-instructions {
            background: ${colorScheme.success}20;
            border: 1px solid ${colorScheme.success};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            font-weight: 500;
        }
        
        .exercise-container {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid ${colorScheme.border};
            border-radius: 8px;
        }
        
        .teacher-exercise {
            background: ${colorScheme.light};
        }
        
        .exercise-header h3 {
            color: ${colorScheme.primary};
            margin-bottom: 10px;
        }
        
        .exercise-description {
            color: ${colorScheme.secondary};
            margin-bottom: 10px;
        }
        
        .exercise-instructions {
            background: ${colorScheme.warning}20;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        
        .exercise-meta {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            font-size: 0.9em;
        }
        
        .exercise-meta span {
            background: ${colorScheme.background};
            padding: 5px 10px;
            border-radius: 15px;
            border: 1px solid ${colorScheme.border};
        }
        
        .teacher-answer-key {
            background: ${colorScheme.warning}20;
            border: 2px solid ${colorScheme.warning};
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .teacher-answer-key h4 {
            color: ${colorScheme.warning};
            margin-bottom: 10px;
        }
        
        .answer-section {
            background: ${colorScheme.error}20;
            border: 2px solid ${colorScheme.error};
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        
        .answer-section h2 {
            color: ${colorScheme.error};
            margin-bottom: 15px;
        }
        
        .answer-key-simple {
            line-height: 1.8;
            font-family: monospace;
            background: white;
            padding: 15px;
            border-radius: 4px;
        }
        
        /* Multiple Choice Styles */
        .multiple-choice-worksheet .mc-question {
            margin-bottom: 25px;
            display: flex;
            gap: 15px;
        }
        
        .question-number {
            font-weight: bold;
            color: ${colorScheme.primary};
            min-width: 30px;
        }
        
        .question-content {
            flex: 1;
        }
        
        .question-text {
            margin-bottom: 10px;
            font-weight: 500;
        }
        
        .mc-options {
            margin-left: 20px;
        }
        
        .mc-option {
            display: flex;
            gap: 10px;
            margin-bottom: 8px;
            align-items: flex-start;
        }
        
        .option-letter {
            font-weight: bold;
            min-width: 25px;
        }
        
        .option-text {
            flex: 1;
        }
        
        /* Fill in the Blank Styles */
        .fill-blank-worksheet .word-bank {
            background: ${colorScheme.light};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            border: 1px solid ${colorScheme.border};
        }
        
        .bank-word {
            background: white;
            padding: 5px 10px;
            border-radius: 15px;
            margin: 3px;
            display: inline-block;
            border: 1px solid ${colorScheme.border};
        }
        
        .fill-blank-question {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            align-items: center;
        }
        
        .sentence-with-blank {
            flex: 1;
            font-size: 1.1em;
            line-height: 1.6;
        }
        
        /* Matching Styles */
        .matching-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
        }
        
        .words-column, .definitions-column {
            border: 1px solid ${colorScheme.border};
            border-radius: 8px;
            padding: 15px;
        }
        
        .words-column h4, .definitions-column h4 {
            text-align: center;
            margin-bottom: 15px;
            color: ${colorScheme.primary};
        }
        
        .match-item {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            padding: 10px;
            background: ${colorScheme.light};
            border-radius: 4px;
            align-items: flex-start;
        }
        
        .match-number, .match-letter {
            font-weight: bold;
            min-width: 25px;
            color: ${colorScheme.primary};
        }
        
        .match-word, .match-definition {
            flex: 1;
        }
        
        /* Other Exercise Styles */
        .association-item, .sentence-item, .syn-ant-item, .spelling-item {
            margin-bottom: 25px;
            padding: 15px;
            border: 1px solid ${colorScheme.border};
            border-radius: 8px;
        }
        
        .base-word, .word-prompt, .word-center {
            font-weight: bold;
            color: ${colorScheme.primary};
            margin-bottom: 10px;
        }
        
        .association-lines, .sentence-lines {
            margin-left: 20px;
        }
        
        .association-line, .sentence-line, .answer-line {
            border-bottom: 1px solid #ccc;
            height: 25px;
            margin-bottom: 10px;
        }
        
        .syn-ant-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 10px;
        }
        
        .synonym-section, .antonym-section {
            text-align: center;
        }
        
        .synonym-section label, .antonym-section label {
            display: block;
            font-weight: 500;
            margin-bottom: 8px;
            color: ${colorScheme.secondary};
        }
        
        .spelling-item {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .spelling-number {
            font-weight: bold;
            color: ${colorScheme.primary};
            min-width: 30px;
        }
        
        .spelling-line {
            flex: 1;
            border-bottom: 2px solid #333;
            height: 30px;
        }
        
        .image-word-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .image-word-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px;
            border: 1px solid ${colorScheme.border};
            border-radius: 8px;
            text-align: center;
        }
        
        .word-number {
            font-weight: bold;
            color: ${colorScheme.primary};
        }
        
        .word-text {
            font-weight: bold;
            margin: 10px 0;
        }
        
        .image-placeholder {
            background: ${colorScheme.light};
            padding: 5px 10px;
            border-radius: 4px;
            font-style: italic;
            color: ${colorScheme.secondary};
        }
        
        .word-reference {
            background: ${colorScheme.light};
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .ref-word {
            margin-bottom: 5px;
            padding: 5px;
            background: white;
            border-radius: 4px;
        }
        
        .flashcards-note {
            background: ${colorScheme.warning}20;
            border: 1px solid ${colorScheme.warning};
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            font-style: italic;
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