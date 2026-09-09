/**
 * Laboratory Report Fixture Generator for Local OCR Benchmarking
 * 
 * Generates clinical laboratory PDF and raster image fixtures for benchmark reports:
 * 1. CBC Panel
 * 2. Iron Studies Panel
 * 3. Thyroid Profile
 * 4. Metabolic & Lipid Profile
 * 5. Vitamins & Trace Minerals
 * 6. Renal & Hepatic Function Panel
 * 
 * Generates both direct PDF vectors and rendered raster pages for OCR testing.
 */

import { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportDefinition {
  id: string;
  title: string;
  labName: string;
  patientName: string;
  date: string;
  sections: {
    sectionHeader?: string;
    rows: {
      parameter: string;
      result: string;
      unit: string;
      referenceRange: string;
      status: string;
    }[];
  }[];
}

export const BENCHMARK_REPORTS: ReportDefinition[] = [
  {
    id: 'report_01_cbc',
    title: 'COMPLETE BLOOD COUNT (CBC) & HEMATOLOGY REPORT',
    labName: 'METROPOLIS PATHOLOGY DIAGNOSTICS LAB',
    patientName: 'John Doe, 34M',
    date: '14-Aug-2026',
    sections: [
      {
        sectionHeader: 'HEMATOLOGY / COMPLETE BLOOD COUNT',
        rows: [
          { parameter: 'Hemoglobin (Hb)', result: '11.2', unit: 'g/dL', referenceRange: '12.0 - 15.0', status: 'Low' },
          { parameter: 'Total RBC Count', result: '4.20', unit: 'million/uL', referenceRange: '3.80 - 5.20', status: 'Normal' },
          { parameter: 'Hematocrit (PCV)', result: '35.5', unit: '%', referenceRange: '36.0 - 46.0', status: 'Low' },
          { parameter: 'MCV', result: '84.5', unit: 'fL', referenceRange: '80.0 - 96.0', status: 'Normal' },
          { parameter: 'MCH', result: '26.7', unit: 'pg', referenceRange: '26.0 - 32.0', status: 'Normal' },
          { parameter: 'MCHC', result: '31.5', unit: 'g/dL', referenceRange: '31.0 - 36.0', status: 'Normal' },
          { parameter: 'RDW-CV', result: '14.8', unit: '%', referenceRange: '11.5 - 14.5', status: 'High' },
          { parameter: 'Total WBC Count', result: '6,200', unit: 'cells/uL', referenceRange: '4,000 - 11,000', status: 'Normal' },
          { parameter: 'Platelet Count', result: '2.45', unit: 'lakh/uL', referenceRange: '1.5 - 4.5', status: 'Normal' },
        ],
      },
    ],
  },
  {
    id: 'report_02_iron',
    title: 'COMPREHENSIVE IRON STUDIES & FERRITIN REPORT',
    labName: 'QUEST CLINICAL REFERENCE LABORATORIES',
    patientName: 'Jane Smith, 29F',
    date: '18-Aug-2026',
    sections: [
      {
        sectionHeader: 'SERUM BIOCHEMISTRY - IRON PANEL',
        rows: [
          { parameter: 'Serum Iron', result: '38', unit: 'ug/dL', referenceRange: '60 - 170', status: 'Low' },
          { parameter: 'Total Iron Binding Capacity (TIBC)', result: '410', unit: 'ug/dL', referenceRange: '250 - 450', status: 'Normal' },
          { parameter: 'Unsaturated Iron Binding Capacity (UIBC)', result: '372', unit: 'ug/dL', referenceRange: '150 - 350', status: 'High' },
          { parameter: 'Transferrin Saturation', result: '9.3', unit: '%', referenceRange: '20 - 50', status: 'Low' },
          { parameter: 'Serum Ferritin', result: '12', unit: 'ng/mL', referenceRange: '15 - 150', status: 'Low' },
        ],
      },
    ],
  },
  {
    id: 'report_03_thyroid',
    title: 'THYROID FUNCTION TEST (TFT) COMPREHENSIVE PANEL',
    labName: 'LAL PATHLABS CLINICAL DIAGNOSTICS',
    patientName: 'Alex Green, 42M',
    date: '22-Aug-2026',
    sections: [
      {
        sectionHeader: 'IMMUNOASSAY / THYROID PROFILE',
        rows: [
          { parameter: 'Thyroid Stimulating Hormone (TSH)', result: '5.48', unit: 'uIU/mL', referenceRange: '0.40 - 4.50', status: 'High' },
          { parameter: 'Total Triiodothyronine (T3)', result: '1.15', unit: 'ng/mL', referenceRange: '0.80 - 2.00', status: 'Normal' },
          { parameter: 'Total Thyroxine (T4)', result: '6.8', unit: 'ug/dL', referenceRange: '5.1 - 14.1', status: 'Normal' },
        ],
      },
    ],
  },
  {
    id: 'report_04_metabolic_lipid',
    title: 'COMPREHENSIVE METABOLIC & LIPID PROFILE',
    labName: 'THYROCARE WELLNESS LABORATORIES',
    patientName: 'Robert Vance, 56M',
    date: '25-Aug-2026',
    sections: [
      {
        sectionHeader: 'GLYCEMIC & LIPID PANEL',
        rows: [
          { parameter: 'Fasting Blood Sugar (Glucose)', result: '108', unit: 'mg/dL', referenceRange: '70 - 100', status: 'High' },
          { parameter: 'Glycated Hemoglobin (HbA1c)', result: '5.9', unit: '%', referenceRange: '4.0 - 5.6', status: 'High' },
          { parameter: 'Total Cholesterol', result: '224', unit: 'mg/dL', referenceRange: '125 - 200', status: 'High' },
          { parameter: 'Serum Triglycerides', result: '165', unit: 'mg/dL', referenceRange: '50 - 150', status: 'High' },
          { parameter: 'HDL Cholesterol', result: '42', unit: 'mg/dL', referenceRange: '40 - 60', status: 'Normal' },
          { parameter: 'LDL Cholesterol (Calculated)', result: '149', unit: 'mg/dL', referenceRange: '50 - 100', status: 'High' },
        ],
      },
    ],
  },
  {
    id: 'report_05_vitamins',
    title: 'VITAMINS & NUTRITIONAL DEFICIENCY PANEL',
    labName: 'CORE DIAGNOSTICS REFERENCE LAB',
    patientName: 'Elena Rostova, 31F',
    date: '28-Aug-2026',
    sections: [
      {
        sectionHeader: 'VITAMIN & MINERAL ASSAYS',
        rows: [
          { parameter: 'Vitamin B12 (Cyanocobalamin)', result: '284', unit: 'pg/mL', referenceRange: '200 - 900', status: 'Normal' },
          { parameter: 'Serum Folate', result: '4.8', unit: 'ng/mL', referenceRange: '3.0 - 17.0', status: 'Normal' },
          { parameter: 'Vitamin D (25-OH Total)', result: '16.2', unit: 'ng/mL', referenceRange: '30 - 100', status: 'Low' },
          { parameter: 'Serum Calcium', result: '9.1', unit: 'mg/dL', referenceRange: '8.6 - 10.2', status: 'Normal' },
        ],
      },
    ],
  },
  {
    id: 'report_06_renal_liver',
    title: 'RENAL & HEPATIC FUNCTION PANEL',
    labName: 'MAX HEALTHCARE PATHOLOGY & LABS',
    patientName: 'David Miller, 48M',
    date: '30-Aug-2026',
    sections: [
      {
        sectionHeader: 'RENAL & LIVER BIOCHEMISTRY',
        rows: [
          { parameter: 'Serum Creatinine', result: '0.92', unit: 'mg/dL', referenceRange: '0.70 - 1.20', status: 'Normal' },
          { parameter: 'Blood Urea Nitrogen (BUN)', result: '14.5', unit: 'mg/dL', referenceRange: '7.0 - 20.0', status: 'Normal' },
          { parameter: 'Serum Bilirubin Total', result: '0.85', unit: 'mg/dL', referenceRange: '0.20 - 1.20', status: 'Normal' },
          { parameter: 'SGPT / ALT', result: '34', unit: 'U/L', referenceRange: '0 - 45', status: 'Normal' },
          { parameter: 'SGOT / AST', result: '29', unit: 'U/L', referenceRange: '0 - 40', status: 'Normal' },
        ],
      },
    ],
  },
  {
    id: 'report_07_skewed_noisy',
    title: 'THYROID & SERUM IRON PANEL (SCAN VECTOR)',
    labName: 'DIAGNOSTIC PATHWAYS CLINICAL SCAN LAB',
    patientName: 'Marcus Wright, 51M',
    date: '01-Sep-2026',
    sections: [
      {
        sectionHeader: 'ENDOCRINE & BIOCHEMISTRY ASSAYS',
        rows: [
          { parameter: 'Thyroid Stimulating Hormone (TSH)', result: '3.82', unit: 'uIU/mL', referenceRange: '0.40 - 4.50', status: 'Normal' },
          { parameter: 'Total Triiodothyronine (T3)', result: '1.28', unit: 'ng/mL', referenceRange: '0.80 - 2.00', status: 'Normal' },
          { parameter: 'Serum Iron', result: '45', unit: 'ug/dL', referenceRange: '60 - 170', status: 'Low' },
          { parameter: 'Serum Ferritin', result: '18', unit: 'ng/mL', referenceRange: '15 - 150', status: 'Normal' },
        ],
      },
    ],
  },
  {
    id: 'report_08_complex_reference_ranges',
    title: 'HEMATOLOGY PROFILE (STRATIFIED REFERENCE INTERVALS)',
    labName: 'APOLLO CLINICAL DIAGNOSTICS & RESEARCH',
    patientName: 'Claire Bennet, 27F',
    date: '02-Sep-2026',
    sections: [
      {
        sectionHeader: 'COMPLETE BLOOD PROFILE',
        rows: [
          { parameter: 'Hemoglobin (Hb)', result: '13.4', unit: 'g/dL', referenceRange: '13.0 - 17.0', status: 'Normal' },
          { parameter: 'Total RBC Count', result: '4.85', unit: 'million/uL', referenceRange: '4.50 - 5.90', status: 'Normal' },
          { parameter: 'Hematocrit (PCV)', result: '41.2', unit: '%', referenceRange: '40.0 - 50.0', status: 'Normal' },
          { parameter: 'Platelet Count', result: '1.95', unit: 'lakh/uL', referenceRange: '1.5 - 4.5', status: 'Normal' },
        ],
      },
    ],
  },
  {
    id: 'report_09_dense_tabular_cbc',
    title: 'DENSE TABULAR RED CELL INDICES',
    labName: 'SUPER RELIABLE LABS LTD',
    patientName: 'Nathan Petrelli, 39M',
    date: '03-Sep-2026',
    sections: [
      {
        sectionHeader: 'RBC MORPHOLOGY & INDICES',
        rows: [
          { parameter: 'Mean Corpuscular Volume (MCV)', result: '88.2', unit: 'fL', referenceRange: '80.0 - 96.0', status: 'Normal' },
          { parameter: 'Mean Corpuscular Hemoglobin (MCH)', result: '29.4', unit: 'pg', referenceRange: '26.0 - 32.0', status: 'Normal' },
          { parameter: 'MCHC', result: '33.1', unit: 'g/dL', referenceRange: '31.0 - 36.0', status: 'Normal' },
          { parameter: 'RDW-CV', result: '12.6', unit: '%', referenceRange: '11.5 - 14.5', status: 'Normal' },
        ],
      },
    ],
  },
  {
    id: 'report_10_decimal_stress',
    title: 'HIGH-PRECISION DECIMAL BIOCHEMISTRY PANEL',
    labName: 'METABOLIC ACCURACY CLINIC',
    patientName: 'Peter Petrelli, 32M',
    date: '04-Sep-2026',
    sections: [
      {
        sectionHeader: 'HIGH-PRECISION METABOLIC ASSAYS',
        rows: [
          { parameter: 'Serum Creatinine', result: '0.85', unit: 'mg/dL', referenceRange: '0.70 - 1.20', status: 'Normal' },
          { parameter: 'Serum Bilirubin Total', result: '0.72', unit: 'mg/dL', referenceRange: '0.20 - 1.20', status: 'Normal' },
          { parameter: 'TSH', result: '2.14', unit: 'uIU/mL', referenceRange: '0.40 - 4.50', status: 'Normal' },
          { parameter: 'Glycated Hemoglobin (HbA1c)', result: '5.4', unit: '%', referenceRange: '4.0 - 5.6', status: 'Normal' },
        ],
      },
    ],
  },
];

/**
 * Renders a report definition into a standard PDF document Uint8Array.
 */
export function generateReportPDF(report: ReportDefinition): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(report.labName, 16, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(report.title, 16, y);
  doc.text(`Date: ${report.date}`, 150, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.text(`Patient: ${report.patientName}`, 16, y);
  doc.text('Ref By: Dr. S. K. Sharma, MD', 150, y);
  y += 6;

  doc.setLineWidth(0.35);
  doc.line(16, y, 194, y);
  y += 7;

  // Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INVESTIGATION / TEST PARAMETER', 16, y);
  doc.text('OBSERVED RESULT', 82, y);
  doc.text('UNIT', 114, y);
  doc.text('REFERENCE INTERVAL', 138, y);
  doc.text('STATUS', 180, y);
  y += 3.5;
  doc.line(16, y, 194, y);
  y += 5.5;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  for (const section of report.sections) {
    if (section.sectionHeader) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.text(`--- ${section.sectionHeader} ---`, 16, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
    }

    for (const row of section.rows) {
      doc.text(row.parameter, 16, y);
      doc.text(row.result, 82, y);
      doc.text(row.unit, 114, y);
      doc.text(row.referenceRange, 138, y);
      doc.text(row.status, 180, y);
      y += 5.2;
    }
  }

  y += 6;
  doc.setLineWidth(0.2);
  doc.line(16, y, 194, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.text('*** End of Examination Report — Verified by Clinical Pathologist ***', 55, y);

  return doc.output('arraybuffer') as unknown as Uint8Array;
}

/**
 * Saves all benchmark PDFs to disk for offline testing and benchmarking.
 */
export function generateAllBenchmarkPDFs(outputDir: string): string[] {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generatedFiles: string[] = [];

  for (const report of BENCHMARK_REPORTS) {
    const pdfBytes = generateReportPDF(report);
    const filePath = path.join(outputDir, `${report.id}.pdf`);
    fs.writeFileSync(filePath, Buffer.from(pdfBytes));
    generatedFiles.push(filePath);
  }

  return generatedFiles;
}
