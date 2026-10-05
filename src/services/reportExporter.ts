import { jsPDF } from 'jspdf';
import {
  BursaryApplication,
  ProjectRecord,
  ProjectExpenditure,
  SchoolRecord,
} from '../types/cdf.ts';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportAwardStatementPdf(app: BursaryApplication) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  let y = 56;

  // Header Banner
  doc.setFillColor(11, 79, 50); // #0B4F32 Nandi Highland Emerald
  doc.rect(0, 0, 595, 92, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('KOBUJOI WARD NG-CDF MANAGEMENT COMMITTEE', margin, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Aldai Constituency · Nandi County · Republic of Kenya', margin, 56);
  doc.text('OFFICIAL BURSARY AWARD & SCHOOL ALLOCATION STATEMENT', margin, 72);

  y = 124;
  doc.setTextColor(15, 31, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Application Ref: ${app.applicationId}`, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Issued Date: ${new Date().toISOString().slice(0, 10)}`, 400, y);

  y += 14;
  doc.setDrawColor(210, 220, 215);
  doc.line(margin, y, 595 - margin, y);

  if (app.isDemo) {
    y += 20;
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      'NOTICE: THIS STATEMENT IS GENERATED FROM A DEMO / DEVELOPMENT RECORD FOR SYSTEM VERIFICATION.',
      margin,
      y
    );
  }

  y += 28;
  doc.setTextColor(15, 31, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. BENEFICIARY DETAILS', margin, y);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const beneficiaryRows: [string, string][] = [
    ['Student Full Name:', app.fullName],
    ['Admission / Registration No:', app.admissionNumber],
    ['Ward / Location / Sub-Location:', `${app.ward} / ${app.location} / ${app.subLocation}`],
    ['Academic Year & Term:', `${app.academicYear} (${app.term})`],
    ['Course / Year of Study:', app.yearOfStudy],
  ];

  for (const [label, value] of beneficiaryRows) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '-'), margin + 175, y);
    y += 18;
  }

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. INSTITUTION & ALLOCATION DETAILS', margin, y);

  y += 18;
  doc.setFontSize(10);
  const awardRows: [string, string][] = [
    ['Institution Name:', app.schoolName],
    ['Institution Type & Category:', `${app.schoolType} (${app.schoolCategory})`],
    ['Eligibility Category:', app.eligibilityCategory],
    ['Eligibility Assessment Score:', `${app.eligibilityScore} / 100`],
    ['Application Status:', app.status],
    ['Amount Awarded (KSh):', `KSh ${app.amountAwardedKsh.toLocaleString()}`],
    ['School Payment / Disbursement Status:', app.paymentStatus],
    ['Cheque / EFT Reference Number:', app.paymentReference || 'Pending Treasury Batch'],
    ['Reviewed / Authorized By:', app.reviewedBy || 'Kobujoi CDF Bursary Committee'],
  ];

  for (const [label, value] of awardRows) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '-'), margin + 195, y);
    y += 18;
  }

  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('Committee Remarks & Assessment Summary:', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  const wrappedRemarks = doc.splitTextToSize(
    `${app.reviewerRemarks || 'Verified and processed in accordance with Kobujoi NG-CDF Bursary Guidelines.'}\n\nAssessment Breakdown: ${app.eligibilityBreakdown}`,
    595 - margin * 2
  );
  doc.text(wrappedRemarks, margin, y);

  y += wrappedRemarks.length * 14 + 36;
  doc.setDrawColor(180, 190, 185);
  doc.line(margin, y, margin + 180, y);
  doc.line(350, y, 595 - margin, y);

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Bursary Officer / Fund Account Manager', margin, y);
  doc.text('Official Institution Bursar Stamp & Date', 350, y);

  doc.save(`${app.applicationId}_Award_Statement.pdf`);
}

