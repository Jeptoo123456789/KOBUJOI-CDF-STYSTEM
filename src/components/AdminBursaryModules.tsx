import React, { useState } from 'react';
import {
  BursaryApplication,
  ApplicationDocument,
  SchoolRecord,
  EligibilityCriteria,
  ApplicationStatus,
  PaymentAllocationStatus,
  DocumentVerificationStatus,
  sanitizeId,
  sanitizeString,
} from '../types/cdf.ts';
import {
  submitOrUpdateBursaryApplication,
  verifyStudentDocumentStatus,
  saveSchoolRecord,
  saveEligibilityCriterion,
  createSystemNotification,
  logAuditAction,
} from '../services/cdfFirestoreService.ts';
import { exportAwardStatementPdf } from '../services/reportExporter.ts';
import {
  Search,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Plus,
  Sliders,
  Building2,
  ShieldAlert,
} from 'lucide-react';

interface AdminBursaryModulesProps {
  activeSection:
    | 'students'
    | 'applications'
    | 'awards'
    | 'criteria'
    | 'schools'
    | 'documents';
  roleMode: 'admin' | 'staff';
  actorName: string;
  applications: BursaryApplication[];
  documents: ApplicationDocument[];
  schools: SchoolRecord[];
  criteriaList: EligibilityCriteria[];
  onFeedback: (msg: string, isError?: boolean) => void;
}

