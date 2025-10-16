import * as XLSX from 'xlsx';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { 
  StudentProgressReport, 
  ClassDataBackup, 
  ExportJob,
  StudentAnalytics,
  ClassAnalytics,
  TeacherAnalytics 
} from '@shared/schema';

export interface CSVExportOptions {
  delimiter?: ',' | ';' | '\t';
  encoding?: 'utf8' | 'utf16le' | 'latin1';
  includeHeaders?: boolean;
  language?: 'sv' | 'en';
  dateFormat?: 'iso' | 'european' | 'us';
}

export interface ExcelExportOptions {
  format?: 'xlsx' | 'xls' | 'csv';
  includeCharts?: boolean;
  multipleSheets?: boolean;
  language?: 'sv' | 'en';
  colorScheme?: 'default' | 'professional' | 'colorful';
}

export interface ExportDataRow {
  [key: string]: string | number | boolean | Date | null;
}

export class CSVExcelExportService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'csv-excel-exports');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Export student progress data as CSV
   */
  async exportStudentProgressCSV(
    report: StudentProgressReport,
    options: CSVExportOptions = {}
  ): Promise<Buffer> {
    const defaults: CSVExportOptions = {
      delimiter: ';', // Better for Swedish Excel
      encoding: 'utf8',
      includeHeaders: true,
      language: 'sv',
      dateFormat: 'european'
    };

    const config = { ...defaults, ...options };
    const isSwedish = config.language === 'sv';

    // Prepare student progress data
    const studentData: ExportDataRow[] = [{
      [isSwedish ? 'Elevnamn' : 'Student Name']: report.studentInfo.name,
      [isSwedish ? 'Klass' : 'Class']: report.studentInfo.className || '',
      [isSwedish ? 'Genomsnittlig Poäng' : 'Average Score']: report.studentInfo.overallScore,
      [isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)']: report.studentInfo.completionRate,
      [isSwedish ? 'Total Tid (minuter)' : 'Total Time (minutes)']: report.studentInfo.totalTimeSpent,
      [isSwedish ? 'Uppgifter Slutförda' : 'Assignments Completed']: report.studentInfo.assignmentsCompleted,
      [isSwedish ? 'Senaste Aktivitet' : 'Last Activity']: this.formatDate(report.studentInfo.lastActivity, config.dateFormat!),
      [isSwedish ? 'Behöver Hjälp' : 'Needs Help']: report.weakAreas.some(area => area.needsAttention) ? (isSwedish ? 'Ja' : 'Yes') : (isSwedish ? 'Nej' : 'No'),
      [isSwedish ? 'Problemområden' : 'Struggling Areas']: report.weakAreas.filter(area => area.needsAttention).map(area => area.assignmentType).join(', '),
      [isSwedish ? 'Styrkor' : 'Strengths']: report.strengthsAndChallenges.strengths.join(', ')
    }];

    return this.convertToCSV(studentData, config);
  }

  /**
   * Export class data backup as CSV with multiple sections
   */
  async exportClassDataBackupCSV(
    backup: ClassDataBackup,
    options: CSVExportOptions = {}
  ): Promise<Buffer> {
    const defaults: CSVExportOptions = {
      delimiter: ';',
      encoding: 'utf8',
      includeHeaders: true,
      language: 'sv',
      dateFormat: 'european'
    };

    const config = { ...defaults, ...options };
    const isSwedish = config.language === 'sv';

    // Combine all class data into a comprehensive CSV
    const allData: ExportDataRow[] = [];

    // Class Information Header
    allData.push({
      [isSwedish ? 'Sektion' : 'Section']: isSwedish ? 'Klassinfo' : 'Class Information',
      [isSwedish ? 'Data' : 'Data']: ''
    });

    allData.push({
      [isSwedish ? 'Klassnamn' : 'Class Name']: backup.classInfo.name,
      [isSwedish ? 'Lärare' : 'Teacher']: backup.classInfo.teacherName,
      [isSwedish ? 'Skola' : 'School']: backup.classInfo.schoolName,
      [isSwedish ? 'Termin' : 'Term']: backup.classInfo.term,
      [isSwedish ? 'Antal Elever' : 'Student Count']: backup.classInfo.studentCount,
      [isSwedish ? 'Exportdatum' : 'Export Date']: this.formatDate(backup.exportMetadata.exportedAt, config.dateFormat!)
    });

    // Empty row separator
    allData.push({});

    // Student Performance Data
    allData.push({
      [isSwedish ? 'Sektion' : 'Section']: isSwedish ? 'Elevprestationer' : 'Student Performance',
      [isSwedish ? 'Data' : 'Data']: ''
    });

    allData.push({
      [isSwedish ? 'Elevnamn' : 'Student Name']: '',
      [isSwedish ? 'Genomsnittlig Poäng' : 'Average Score']: '',
      [isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)']: '',
      [isSwedish ? 'Tid Spenderad (min)' : 'Time Spent (min)']: '',
      [isSwedish ? 'Uppgifter Slutförda' : 'Assignments Completed']: '',
      [isSwedish ? 'Senaste Aktivitet' : 'Last Activity']: '',
      [isSwedish ? 'Behöver Hjälp' : 'Needs Help']: ''
    });

    backup.analytics.studentPerformance.forEach(student => {
      allData.push({
        [isSwedish ? 'Elevnamn' : 'Student Name']: student.studentName,
        [isSwedish ? 'Genomsnittlig Poäng' : 'Average Score']: student.averageScore,
        [isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)']: student.completionRate,
        [isSwedish ? 'Tid Spenderad (min)' : 'Time Spent (min)']: student.timeSpent,
        [isSwedish ? 'Uppgifter Slutförda' : 'Assignments Completed']: student.assignmentsCompleted,
        [isSwedish ? 'Senaste Aktivitet' : 'Last Activity']: this.formatDate(student.lastActivity, config.dateFormat!),
        [isSwedish ? 'Behöver Hjälp' : 'Needs Help']: student.needsHelp ? (isSwedish ? 'Ja' : 'Yes') : (isSwedish ? 'Nej' : 'No')
      });
    });

    // Empty row separator
    allData.push({});

    // Assignment Breakdown
    allData.push({
      [isSwedish ? 'Sektion' : 'Section']: isSwedish ? 'Uppgiftsöversikt' : 'Assignment Overview',
      [isSwedish ? 'Data' : 'Data']: ''
    });

    allData.push({
      [isSwedish ? 'Uppgiftstitel' : 'Assignment Title']: '',
      [isSwedish ? 'Typ' : 'Type']: '',
      [isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)']: '',
      [isSwedish ? 'Genomsnittlig Poäng' : 'Average Score']: '',
      [isSwedish ? 'Elever som Behöver Hjälp' : 'Students Needing Help']: ''
    });

    backup.analytics.assignmentBreakdown.forEach(assignment => {
      allData.push({
        [isSwedish ? 'Uppgiftstitel' : 'Assignment Title']: assignment.title,
        [isSwedish ? 'Typ' : 'Type']: assignment.assignmentType,
        [isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)']: assignment.completionRate,
        [isSwedish ? 'Genomsnittlig Poäng' : 'Average Score']: assignment.averageScore,
        [isSwedish ? 'Elever som Behöver Hjälp' : 'Students Needing Help']: assignment.strugglingStudentCount
      });
    });

    return this.convertToCSV(allData, config);
  }

  /**
   * Export class data backup as comprehensive Excel file with multiple sheets
   */
  async exportClassDataBackupExcel(
    backup: ClassDataBackup,
    options: ExcelExportOptions = {}
  ): Promise<Buffer> {
    const defaults: ExcelExportOptions = {
      format: 'xlsx',
      includeCharts: false,
      multipleSheets: true,
      language: 'sv',
      colorScheme: 'professional'
    };

    const config = { ...defaults, ...options };
    const isSwedish = config.language === 'sv';

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Class Overview
    const overviewData = [
      [isSwedish ? 'Klassinfo' : 'Class Information', ''],
      [isSwedish ? 'Klassnamn' : 'Class Name', backup.classInfo.name],
      [isSwedish ? 'Lärare' : 'Teacher', backup.classInfo.teacherName],
      [isSwedish ? 'Skola' : 'School', backup.classInfo.schoolName],
      [isSwedish ? 'Termin' : 'Term', backup.classInfo.term],
      [isSwedish ? 'Antal Elever' : 'Student Count', backup.classInfo.studentCount],
      [isSwedish ? 'Exportdatum' : 'Export Date', this.formatDate(backup.exportMetadata.exportedAt, 'european')],
      ['', ''],
      [isSwedish ? 'Sammanfattning' : 'Summary', ''],
      [isSwedish ? 'Genomsnittlig Poäng' : 'Average Score', `${backup.analytics.classInfo.averageScore}%`],
      [isSwedish ? 'Genomsnittlig Slutförandegrad' : 'Average Completion Rate', `${backup.analytics.classInfo.averageCompletionRate}%`],
      [isSwedish ? 'Total Tid Spenderad' : 'Total Time Spent', `${Math.round(backup.analytics.classInfo.totalTimeSpent / 60)} timmar`]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, isSwedish ? 'Klassöversikt' : 'Class Overview');

    // Sheet 2: Student Performance
    const studentHeaders = [
      isSwedish ? 'Elevnamn' : 'Student Name',
      isSwedish ? 'Genomsnittlig Poäng' : 'Average Score',
      isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)',
      isSwedish ? 'Tid Spenderad (min)' : 'Time Spent (min)',
      isSwedish ? 'Uppgifter Slutförda' : 'Assignments Completed',
      isSwedish ? 'Senaste Aktivitet' : 'Last Activity',
      isSwedish ? 'Behöver Hjälp' : 'Needs Help'
    ];

    const studentData = [
      studentHeaders,
      ...backup.analytics.studentPerformance.map(student => [
        student.studentName,
        student.averageScore,
        student.completionRate,
        student.timeSpent,
        student.assignmentsCompleted,
        this.formatDate(student.lastActivity, 'european'),
        student.needsHelp ? (isSwedish ? 'Ja' : 'Yes') : (isSwedish ? 'Nej' : 'No')
      ])
    ];

    const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
    this.formatExcelSheet(studentSheet, config.colorScheme!);
    XLSX.utils.book_append_sheet(workbook, studentSheet, isSwedish ? 'Elevprestationer' : 'Student Performance');

    // Sheet 3: Assignment Breakdown
    const assignmentHeaders = [
      isSwedish ? 'Uppgiftstitel' : 'Assignment Title',
      isSwedish ? 'Typ' : 'Type',
      isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)',
      isSwedish ? 'Genomsnittlig Poäng' : 'Average Score',
      isSwedish ? 'Elever som Behöver Hjälp' : 'Students Needing Help'
    ];

    const assignmentData = [
      assignmentHeaders,
      ...backup.analytics.assignmentBreakdown.map(assignment => [
        assignment.title,
        assignment.assignmentType,
        assignment.completionRate,
        assignment.averageScore,
        assignment.strugglingStudentCount
      ])
    ];

    const assignmentSheet = XLSX.utils.aoa_to_sheet(assignmentData);
    this.formatExcelSheet(assignmentSheet, config.colorScheme!);
    XLSX.utils.book_append_sheet(workbook, assignmentSheet, isSwedish ? 'Uppgiftsöversikt' : 'Assignment Overview');

    // Sheet 4: Progress Trends
    if (backup.analytics.progressTrends.length > 0) {
      const trendsHeaders = [
        isSwedish ? 'Datum' : 'Date',
        isSwedish ? 'Slutföranden' : 'Completions',
        isSwedish ? 'Genomsnittlig Poäng' : 'Average Score',
        isSwedish ? 'Tid Spenderad (min)' : 'Time Spent (min)'
      ];

      const trendsData = [
        trendsHeaders,
        ...backup.analytics.progressTrends.map(trend => [
          this.formatDate(trend.date, 'european'),
          trend.completions,
          trend.averageScore,
          trend.timeSpent
        ])
      ];

      const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData);
      this.formatExcelSheet(trendsSheet, config.colorScheme!);
      XLSX.utils.book_append_sheet(workbook, trendsSheet, isSwedish ? 'Framstegstrender' : 'Progress Trends');
    }

    // Convert workbook to buffer
    return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }));
  }

  /**
   * Export teacher analytics as Excel file
   */
  async exportTeacherAnalyticsExcel(
    analytics: TeacherAnalytics,
    options: ExcelExportOptions = {}
  ): Promise<Buffer> {
    const defaults: ExcelExportOptions = {
      format: 'xlsx',
      includeCharts: false,
      multipleSheets: true,
      language: 'sv',
      colorScheme: 'professional'
    };

    const config = { ...defaults, ...options };
    const isSwedish = config.language === 'sv';

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Overview
    const overviewData = [
      [isSwedish ? 'Läraröversikt' : 'Teacher Overview', ''],
      [isSwedish ? 'Total Antal Elever' : 'Total Students', analytics.overview.totalStudents],
      [isSwedish ? 'Total Antal Klasser' : 'Total Classes', analytics.overview.totalClasses],
      [isSwedish ? 'Aktiva Uppgifter' : 'Active Assignments', analytics.overview.activeAssignments],
      [isSwedish ? 'Slutförda Uppgifter' : 'Completed Assignments', analytics.overview.completedAssignments],
      [isSwedish ? 'Genomsnittlig Poäng' : 'Average Score', `${analytics.overview.averageScore}%`],
      [isSwedish ? 'Genomsnittlig Slutförandegrad' : 'Average Completion Rate', `${analytics.overview.averageCompletionRate}%`],
      [isSwedish ? 'Total Tid Spenderad (min)' : 'Total Time Spent (min)', analytics.overview.totalTimeSpent]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, isSwedish ? 'Översikt' : 'Overview');

    // Sheet 2: Class Breakdown
    const classHeaders = [
      isSwedish ? 'Klassnamn' : 'Class Name',
      isSwedish ? 'Antal Elever' : 'Student Count',
      isSwedish ? 'Genomsnittlig Poäng' : 'Average Score',
      isSwedish ? 'Slutförandegrad (%)' : 'Completion Rate (%)',
      isSwedish ? 'Elever som Behöver Hjälp' : 'Struggling Students'
    ];

    const classData = [
      classHeaders,
      ...analytics.classBreakdown.map(cls => [
        cls.className,
        cls.studentCount,
        cls.averageScore,
        cls.completionRate,
        cls.strugglingStudents
      ])
    ];

    const classSheet = XLSX.utils.aoa_to_sheet(classData);
    this.formatExcelSheet(classSheet, config.colorScheme!);
    XLSX.utils.book_append_sheet(workbook, classSheet, isSwedish ? 'Klassuppdelning' : 'Class Breakdown');

    return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }));
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: ExportDataRow[], options: CSVExportOptions): Buffer {
    if (data.length === 0) {
      return Buffer.from('', options.encoding!);
    }

    const delimiter = options.delimiter!;
    const includeHeaders = options.includeHeaders!;

    // Get all unique headers
    const headers = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => headers.add(key));
    });
    const headerArray = Array.from(headers);

    let csvContent = '';

    // Add headers if requested
    if (includeHeaders) {
      csvContent += headerArray.map(header => this.escapeCsvValue(header, delimiter)).join(delimiter) + '\n';
    }

    // Add data rows
    data.forEach(row => {
      const values = headerArray.map(header => {
        const value = row[header];
        return this.escapeCsvValue(value, delimiter);
      });
      csvContent += values.join(delimiter) + '\n';
    });

    return Buffer.from(csvContent, options.encoding!);
  }

  /**
   * Escape CSV values properly
   */
  private escapeCsvValue(value: any, delimiter: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    let stringValue = String(value);
    
    // Check if value needs escaping
    if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      // Escape quotes by doubling them
      stringValue = stringValue.replace(/"/g, '""');
      // Wrap in quotes
      stringValue = `"${stringValue}"`;
    }

    return stringValue;
  }

  /**
   * Format Excel sheet with styling
   */
  private formatExcelSheet(sheet: XLSX.WorkSheet, colorScheme: string): void {
    if (!sheet['!ref']) return;

    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    // Set column widths
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      colWidths.push({ wch: 20 }); // 20 character width
    }
    sheet['!cols'] = colWidths;

    // Format header row
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (sheet[headerAddr]) {
        sheet[headerAddr].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: this.getExcelColor(colorScheme, 'header') } },
          alignment: { horizontal: 'center' }
        };
      }
    }

    // Set alternate row colors
    for (let R = 1; R <= range.e.r; ++R) {
      const fillColor = R % 2 === 0 ? this.getExcelColor(colorScheme, 'even') : this.getExcelColor(colorScheme, 'odd');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
        if (sheet[cellAddr]) {
          sheet[cellAddr].s = {
            fill: { fgColor: { rgb: fillColor } },
            alignment: { horizontal: 'left' }
          };
        }
      }
    }
  }

  /**
   * Get Excel color based on color scheme
   */
  private getExcelColor(scheme: string, type: 'header' | 'even' | 'odd'): string {
    const colors = {
      professional: {
        header: '1e40af',
        even: 'f9fafb',
        odd: 'ffffff'
      },
      default: {
        header: '3b82f6',
        even: 'f8fafc',
        odd: 'ffffff'
      },
      colorful: {
        header: '7c3aed',
        even: 'fef7ff',
        odd: 'ffffff'
      }
    };

    return colors[scheme as keyof typeof colors]?.[type] || colors.default[type];
  }

  /**
   * Format date according to specified format
   */
  private formatDate(dateValue: any, format: string): string {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';

    switch (format) {
      case 'iso':
        return date.toISOString().split('T')[0];
      case 'european':
        return date.toLocaleDateString('sv-SE');
      case 'us':
        return date.toLocaleDateString('en-US');
      default:
        return date.toLocaleDateString('sv-SE');
    }
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
export const csvExcelExportService = new CSVExcelExportService();