export function exportBursaryReportCsv(applications: BursaryApplication[]) {
  const headers = [
    'Application Number',
    'Student Name',
    'Admission Number',
    'Location',
    'Sub-Location',
    'School Name',
    'School Type',
    'Academic Year',
    'Household Vulnerability',
    'Eligibility Category',
    'Eligibility Score',
    'Qualified',
    'Document Status',
    'Application Status',
    'Fee Balance (KSh)',
    'Amount Requested (KSh)',
    'Amount Awarded (KSh)',
    'Payment Status',
    'Payment Reference',
    'Record Type',
  ];

  const rows = applications.map((a) =>
    [
      a.applicationId,
      a.fullName,
      a.admissionNumber,
      a.location,
      a.subLocation,
      a.schoolName,
      a.schoolType,
      a.academicYear,
      a.householdSituation,
      a.eligibilityCategory,
      a.eligibilityScore,
      a.eligibilityQualified ? 'Yes' : 'No',
      a.documentVerificationStatus,
      a.status,
      a.feeBalanceKsh,
      a.amountRequestedKsh,
      a.amountAwardedKsh,
      a.paymentStatus,
      a.paymentReference,
      a.isDemo ? 'DEMO' : 'OFFICIAL',
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `Kobujoi_CDF_Bursary_Report_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportBursaryReportPdf(applications: BursaryApplication[], schools: SchoolRecord[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = 50;

  doc.setFillColor(11, 79, 50);
  doc.rect(0, 0, 595, 76, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('KOBUJOI CDF — BURSARY ALLOCATION & ELIGIBILITY REPORT', margin, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()} · Aldai Constituency, Nandi County`, margin, 54);

  y = 100;
  doc.setTextColor(15, 31, 23);
  const totalApps = applications.length;
  const eligibleCount = applications.filter((a) => a.eligibilityQualified).length;
  const approvedOrAwarded = applications.filter((a) =>
    ['Approved', 'Awarded', 'Allocated to School', 'Payment Processed', 'Completed'].includes(a.status)
  );
  const totalAwardedKsh = applications.reduce((sum, a) => sum + (a.amountAwardedKsh || 0), 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EXECUTIVE SUMMARY', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Applications Received: ${totalApps}`, margin, y);
  doc.text(`Eligible Applicants: ${eligibleCount}`, margin + 220, y);
  y += 16;
  doc.text(`Approved / Awarded Beneficiaries: ${approvedOrAwarded.length}`, margin, y);
  doc.text(`Total Bursary Disbursed / Awarded: KSh ${totalAwardedKsh.toLocaleString()}`, margin + 220, y);
  y += 16;
  doc.text(`Registered Beneficiary Schools: ${schools.length}`, margin, y);

  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('APPLICANT & AWARD REGISTER', margin, y);
  y += 16;

  doc.setFontSize(8);
  doc.text('App Ref', margin, y);
  doc.text('Student Name', margin + 105, y);
  doc.text('Institution', margin + 215, y);
  doc.text('Status', margin + 355, y);
  doc.text('Awarded (KSh)', margin + 440, y);
  y += 6;
  doc.line(margin, y, 595 - margin, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  for (const app of applications.slice(0, 32)) {
    if (y > 770) {
      doc.addPage();
      y = 50;
    }
    doc.text(app.applicationId.slice(0, 20), margin, y);
    doc.text(app.fullName.slice(0, 22), margin + 105, y);
    doc.text(app.schoolName.slice(0, 26), margin + 215, y);
    doc.text(app.status.slice(0, 18), margin + 355, y);
    doc.text(`KSh ${app.amountAwardedKsh.toLocaleString()}`, margin + 440, y);
    y += 15;
  }

  doc.save(`Kobujoi_CDF_Bursary_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportProjectReportCsv(projects: ProjectRecord[]) {
  const headers = [
    'Project ID',
    'Project Name',
    'Category',
    'Ward',
    'Location',
    'Sub-Location',
    'Financial Year',
    'Status',
    'Progress (%)',
    'Approved Budget (KSh)',
    'Amount Spent (KSh)',
    'Remaining Balance (KSh)',
    'Budget Utilization (%)',
    'Current Stage',
    'Record Type',
  ];

  const rows = projects.map((p) => {
    const remaining = Math.max(0, p.approvedBudgetKsh - p.amountSpentKsh);
    const util =
      p.approvedBudgetKsh > 0
        ? Math.round((p.amountSpentKsh / p.approvedBudgetKsh) * 100)
        : 0;
    return [
      p.projectId,
      p.projectName,
      p.category,
      p.ward,
      p.location,
      p.subLocation,
      p.financialYear,
      p.status,
      p.percentageCompleted,
      p.approvedBudgetKsh,
      p.amountSpentKsh,
      remaining,
      `${util}%`,
      p.currentStage,
      p.isDemo ? 'DEMO' : 'OFFICIAL',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `Kobujoi_CDF_Projects_Report_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportProjectReportPdf(projects: ProjectRecord[], expenditures: ProjectExpenditure[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = 50;

  doc.setFillColor(11, 79, 50);
  doc.rect(0, 0, 595, 76, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('KOBUJOI CDF — CONSTITUENCY DEVELOPMENT PROJECTS & FINANCIAL REPORT', margin, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()} · Kobujoi Ward, Aldai Constituency`, margin, 54);

  y = 100;
  doc.setTextColor(15, 31, 23);
  const totalBudget = projects.reduce((s, p) => s + p.approvedBudgetKsh, 0);
  const totalSpent = projects.reduce((s, p) => s + p.amountSpentKsh, 0);
  const completedCount = projects.filter((p) => p.status === 'Completed').length;
  const ongoingCount = projects.filter((p) => p.status === 'Ongoing').length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PORTFOLIO SUMMARY', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Projects: ${projects.length} (Completed: ${completedCount}, Ongoing: ${ongoingCount})`, margin, y);
  y += 16;
  doc.text(`Total Approved Budget: KSh ${totalBudget.toLocaleString()}`, margin, y);
  doc.text(`Total Expenditure: KSh ${totalSpent.toLocaleString()}`, margin + 240, y);
  y += 16;
  doc.text(
    `Remaining Portfolio Balance: KSh ${Math.max(0, totalBudget - totalSpent).toLocaleString()} · Vouchers Logged: ${expenditures.length}`,
    margin,
    y
  );

  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PROJECT IMPLEMENTATION LEDGER', margin, y);
  y += 16;

  doc.setFontSize(8);
  doc.text('Project ID & Title', margin, y);
  doc.text('Location', margin + 205, y);
  doc.text('Status / %', margin + 295, y);
  doc.text('Budget (KSh)', margin + 370, y);
  doc.text('Spent (KSh)', margin + 445, y);
  y += 6;
  doc.line(margin, y, 595 - margin, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  for (const p of projects) {
    if (y > 760) {
      doc.addPage();
      y = 50;
    }
    doc.text(`${p.projectId}: ${p.projectName.slice(0, 26)}`, margin, y);
    doc.text(p.subLocation.slice(0, 16), margin + 205, y);
    doc.text(`${p.status} (${p.percentageCompleted}%)`, margin + 295, y);
    doc.text(p.approvedBudgetKsh.toLocaleString(), margin + 370, y);
    doc.text(p.amountSpentKsh.toLocaleString(), margin + 445, y);
    y += 16;
  }

  doc.save(`Kobujoi_CDF_Projects_Financial_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportFinancialReportCsv(
  projects: ProjectRecord[],
  expenditures: ProjectExpenditure[],
  applications: BursaryApplication[]
) {
  const headers = [
    'Record Type',
    'Reference ID',
    'Date / FY',
    'Entity / Project / School',
    'Category',
    'Description',
    'Approved / Requested (KSh)',
    'Disbursed / Spent (KSh)',
    'Authorized / Reviewed By',
  ];

  const expRows = expenditures.map((e) =>
    [
      'Project Expenditure Voucher',
      e.paymentReference,
      e.expenditureDate,
      e.projectName,
      e.category,
      e.description,
      e.amountKsh,
      e.amountKsh,
      e.authorizedBy,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const bursaryRows = applications
    .filter((a) => a.amountAwardedKsh > 0)
    .map((a) =>
      [
        'Bursary Award Allocation',
        a.paymentReference || a.applicationId,
        a.academicYear,
        `${a.schoolName} (${a.fullName})`,
        a.eligibilityCategory,
        `Bursary allocation - ${a.paymentStatus}`,
        a.amountRequestedKsh,
        a.amountAwardedKsh,
        a.reviewedBy,
      ]
        .map(escapeCsvCell)
        .join(',')
    );

  const projSummaryRows = projects.map((p) =>
    [
      'Project Master Budget',
      p.projectId,
      p.financialYear,
      p.projectName,
      p.category,
      `Stage: ${p.currentStage} (${p.percentageCompleted}% complete)`,
      p.approvedBudgetKsh,
      p.amountSpentKsh,
      p.updatedBy,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  const csvContent = [headers.join(','), ...projSummaryRows, ...expRows, ...bursaryRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(
    blob,
    `Kobujoi_CDF_Master_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`
  );
}