export const AdminBursaryModules: React.FC<AdminBursaryModulesProps> = ({
  activeSection,
  roleMode,
  actorName,
  applications,
  documents,
  schools,
  criteriaList,
  onFeedback,
}) => {
  // Search & Filter for Applications / Students
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [schoolFilter, setSchoolFilter] = useState('ALL');

  // Review / Override / Award State
  const [selectedApp, setSelectedApp] = useState<BursaryApplication | null>(
    applications[0] || null
  );
  const [reviewStatus, setReviewStatus] = useState<ApplicationStatus>('Approved');
  const [docVerifyStatus, setDocVerifyStatus] =
    useState<DocumentVerificationStatus>('Verified');
  const [awardAmount, setAwardAmount] = useState<number>(25000);
  const [paymentRef, setPaymentRef] = useState<string>('KBG-EFT-2026-1105');
  const [paymentStatus, setPaymentStatus] =
    useState<PaymentAllocationStatus>('Allocated to School');
  const [reviewerRemarks, setReviewerRemarks] = useState<string>(
    'Verified supporting documents and confirmed ward residency.'
  );
  const [overrideReason, setOverrideReason] = useState<string>('');

  // New School Form
  const [schoolName, setSchoolName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [schoolType, setSchoolType] = useState<SchoolRecord['schoolType']>('Secondary');
  const [schoolCategory, setSchoolCategory] =
    useState<SchoolRecord['category']>('Extra-County');
  const [schoolLocation, setSchoolLocation] = useState('Kobujoi Ward, Aldai');
  const [principalName, setPrincipalName] = useState('');
  const [contactPhone, setContactPhone] = useState('+254 720 000 000');
  const [contactEmail, setContactEmail] = useState('info@school.sc.ke');
  const [bankName, setBankName] = useState('Kenya Commercial Bank (KCB)');
  const [bankBranch, setBankBranch] = useState('Kapsabet Branch');
  const [accountMasked, setAccountMasked] = useState('KCB-110****5500');

  // New Eligibility Criterion Form
  const [critName, setCritName] = useState('');
  const [critCode, setCritCode] = useState('');
  const [critDesc, setCritDesc] = useState('');
  const [critMaxPoints, setCritMaxPoints] = useState<number>(35);
  const [critMinScore, setCritMinScore] = useState<number>(50);
  const [critMaxIncome, setCritMaxIncome] = useState<number>(20000);
  const [critPriority, setCritPriority] =
    useState<EligibilityCriteria['priorityLevel']>('High');
  const [critDocs, setCritDocs] = useState(
    'Birth Certificate, School Fee Structure, Chief Verification Letter'
  );
  const [critMaxAward, setCritMaxAward] = useState<number>(25000);

  const filteredApps = applications.filter((a) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      a.fullName.toLowerCase().includes(q) ||
      a.applicationId.toLowerCase().includes(q) ||
      a.schoolName.toLowerCase().includes(q) ||
      a.admissionNumber.toLowerCase().includes(q) ||
      a.nationalIdOrBirthCert.toLowerCase().includes(q) ||
      a.academicYear.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchCat =
      categoryFilter === 'ALL' || a.eligibilityCategory === categoryFilter;
    const matchSch = schoolFilter === 'ALL' || a.schoolId === schoolFilter;
    return matchSearch && matchStatus && matchCat && matchSch;
  });

  const handleSelectAppForReview = (app: BursaryApplication) => {
    setSelectedApp(app);
    setReviewStatus(app.status);
    setDocVerifyStatus(app.documentVerificationStatus);
    setAwardAmount(app.amountAwardedKsh || 20000);
    setPaymentRef(app.paymentReference || `KBG-EFT-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setPaymentStatus(
      app.paymentStatus === 'Unallocated' ? 'Allocated to School' : app.paymentStatus
    );
    setReviewerRemarks(app.reviewerRemarks || '');
    setOverrideReason('');
  };

  const handleApplyReviewOrAward = async (isAwardAllocation: boolean) => {
    if (!selectedApp) return;

    if (roleMode === 'staff' && isAwardAllocation) {
      onFeedback(
        'Only CDF Administrators can authorize final bursary awards and school EFT allocations.',
        true
      );
      return;
    }

    const isOverridingNonEligible =
      !selectedApp.eligibilityQualified &&
      ['Approved', 'Awarded', 'Allocated to School'].includes(reviewStatus);

    if (isOverridingNonEligible && !overrideReason.trim()) {
      onFeedback(
        'Mandatory Audit Rule: Overriding non-eligible status requires an explicit written justification in the Override Reason field.',
        true
      );
      return;
    }

    try {
      const nextAmount =
        roleMode === 'admin' && isAwardAllocation
          ? awardAmount
          : selectedApp.amountAwardedKsh;

      const nextStatus: ApplicationStatus = isAwardAllocation
        ? paymentStatus === 'Allocated to School'
          ? 'Allocated to School'
          : 'Awarded'
        : reviewStatus;

      const combinedRemarks = sanitizeString(
        overrideReason.trim()
          ? `[AUTHORIZED OVERRIDE: ${overrideReason.trim()}] ${reviewerRemarks}`
          : reviewerRemarks,
        600
      );

      await submitOrUpdateBursaryApplication(
        {
          ...selectedApp,
          documentVerificationStatus: docVerifyStatus,
          status: nextStatus,
          amountAwardedKsh: nextAmount,
          paymentReference:
            roleMode === 'admin' ? paymentRef : selectedApp.paymentReference,
          paymentStatus:
            roleMode === 'admin' ? paymentStatus : selectedApp.paymentStatus,
          reviewerRemarks: combinedRemarks,
          reviewedBy: actorName,
          eligibilityQualified: isOverridingNonEligible
            ? true
            : selectedApp.eligibilityQualified,
        },
        selectedApp
      );

      // If Admin allocated a new award amount, update the target school's allocation total
      if (roleMode === 'admin' && isAwardAllocation && nextAmount > 0) {
        const targetSchool = schools.find((s) => s.schoolId === selectedApp.schoolId);
        if (targetSchool) {
          const delta = Math.max(0, nextAmount - (selectedApp.amountAwardedKsh || 0));
          const countDelta = selectedApp.amountAwardedKsh === 0 ? 1 : 0;
          await saveSchoolRecord(
            {
              ...targetSchool,
              beneficiaryCount: targetSchool.beneficiaryCount + countDelta,
              totalAllocatedKsh: targetSchool.totalAllocatedKsh + delta,
              totalPaidKsh:
                paymentStatus === 'EFT Processed' ||
                paymentStatus === 'Cheque Disbursed' ||
                paymentStatus === 'Confirmed by School'
                  ? targetSchool.totalPaidKsh + delta
                  : targetSchool.totalPaidKsh,
            },
            targetSchool
          );
        }
      }

      // Send notification to student
      await createSystemNotification({
        recipientUid: selectedApp.applicantUid,
        title: `Bursary Application ${selectedApp.applicationId}: ${nextStatus}`,
        message:
          nextAmount > 0
            ? `Your bursary application for ${selectedApp.schoolName} has been updated to "${nextStatus}" with an award of KSh ${nextAmount.toLocaleString()} (Ref: ${paymentRef}).`
            : `Your bursary application (${selectedApp.applicationId}) review status is now "${nextStatus}". Document status: ${docVerifyStatus}.`,
        type: isAwardAllocation ? 'Bursary Award' : 'Eligibility Update',
        relatedRecordId: selectedApp.applicationId,
      });

      // Record immutable audit trail
      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: isOverridingNonEligible
          ? `Administrator executed authorized eligibility override and approved ${selectedApp.applicationId} (Reason: ${overrideReason.trim()}).`
          : isAwardAllocation
          ? `Administrator allocated KSh ${nextAmount.toLocaleString()} to ${selectedApp.fullName} (${selectedApp.applicationId}) at ${selectedApp.schoolName}.`
          : `${roleMode.toUpperCase()} updated application ${selectedApp.applicationId} status to ${nextStatus} and document verification to ${docVerifyStatus}.`,
        targetCollection: 'bursary_applications',
        targetRecordId: selectedApp.applicationId,
        previousValueSummary: `Status: ${selectedApp.status} · Awarded: KSh ${selectedApp.amountAwardedKsh.toLocaleString()}`,
        newValueSummary: `Status: ${nextStatus} · Awarded: KSh ${nextAmount.toLocaleString()} · Docs: ${docVerifyStatus}`,
      });

      onFeedback(
        `Updated application ${selectedApp.applicationId} (${nextStatus}) and recorded audit log.`
      );
    } catch (err) {
      onFeedback(
        err instanceof Error ? err.message : 'Failed to update application.',
        true
      );
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roleMode !== 'admin') {
      onFeedback('Only Administrators can register or modify school banking records.', true);
      return;
    }
    if (!schoolName.trim() || !regNo.trim()) {
      onFeedback('School Name and Registration Number are required.', true);
      return;
    }

    try {
      const schoolId = sanitizeId(`sch-${Date.now()}`);
      await saveSchoolRecord({
        schoolId,
        schoolName: schoolName.trim(),
        registrationNumber: regNo.trim(),
        schoolType,
        category: schoolCategory,
        location: schoolLocation.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        principalName: principalName.trim() || 'Principal',
        bankName: bankName.trim(),
        bankBranch: bankBranch.trim(),
        accountNumberMasked: accountMasked.trim(),
        beneficiaryCount: 0,
        totalAllocatedKsh: 0,
        totalPaidKsh: 0,
        isDemo: false,
      });

      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: `Registered new beneficiary school "${schoolName.trim()}" (${regNo.trim()}).`,
        targetCollection: 'schools',
        targetRecordId: schoolId,
        previousValueSummary: 'None',
        newValueSummary: `${schoolName.trim()} (${schoolType})`,
      });

      setSchoolName('');
      setRegNo('');
      setPrincipalName('');
      onFeedback(`Registered institution "${schoolName.trim()}" in database.`);
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Failed to add school.', true);
    }
  };

  const handleAddCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roleMode !== 'admin') {
      onFeedback('Only Administrators can configure eligibility criteria.', true);
      return;
    }
    if (!critName.trim() || !critCode.trim()) {
      onFeedback('Category Name and Code are required.', true);
      return;
    }

    try {
      const criteriaId = sanitizeId(`crit-${Date.now()}`);
      await saveEligibilityCriterion({
        criteriaId,
        categoryName: critName.trim(),
        categoryCode: critCode.trim().toUpperCase(),
        description: critDesc.trim() || 'Configured vulnerability category.',
        maxPoints: critMaxPoints,
        minAcademicScore: critMinScore,
        maxHouseholdIncomeKsh: critMaxIncome,
        priorityLevel: critPriority,
        requiredDocuments: critDocs.trim(),
        maxAwardKsh: critMaxAward,
        financialYear: '2025/2026',
        isActive: true,
        updatedBy: actorName,
      });

      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: `Added configurable eligibility category "${critName.trim()}" (Max Award KSh ${critMaxAward.toLocaleString()}).`,
        targetCollection: 'eligibility_criteria',
        targetRecordId: criteriaId,
        previousValueSummary: 'None',
        newValueSummary: `${critName.trim()} (${critPriority} Priority)`,
      });

      setCritName('');
      setCritCode('');
      setCritDesc('');
      onFeedback(`Added eligibility criterion "${critName.trim()}".`);
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Failed to save criterion.', true);
    }
  };

  // =========================================================================
  // RENDER: STUDENTS / APPLICATIONS / AWARDS
  // =========================================================================
  if (
    activeSection === 'students' ||
    activeSection === 'applications' ||
    activeSection === 'awards'
  ) {
    const categories = Array.from(new Set(applications.map((a) => a.eligibilityCategory)));

    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-display font-semibold text-neutral-900">
                {activeSection === 'students'
                  ? 'Registered Student Applicants Directory'
                  : activeSection === 'awards'
                  ? 'Bursary Awards & School Allocation Console'
                  : 'Bursary Applications Vetting & Approval Queue'}
              </h2>
              <p className="text-xs text-neutral-500">
                Search by student name, application number, school, admission ID, National ID/Birth
                Cert, status, or eligibility category
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-600 tabular-nums">
              {filteredApps.length} Records Matched
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Name, App No, ID, Adm No..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="ALL">All Application Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Awarded">Awarded</option>
              <option value="Allocated to School">Allocated to School</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="ALL">All Eligibility Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="ALL">All Schools / Institutions</option>
              {schools.map((s) => (
                <option key={s.schoolId} value={s.schoolId}>
                  {s.schoolName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Applications Data Table */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                    <th className="py-3 px-4">App No & Student</th>
                    <th className="py-3 px-4">School & Adm No</th>
                    <th className="py-3 px-4">Score & Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Award (KSh)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredApps.map((app) => {
                    const active = selectedApp?.applicationId === app.applicationId;
                    return (
                      <tr
                        key={app.applicationId}
                        onClick={() => handleSelectAppForReview(app)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-emerald-50/70' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-neutral-900 block">
                            {app.applicationId}
                          </span>
                          <span className="text-neutral-700 font-medium">{app.fullName}</span>
                          <span className="block text-[11px] text-neutral-500 font-mono">
                            ID/BC: {app.nationalIdOrBirthCert} · {app.subLocation}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-neutral-900 block">
                            {app.schoolName}
                          </span>
                          <span className="font-mono text-neutral-500 text-[11px]">
                            {app.admissionNumber} · {app.yearOfStudy}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-neutral-900 tabular-nums">
                            {app.eligibilityScore}/100
                          </span>
                          <span className="block text-[11px] text-neutral-500 line-clamp-1">
                            {app.householdSituation}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-[#0B4F32] block">{app.status}</span>
                          <span className="text-[11px] text-neutral-500">
                            Docs: {app.documentVerificationStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-neutral-900 tabular-nums">
                          {app.amountAwardedKsh.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAppForReview(app);
                            }}
                            className="px-2.5 py-1 bg-[#0B4F32] text-white rounded text-[11px] font-medium"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Inspector: Document Verification, Review & Award Allocation */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-5 space-y-5">
            {selectedApp ? (
              <>
                <div className="border-b border-neutral-200 pb-3 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono text-[#0B4F32] font-semibold">
                      {selectedApp.applicationId}
                    </span>
                    <h3 className="text-base font-semibold text-neutral-900">
                      {selectedApp.fullName}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {selectedApp.schoolName} · Adm: {selectedApp.admissionNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportAwardStatementPdf(selectedApp)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Award PDF</span>
                  </button>
                </div>

                {/* Private Household & Financial Details (Visible only to Staff/Admin) */}
                <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">National ID / Birth Cert:</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {selectedApp.nationalIdOrBirthCert}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Household Situation:</span>
                    <span className="font-semibold text-neutral-900">
                      {selectedApp.householdSituation}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Monthly Household Income:</span>
                    <span className="font-mono text-neutral-900 tabular-nums">
                      KSh {selectedApp.householdMonthlyIncomeKsh.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Fee Balance / Requested:</span>
                    <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                      Bal: KSh {selectedApp.feeBalanceKsh.toLocaleString()} / Req: KSh{' '}
                      {selectedApp.amountRequestedKsh.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 pt-1 border-t border-neutral-200">
                    <strong>Eligibility Engine Breakdown:</strong> {selectedApp.eligibilityBreakdown}
                  </p>
                  <p className="text-[11px] text-neutral-600">
                    <strong>Attached Documents:</strong> {selectedApp.documentsSummary}
                  </p>
                </div>

                {/* Vetting & Award Controls */}
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Document Verification Status
                      </label>
                      <select
                        value={docVerifyStatus}
                        onChange={(e) =>
                          setDocVerifyStatus(e.target.value as DocumentVerificationStatus)
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                      >
                        <option value="Pending Verification">Pending Verification</option>
                        <option value="Verified">Verified</option>
                        <option value="Requires Replacement">Requires Replacement</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Application Review Status
                      </label>
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value as ApplicationStatus)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Verification in Progress">Verification in Progress</option>
                        <option value="Documents Required">Documents Required</option>
                        <option value="Eligible">Eligible</option>
                        <option value="Not Eligible">Not Eligible</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Awarded">Awarded</option>
                        <option value="Allocated to School">Allocated to School</option>
                        <option value="Payment Processed">Payment Processed</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {!selectedApp.eligibilityQualified && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
                      <span className="font-semibold text-amber-950 block">
                        Authorized Eligibility Override (Mandatory Audit Trail)
                      </span>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Enter special committee justification for overriding eligibility..."
                        className="w-full px-3 py-1.5 border border-amber-300 rounded bg-white text-xs"
                      />
                    </div>
                  )}

                  {roleMode === 'admin' && (
                    <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-3">
                      <span className="font-semibold text-[#0B4F32] block">
                        Administrator Bursary Award & School Allocation
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-neutral-700 mb-1">
                            Approved Award Amount (KSh)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={awardAmount}
                            onChange={(e) => setAwardAmount(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-neutral-700 mb-1">
                            Payment / Allocation Status
                          </label>
                          <select
                            value={paymentStatus}
                            onChange={(e) =>
                              setPaymentStatus(e.target.value as PaymentAllocationStatus)
                            }
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                          >
                            <option value="Unallocated">Unallocated</option>
                            <option value="Allocated to School">Allocated to School</option>
                            <option value="Cheque Disbursed">Cheque Disbursed</option>
                            <option value="EFT Processed">EFT Processed</option>
                            <option value="Confirmed by School">Confirmed by School</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block font-medium text-neutral-700 mb-1">
                            Cheque / EFT Payment Reference Number
                          </label>
                          <input
                            type="text"
                            value={paymentRef}
                            onChange={(e) => setPaymentRef(e.target.value)}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Official Vetting / Committee Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={reviewerRemarks}
                      onChange={(e) => setReviewerRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApplyReviewOrAward(false)}
                      className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg cursor-pointer"
                    >
                      Save Verification & Review Status
                    </button>
                    {roleMode === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleApplyReviewOrAward(true)}
                        className="px-4 py-2 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
                      >
                        Record Bursary Award & School Allocation
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-500">
                Select a student application on the left to review documents or allocate bursary
                funds.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: CONFIGURABLE ELIGIBILITY CRITERIA MANAGEMENT (SECTION 4)
  // =========================================================================
  if (activeSection === 'criteria') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-neutral-900">
              Configured Bursary Eligibility Criteria
            </h2>
            <p className="text-xs text-neutral-500">
              Dynamic rules used by the Bursary Eligibility Engine without modifying source code
            </p>
          </div>

          <div className="divide-y divide-neutral-200">
            {criteriaList.map((crit) => (
              <div key={crit.criteriaId} className="py-4 first:pt-0 last:pb-0 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 text-sm">
                    {crit.categoryName} ({crit.categoryCode})
                  </span>
                  <span className="font-mono font-semibold text-[#0B4F32] tabular-nums">
                    Max Award: KSh {crit.maxAwardKsh.toLocaleString()}
                  </span>
                </div>
                <p className="text-neutral-600">{crit.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-neutral-500 font-mono tabular-nums pt-1">
                  <span>Max Weight: {crit.maxPoints} pts</span>
                  <span>·</span>
                  <span>Min Score: {crit.minAcademicScore}/100</span>
                  <span>·</span>
                  <span>Income Ceiling: KSh {crit.maxHouseholdIncomeKsh.toLocaleString()}/mo</span>
                  <span>·</span>
                  <span>Priority: {crit.priorityLevel}</span>
                </div>
                <p className="text-neutral-500">Required Docs: {crit.requiredDocuments}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-neutral-900">
            Add / Configure Vulnerability Category
          </h3>
          <form onSubmit={handleAddCriterion} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Category Title *</label>
              <input
                type="text"
                value={critName}
                onChange={(e) => setCritName(e.target.value)}
                placeholder="e.g. Category 6 — Child-Headed / Emergency Vulnerability"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Category Code *</label>
                <input
                  type="text"
                  value={critCode}
                  onChange={(e) => setCritCode(e.target.value)}
                  placeholder="EMERGENCY_VULN"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Priority Level</label>
                <select
                  value={critPriority}
                  onChange={(e) =>
                    setCritPriority(e.target.value as EligibilityCriteria['priorityLevel'])
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Standard">Standard</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Max Points</label>
                <input
                  type="number"
                  value={critMaxPoints}
                  onChange={(e) => setCritMaxPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Min Score</label>
                <input
                  type="number"
                  value={critMinScore}
                  onChange={(e) => setCritMinScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Max Award (KSh)</label>
                <input
                  type="number"
                  value={critMaxAward}
                  onChange={(e) => setCritMaxAward(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">
                Monthly Household Income Ceiling (KSh)
              </label>
              <input
                type="number"
                value={critMaxIncome}
                onChange={(e) => setCritMaxIncome(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Required Documents</label>
              <input
                type="text"
                value={critDocs}
                onChange={(e) => setCritDocs(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={critDesc}
                onChange={(e) => setCritDesc(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
            >
              Save Eligibility Criterion
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: SCHOOL MANAGEMENT MODULE (SECTION 8)
  // =========================================================================
  if (activeSection === 'schools') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-neutral-200">
            <h2 className="text-lg font-display font-semibold text-neutral-900">
              Registered Schools & Bursary Allocation Ledger
            </h2>
            <p className="text-xs text-neutral-500">
              Displays beneficiary counts, allocated funds, paid amounts, outstanding balances, and
              authorized bank disbursement channels
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <th className="py-3 px-4">School & Registration</th>
                  <th className="py-3 px-4">Principal & Contact</th>
                  <th className="py-3 px-4">Authorized Bank Account</th>
                  <th className="py-3 px-4 text-right">Beneficiaries</th>
                  <th className="py-3 px-4 text-right">Allocated / Paid (KSh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {schools.map((sch) => {
                  const out = Math.max(0, sch.totalAllocatedKsh - sch.totalPaidKsh);
                  return (
                    <tr key={sch.schoolId} className="hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-neutral-900 block">
                          {sch.schoolName}
                        </span>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {sch.registrationNumber} · {sch.schoolType} ({sch.category})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-neutral-800 block">{sch.principalName}</span>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {sch.contactPhone}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-neutral-800 block">
                          {sch.bankName} ({sch.bankBranch})
                        </span>
                        <span className="font-mono text-[11px] text-[#0B4F32]">
                          {roleMode === 'admin' ? sch.accountNumberMasked : 'Restricted to Admin'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                        {sch.beneficiaryCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        <span className="font-semibold text-neutral-900 block">
                          Alloc: {sch.totalAllocatedKsh.toLocaleString()}
                        </span>
                        <span className="text-[#0B4F32] block">
                          Paid: {sch.totalPaidKsh.toLocaleString()}
                        </span>
                        {out > 0 && (
                          <span className="text-amber-700 text-[11px] block">
                            Out: {out.toLocaleString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-neutral-900">
            Register New Beneficiary School
          </h3>
          <form onSubmit={handleAddSchool} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">School Name *</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Kapkoros Mixed Secondary School"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">MoE / CUE Reg No *</label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="MOE/SEC/29/0210"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Institution Type</label>
                <select
                  value={schoolType}
                  onChange={(e) =>
                    setSchoolType(e.target.value as SchoolRecord['schoolType'])
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="Secondary">Secondary</option>
                  <option value="TVET">TVET</option>
                  <option value="University">University</option>
                  <option value="College">College</option>
                  <option value="Special School">Special School</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Category</label>
                <select
                  value={schoolCategory}
                  onChange={(e) =>
                    setSchoolCategory(e.target.value as SchoolRecord['category'])
                  }
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="National">National</option>
                  <option value="Extra-County">Extra-County</option>
                  <option value="County">County</option>
                  <option value="Sub-County">Sub-County</option>
                  <option value="Public University">Public University</option>
                  <option value="Public TVET">Public TVET</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Principal / Head</label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  placeholder="Mr. / Mrs. ..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Bank & Branch</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg"
                />
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">
                Masked Account Reference
              </label>
              <input
                type="text"
                value={accountMasked}
                onChange={(e) => setAccountMasked(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
            >
              Register Institution
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: DOCUMENTS VERIFICATION QUEUE (SECTION 9)
  // =========================================================================
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold text-neutral-900">
          Student Supporting Documents Verification Center
        </h2>
        <p className="text-xs text-neutral-500">
          Verify uploaded Birth Certificates, National IDs, School IDs, Fee Structures, and Chief
          letters. Strictly restricted to authorized CDF Staff & Administrators.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="py-10 text-center text-xs text-neutral-500 border border-neutral-200 rounded-lg bg-[#F8FAF9]">
          No individual document uploads queued yet. Students can upload PDF, JPG, or PNG documents
          from the Student Portal.
        </div>
      ) : (
        <div className="divide-y divide-neutral-200">
          {documents.map((docItem) => (
            <div
              key={docItem.docId}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[#0B4F32]">
                    {docItem.applicationId}
                  </span>
                  <span>·</span>
                  <span className="font-semibold text-neutral-900">{docItem.documentType}</span>
                  <span>·</span>
                  <span className="font-mono text-neutral-500">{docItem.fileName}</span>
                </div>
                <p className="text-neutral-500 mt-1">
                  Format: {docItem.mimeType} · {(docItem.fileSizeBytes / 1024).toFixed(1)} KB ·
                  Current Status: <strong>{docItem.verificationStatus}</strong> · Notes:{' '}
                  {docItem.verifierNotes}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {(['Verified', 'Requires Replacement', 'Rejected'] as const).map((statusChoice) => (
                  <button
                    key={statusChoice}
                    type="button"
                    onClick={async () => {
                      try {
                        await verifyStudentDocumentStatus(
                          docItem,
                          statusChoice,
                          `Document marked "${statusChoice}" by ${actorName}.`,
                          actorName
                        );
                        await logAuditAction({
                          actorName,
                          actorRole: roleMode,
                          action: `Updated document ${docItem.docId} (${docItem.documentType}) verification status to ${statusChoice}.`,
                          targetCollection: 'application_documents',
                          targetRecordId: docItem.docId,
                          previousValueSummary: docItem.verificationStatus,
                          newValueSummary: statusChoice,
                        });
                        onFeedback(
                          `Document "${docItem.fileName}" marked as ${statusChoice}.`
                        );
                      } catch (err) {
                        onFeedback(
                          err instanceof Error ? err.message : 'Failed to verify document.',
                          true
                        );
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                      statusChoice === 'Verified'
                        ? 'bg-[#0B4F32] text-white'
                        : statusChoice === 'Requires Replacement'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-red-100 text-red-900'
                    }`}
                  >
                    Mark {statusChoice}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
