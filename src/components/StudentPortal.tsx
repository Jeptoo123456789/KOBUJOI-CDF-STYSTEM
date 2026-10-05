import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  BursaryApplication,
  ApplicationDocument,
  SchoolRecord,
  EligibilityCriteria,
  NotificationRecord,
  VALIDATION_LIMITS,
  sanitizeId,
  sanitizeString,
} from '../types/cdf.ts';
import { KOBUJOI_LOCATIONS } from '../data/seedData.ts';
import { evaluateBursaryEligibility } from '../services/eligibilityEngine.ts';
import {
  submitOrUpdateBursaryApplication,
  uploadStudentDocument,
  createSystemNotification,
  markNotificationAsRead,
  saveUserProfile,
  logAuditAction,
} from '../services/cdfFirestoreService.ts';
import { exportAwardStatementPdf } from '../services/reportExporter.ts';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Bell,
  UserCheck,
  ShieldCheck,
  Clock,
  Send,
  Save,
  Eye,
} from 'lucide-react';

interface StudentPortalProps {
  currentUser: {
    uid: string;
    email: string;
    displayName: string;
  } | null;
  userProfile: UserProfile | null;
  onRequireSignIn: () => void;
  applications: BursaryApplication[];
  documents: ApplicationDocument[];
  schools: SchoolRecord[];
  criteriaList: EligibilityCriteria[];
  notifications: NotificationRecord[];
  isAdminUser: boolean;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  userProfile,
  onRequireSignIn,
  applications,
  documents,
  schools,
  criteriaList,
  notifications,
  isAdminUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'dashboard' | 'apply' | 'documents' | 'notifications' | 'profile'
  >('dashboard');

  // Identify student's own applications, or allow inspecting demo student application if admin/demo testing
  const myApplications = useMemo(() => {
    if (!currentUser) return [];
    const owned = applications.filter((a) => a.applicantUid === currentUser.uid);
    if (owned.length > 0) return owned;
    return applications;
  }, [applications, currentUser]);

  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const currentApp = useMemo(() => {
    if (!currentUser) return null;
    const directOwned = applications.find((a) => a.applicantUid === currentUser.uid);
    if (selectedAppId) {
      return applications.find((a) => a.applicationId === selectedAppId) || directOwned || applications[0] || null;
    }
    return directOwned || applications[0] || null;
  }, [applications, currentUser, selectedAppId]);

  const existingOwnedApp = useMemo(
    () => (currentUser ? applications.find((a) => a.applicantUid === currentUser.uid) : undefined),
    [applications, currentUser]
  );

  // Form State for Student Registration & Bursary Application
  const [fullName, setFullName] = useState(
    existingOwnedApp?.fullName || userProfile?.fullName || currentUser?.displayName || ''
  );
  const [dateOfBirth, setDateOfBirth] = useState(existingOwnedApp?.dateOfBirth || '2006-05-14');
  const [gender, setGender] = useState(existingOwnedApp?.gender || 'Female');
  const [phone, setPhone] = useState(
    existingOwnedApp?.phone || userProfile?.phone || '+254 712 000 000'
  );
  const [nationalIdOrBirthCert, setNationalIdOrBirthCert] = useState(
    existingOwnedApp?.nationalIdOrBirthCert || 'BC-20269182'
  );
  const [ward, setWard] = useState(existingOwnedApp?.ward || 'Kobujoi');
  const [location, setLocation] = useState(
    existingOwnedApp?.location || KOBUJOI_LOCATIONS[0].location
  );
  const [subLocation, setSubLocation] = useState(
    existingOwnedApp?.subLocation || KOBUJOI_LOCATIONS[0].subLocations[0]
  );

  const [selectedSchoolId, setSelectedSchoolId] = useState(
    existingOwnedApp?.schoolId || schools[0]?.schoolId || 'sch-kobujoi-boys'
  );
  const [admissionNumber, setAdmissionNumber] = useState(
    existingOwnedApp?.admissionNumber || 'ADM/2025/1049'
  );
  const [yearOfStudy, setYearOfStudy] = useState(existingOwnedApp?.yearOfStudy || 'Form 3');
  const [academicYear, setAcademicYear] = useState(existingOwnedApp?.academicYear || '2025/2026');
  const [term, setTerm] = useState(existingOwnedApp?.term || 'Term 2');
  const [previousPerformance, setPreviousPerformance] = useState(
    existingOwnedApp?.previousPerformance || 'Excellent (A to B+)'
  );

  const [householdSituation, setHouseholdSituation] = useState(
    existingOwnedApp?.householdSituation || 'Total Orphan'
  );
  const [fatherEmploymentStatus, setFatherEmploymentStatus] = useState(
    existingOwnedApp?.fatherEmploymentStatus || 'Deceased'
  );
  const [motherEmploymentStatus, setMotherEmploymentStatus] = useState(
    existingOwnedApp?.motherEmploymentStatus || 'Unemployed / Peasant Farmer'
  );
  const [householdMonthlyIncomeKsh, setHouseholdMonthlyIncomeKsh] = useState<number>(
    existingOwnedApp?.householdMonthlyIncomeKsh ?? 6500
  );
  const [incomeSourceDescription, setIncomeSourceDescription] = useState(
    existingOwnedApp?.incomeSourceDescription ||
      'Smallholder subsistence farming in Kobujoi Ward with no formal salaried income.'
  );
  const [feeBalanceKsh, setFeeBalanceKsh] = useState<number>(
    existingOwnedApp?.feeBalanceKsh ?? 32000
  );
  const [amountRequestedKsh, setAmountRequestedKsh] = useState<number>(
    existingOwnedApp?.amountRequestedKsh ?? 25000
  );

  // Document Upload Form State
  const [docType, setDocType] = useState('Birth Certificate / National ID');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Application Submission Feedback
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Update Feedback
  const [profileName, setProfileName] = useState(
    userProfile?.fullName || currentUser?.displayName || ''
  );
  const [profilePhone, setProfilePhone] = useState(userProfile?.phone || '+254 712 345 678');
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  const selectedSchoolObj = useMemo(
    () => schools.find((s) => s.schoolId === selectedSchoolId) || schools[0],
    [schools, selectedSchoolId]
  );

  const myDocuments = useMemo(() => {
    if (!currentApp) return [];
    return documents.filter(
      (d) =>
        d.applicationId === currentApp.applicationId ||
        (currentUser && d.applicantUid === currentUser.uid)
    );
  }, [documents, currentApp, currentUser]);

  // Live Configurable Eligibility Assessment Calculation
  const liveAssessment = useMemo(() => {
    return evaluateBursaryEligibility(
      {
        ward,
        householdSituation,
        fatherEmploymentStatus,
        motherEmploymentStatus,
        householdMonthlyIncomeKsh,
        previousPerformance,
        feeBalanceKsh,
        amountRequestedKsh,
        schoolType: selectedSchoolObj?.schoolType || 'Secondary',
        hasUploadedDocuments: myDocuments.length > 0,
      },
      criteriaList
    );
  }, [
    ward,
    householdSituation,
    fatherEmploymentStatus,
    motherEmploymentStatus,
    householdMonthlyIncomeKsh,
    previousPerformance,
    feeBalanceKsh,
    amountRequestedKsh,
    selectedSchoolObj,
    myDocuments.length,
    criteriaList,
  ]);

  const availableSubLocations = useMemo(() => {
    const found = KOBUJOI_LOCATIONS.find((l) => l.location === location);
    return found ? found.subLocations : KOBUJOI_LOCATIONS[0].subLocations;
  }, [location]);

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-5">
          <p className="text-xs font-mono text-[#0B4F32]">
            KOBUJOI WARD NG-CDF · STUDENT & APPLICANT PORTAL
          </p>
          <h2 className="text-2xl font-display font-semibold text-neutral-900">
            Sign In to Apply for a Bursary or Track Your Allocation
          </h2>
          <p className="text-sm text-neutral-600 max-w-xl mx-auto leading-relaxed">
            To protect your personal information, National ID / Birth Certificate numbers, household
            vulnerability records, and uploaded school documents, authentication is required.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onRequireSignIn}
              className="px-6 py-3 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Sign In with Google Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveOrSubmitApplication = async (targetStatus: 'Draft' | 'Submitted') => {
    setFormFeedback(null);

    if (!fullName.trim() || !admissionNumber.trim() || !nationalIdOrBirthCert.trim()) {
      setFormFeedback({
        type: 'error',
        message:
          'Please complete all required personal and educational fields (Full Name, Birth Certificate / ID No, and School Admission Number).',
      });
      return;
    }

    if (feeBalanceKsh <= 0 || amountRequestedKsh <= 0) {
      setFormFeedback({
        type: 'error',
        message: 'Fee Balance and Amount Requested must be greater than KSh 0.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const appId =
        existingOwnedApp?.applicationId ||
        sanitizeId(`KBG-BURS-2026-${String(applications.length + 101).padStart(6, '0')}`);

      const docSummaryText =
        myDocuments.length > 0
          ? myDocuments.map((d) => `${d.documentType} (${d.verificationStatus})`).join(', ')
          : 'Awaiting Supporting Document Uploads';

      await submitOrUpdateBursaryApplication(
        {
          applicationId: appId,
          applicantUid: currentUser.uid,
          fullName: fullName.trim(),
          dateOfBirth,
          gender,
          phone: phone.trim(),
          email: currentUser.email,
          nationalIdOrBirthCert: nationalIdOrBirthCert.trim(),
          ward,
          location,
          subLocation,
          schoolId: selectedSchoolObj?.schoolId || 'sch-kobujoi-boys',
          schoolName: selectedSchoolObj?.schoolName || 'Kobujoi Boys High School',
          schoolType: selectedSchoolObj?.schoolType || 'Secondary',
          schoolCategory: selectedSchoolObj?.category || 'Extra-County',
          admissionNumber: admissionNumber.trim(),
          yearOfStudy,
          academicYear,
          term,
          previousPerformance,
          householdSituation,
          fatherEmploymentStatus,
          motherEmploymentStatus,
          householdMonthlyIncomeKsh,
          incomeSourceDescription,
          amountRequestedKsh,
          feeBalanceKsh,
          documentsSummary: docSummaryText,
          documentVerificationStatus:
            existingOwnedApp?.documentVerificationStatus || 'Pending Verification',
          eligibilityScore: liveAssessment.score,
          eligibilityCategory: liveAssessment.category,
          eligibilityQualified: liveAssessment.qualified,
          eligibilityBreakdown: liveAssessment.breakdown,
          status: targetStatus,
          amountAwardedKsh: existingOwnedApp?.amountAwardedKsh || 0,
          paymentReference: existingOwnedApp?.paymentReference || '',
          paymentStatus: existingOwnedApp?.paymentStatus || 'Unallocated',
          reviewerRemarks:
            existingOwnedApp?.reviewerRemarks ||
            'Pre-assessed automatically by Configurable Eligibility Engine. Awaiting CDF Staff verification.',
          reviewedBy: existingOwnedApp?.reviewedBy || 'Pending Staff Vetting',
          isDemo: false,
        },
        existingOwnedApp
      );

      if (targetStatus === 'Submitted') {
        await createSystemNotification({
          recipientUid: currentUser.uid,
          title: `Application ${appId} Submitted`,
          message: `Your Kobujoi CDF bursary application (${appId}) for ${
            selectedSchoolObj?.schoolName || 'your institution'
          } has been submitted. Pre-assessment score: ${liveAssessment.score}/100 (${
            liveAssessment.qualified ? 'Eligible' : 'Requires Review'
          }).`,
          type: 'Application Submitted',
          relatedRecordId: appId,
        });

        await logAuditAction({
          actorName: fullName.trim(),
          actorRole: 'student',
          action: `Student submitted bursary application ${appId} for ${selectedSchoolObj?.schoolName}.`,
          targetCollection: 'bursary_applications',
          targetRecordId: appId,
          previousValueSummary: existingOwnedApp?.status || 'New Application',
          newValueSummary: `Status: Submitted · Score: ${liveAssessment.score}/100`,
        });
      }

      setSelectedAppId(appId);
      setFormFeedback({
        type: 'success',
        message:
          targetStatus === 'Submitted'
            ? `Application ${appId} successfully submitted! Pre-assessment score: ${liveAssessment.score}/100 (${liveAssessment.category}).`
            : `Draft application ${appId} saved.`,
      });
    } catch (err) {
      setFormFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? `Submission error: ${err.message}`
            : 'Unable to save application. Ensure your application is not already locked/awarded.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF, JPG/JPEG, PNG)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        `Unsupported file format (${file.type || 'unknown'}). Please upload PDF, JPG/JPEG, or PNG files only.`
      );
      e.target.value = '';
      return;
    }

    // Validate file size (<= 5MB)
    if (file.size > VALIDATION_LIMITS.MAX_UPLOAD_BYTES) {
      setUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed 5.00 MB limit.`
      );
      e.target.value = '';
      return;
    }

    // Ensure the student has an application record in Firestore first (as required by firestore.rules exists() check)
    let targetAppId = existingOwnedApp?.applicationId;
    setIsUploading(true);

    try {
      if (!targetAppId) {
        targetAppId = sanitizeId(
          `KBG-BURS-2026-${String(applications.length + 101).padStart(6, '0')}`
        );
        await submitOrUpdateBursaryApplication({
          applicationId: targetAppId,
          applicantUid: currentUser.uid,
          fullName: fullName.trim() || currentUser.displayName || 'Kobujoi Applicant',
          dateOfBirth,
          gender,
          phone: phone.trim(),
          email: currentUser.email,
          nationalIdOrBirthCert: nationalIdOrBirthCert.trim(),
          ward,
          location,
          subLocation,
          schoolId: selectedSchoolObj?.schoolId || 'sch-kobujoi-boys',
          schoolName: selectedSchoolObj?.schoolName || 'Kobujoi Boys High School',
          schoolType: selectedSchoolObj?.schoolType || 'Secondary',
          schoolCategory: selectedSchoolObj?.category || 'Extra-County',
          admissionNumber: admissionNumber.trim(),
          yearOfStudy,
          academicYear,
          term,
          previousPerformance,
          householdSituation,
          fatherEmploymentStatus,
          motherEmploymentStatus,
          householdMonthlyIncomeKsh,
          incomeSourceDescription,
          amountRequestedKsh,
          feeBalanceKsh,
          documentsSummary: `${docType} (Pending Verification)`,
          documentVerificationStatus: 'Pending Verification',
          eligibilityScore: liveAssessment.score,
          eligibilityCategory: liveAssessment.category,
          eligibilityQualified: liveAssessment.qualified,
          eligibilityBreakdown: liveAssessment.breakdown,
          status: 'Draft',
          amountAwardedKsh: 0,
          paymentReference: '',
          paymentStatus: 'Unallocated',
          reviewerRemarks: 'Application initialized with supporting document upload.',
          reviewedBy: 'Pending Staff Vetting',
          isDemo: false,
        });
      }

      // Read file into safe preview dataURL (truncated/bounded to <180KB for Firestore safety)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const safePreview =
        dataUrl.length <= VALIDATION_LIMITS.DOC_PREVIEW_MAX_LEN
          ? dataUrl
          : `data:${file.type};name=${encodeURIComponent(file.name)};size=${file.size}`;

      const docId = sanitizeId(`doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      await uploadStudentDocument({
        docId,
        applicationId: targetAppId,
        applicantUid: currentUser.uid,
        documentType: docType,
        fileName: sanitizeString(file.name, 160),
        mimeType: file.type as 'application/pdf' | 'image/jpeg' | 'image/png',
        fileSizeBytes: file.size,
        dataUrlPreview: safePreview,
        verificationStatus: 'Pending Verification',
        verifierNotes: 'Uploaded by student applicant; queued for CDF Bursary Officer verification.',
        verifiedBy: 'Pending Verification',
      });

      setUploadSuccess(
        `Successfully uploaded "${file.name}" (${(file.size / 1024).toFixed(1)} KB) under ${docType}.`
      );
      e.target.value = '';
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload supporting document.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdatePersonalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    try {
      await saveUserProfile(
        {
          uid: currentUser.uid,
          email: currentUser.email,
          fullName: profileName,
          role: userProfile?.role || 'student',
          department: userProfile?.department || 'Kobujoi Ward',
          phone: profilePhone,
        },
        !userProfile
      );
      setFullName(profileName);
      setPhone(profilePhone);
      setProfileFeedback('Personal contact profile updated in database.');
    } catch (err) {
      setProfileFeedback(
        err instanceof Error ? err.message : 'Unable to update personal profile.'
      );
    }
  };

  const myNotifications = notifications.filter(
    (n) => n.recipientUid === currentUser.uid || n.recipientUid === 'ALL_STUDENTS'
  );

  const workflowStages = [
    { label: 'Registration & Profile', done: true },
    { label: 'Bursary Application', done: Boolean(currentApp) },
    { label: 'Document Upload', done: Boolean(currentApp && currentApp.documentsSummary) },
    { label: 'Eligibility Pre-Assessment', done: Boolean(currentApp) },
    {
      label: 'Staff Document Verification',
      done: currentApp?.documentVerificationStatus === 'Verified',
    },
    {
      label: 'Committee Approval',
      done: Boolean(
        currentApp &&
          ['Approved', 'Awarded', 'Allocated to School', 'Payment Processed', 'Completed'].includes(
            currentApp.status
          )
      ),
    },
    {
      label: 'Bursary Award & School Allocation',
      done: Boolean(currentApp && currentApp.amountAwardedKsh > 0),
    },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Student Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <p className="text-xs text-neutral-500 font-mono">
            STUDENT & APPLICANT PORTAL · {currentUser.email}
          </p>
          <h1 className="text-2xl font-display font-semibold text-neutral-900 mt-0.5">
            Kobujoi CDF Student Bursary Workspace
          </h1>
        </div>

        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Bursary Status & Award
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('apply')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'apply'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Application Form & Pre-Assessment
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('documents')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'documents'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Supporting Documents ({myDocuments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('notifications')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'notifications'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Notifications ({myNotifications.filter((n) => !n.isRead).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('profile')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSubTab === 'profile'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Personal Profile
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: STUDENT DASHBOARD & BURSARY AWARD STATUS
      ===================================================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Application Switcher if multiple applications exist in view */}
          {myApplications.length > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-neutral-200 rounded-xl p-4">
              <span className="text-xs font-medium text-neutral-700">
                Select Application Record to Inspect:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {myApplications.map((app) => (
                  <button
                    key={app.applicationId}
                    type="button"
                    onClick={() => setSelectedAppId(app.applicationId)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                      currentApp?.applicationId === app.applicationId
                        ? 'bg-[#0B4F32] text-white border-[#0B4F32]'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {app.applicationId} ({app.fullName})
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentApp ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Official BURSARY STATUS Card (Section 7 Requirement) */}
              <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
                  <div>
                    <p className="text-xs font-mono text-[#0B4F32] font-semibold">
                      BURSARY STATUS & SCHOOL ALLOCATION RECORD
                    </p>
                    <h2 className="text-xl font-display font-semibold text-neutral-900 mt-1">
                      {currentApp.fullName}
                    </h2>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-neutral-500 block">Application Status</span>
                    <span className="text-sm font-semibold text-[#0B4F32]">
                      {currentApp.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">Student Name</span>
                    <span className="text-sm font-semibold text-neutral-900 mt-0.5 block">
                      {currentApp.fullName}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">Application Number</span>
                    <span className="text-sm font-mono font-semibold text-neutral-900 mt-0.5 block">
                      {currentApp.applicationId}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">Allocated School / Institution</span>
                    <span className="text-sm font-semibold text-neutral-900 mt-0.5 block">
                      {currentApp.schoolName}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Adm No: {currentApp.admissionNumber} · {currentApp.yearOfStudy}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">Academic Year & Term</span>
                    <span className="text-sm font-mono font-semibold text-neutral-900 mt-0.5 block">
                      {currentApp.academicYear} ({currentApp.term})
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">Eligibility Category & Qualification</span>
                    <span className="text-sm font-semibold text-neutral-900 mt-0.5 block">
                      {currentApp.eligibilityCategory}
                    </span>
                    <span className="text-[11px] font-mono text-[#0B4F32]">
                      {currentApp.eligibilityQualified ? 'QUALIFIES' : 'DOES NOT QUALIFY'} · Score:{' '}
                      {currentApp.eligibilityScore}/100
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">Amount Awarded</span>
                    <span className="text-lg font-mono font-bold text-[#0B4F32] tabular-nums mt-0.5 block">
                      KSh {currentApp.amountAwardedKsh.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      Requested: KSh {currentApp.amountRequestedKsh.toLocaleString()} · Fee Bal: KSh{' '}
                      {currentApp.feeBalanceKsh.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">Award Status</span>
                    <span className="text-sm font-semibold text-neutral-900 mt-0.5 block">
                      {currentApp.status}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                    <span className="text-neutral-500 block">School Allocation / Payment Status</span>
                    <span className="text-sm font-semibold text-neutral-900 mt-0.5 block">
                      {currentApp.paymentStatus}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      Ref: {currentApp.paymentReference || 'Awaiting Treasury Batch'}
                    </span>
                  </div>
                </div>

                {/* Qualification / Non-Qualification Reason & Committee Remarks */}
                <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-xs">
                  <div className="font-semibold text-neutral-900">
                    Eligibility Assessment & Qualification Reason:
                  </div>
                  <p className="text-neutral-700 leading-relaxed">
                    {currentApp.eligibilityBreakdown}
                  </p>
                  <div className="pt-2 border-t border-neutral-200">
                    <span className="font-semibold text-neutral-900">Official Reviewer Remarks: </span>
                    <span className="text-neutral-700">{currentApp.reviewerRemarks}</span>
                  </div>
                </div>

                {/* Printable / Downloadable Bursary Award Statement Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-2 no-print">
                  <button
                    type="button"
                    onClick={() => exportAwardStatementPdf(currentApp)}
                    className="px-4 py-2.5 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Award Statement (PDF)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Statement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('apply')}
                    className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Update Application / New Intake
                  </button>
                </div>
              </div>

              {/* Right Column: Workflow Progress & Required Documents Checklist */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
                  <h3 className="text-base font-semibold text-neutral-900">
                    Application Processing Workflow
                  </h3>
                  <div className="space-y-3">
                    {workflowStages.map((st, idx) => (
                      <div key={st.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${
                              st.done
                                ? 'bg-[#0B4F32] text-white'
                                : 'bg-neutral-100 text-neutral-500 border border-neutral-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span
                            className={
                              st.done ? 'font-medium text-neutral-900' : 'text-neutral-500'
                            }
                          >
                            {st.label}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {st.done ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-neutral-900">
                      Supporting Documents Status
                    </h3>
                    <span className="text-xs font-mono text-[#0B4F32]">
                      {currentApp.documentVerificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {currentApp.documentsSummary}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('documents')}
                    className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Manage / Upload Supporting Documents
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900">
                No Active Bursary Application Found
              </h3>
              <p className="text-xs text-neutral-600 max-w-md mx-auto">
                Complete your student registration and submit your FY 2025/2026 Kobujoi Ward NG-CDF
                bursary application now.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab('apply')}
                className="px-5 py-2.5 bg-[#0B4F32] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Start Bursary Application
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: STUDENT REGISTRATION & BURSARY APPLICATION FORM
      ===================================================================== */}
      {activeSubTab === 'apply' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 space-y-8">
            <div className="border-b border-neutral-200 pb-4">
              <p className="text-xs font-mono text-[#0B4F32]">
                OFFICIAL DIGITAL BURSARY INTAKE · FY 2025/2026
              </p>
              <h2 className="text-xl font-display font-semibold text-neutral-900 mt-1">
                Student Registration & Bursary Application Form
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                All personal and household vulnerability information is encrypted in transit and
                strictly isolated from public pages.
              </p>
            </div>

            {formFeedback && (
              <div
                className={`p-4 rounded-xl border text-xs ${
                  formFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {formFeedback.message}
              </div>
            )}

            {/* SECTION 1: PERSONAL INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-200 pb-2">
                1. Personal & Residency Information (Kobujoi Ward, Aldai Constituency)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Student Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    placeholder="e.g. Kelvin Kipchirchir Lagat"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    National ID or Birth Certificate Entry No. *
                  </label>
                  <input
                    type="text"
                    value={nationalIdOrBirthCert}
                    onChange={(e) => setNationalIdOrBirthCert(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                    placeholder="e.g. BC-049281729 or ID-41092834"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Ward (Nandi County, Aldai Constituency) *
                  </label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Location *</label>
                  <select
                    value={location}
                    onChange={(e) => {
                      const newLoc = e.target.value;
                      setLocation(newLoc);
                      const found = KOBUJOI_LOCATIONS.find((l) => l.location === newLoc);
                      if (found) setSubLocation(found.subLocations[0]);
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    {KOBUJOI_LOCATIONS.map((l) => (
                      <option key={l.location} value={l.location}>
                        {l.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Sub-Location *</label>
                  <select
                    value={subLocation}
                    onChange={(e) => setSubLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    {availableSubLocations.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: EDUCATION INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-200 pb-2">
                2. Education & School Fee Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-neutral-700 mb-1">
                    Select Registered School / Institution *
                  </label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    {schools.map((s) => (
                      <option key={s.schoolId} value={s.schoolId}>
                        {s.schoolName} ({s.schoolType} — {s.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Admission / Registration Number *
                  </label>
                  <input
                    type="text"
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                    placeholder="e.g. KBHS/2023/4182"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Form / Class / Course & Year of Study *
                  </label>
                  <input
                    type="text"
                    value={yearOfStudy}
                    onChange={(e) => setYearOfStudy(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                    placeholder="e.g. Form 3 or Year 2 Semester 1"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Academic Year & Term/Semester *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                    />
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value)}
                      className="px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    >
                      <option value="Term 1">Term 1</option>
                      <option value="Term 2">Term 2</option>
                      <option value="Term 3">Term 3</option>
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Previous Academic Performance *
                  </label>
                  <select
                    value={previousPerformance}
                    onChange={(e) => setPreviousPerformance(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Excellent (A to B+)">Excellent (A to B+ / First Class)</option>
                    <option value="Good (B to C+)">Good (B to C+ / Second Class Upper)</option>
                    <option value="Average (C to D+)">Average (C to D+ / Second Class Lower)</option>
                    <option value="Pass / Continuing">Pass / Continuing Student</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Current Verified Fee Balance (KSh) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={feeBalanceKsh}
                    onChange={(e) => setFeeBalanceKsh(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Bursary Amount Requested (KSh) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={amountRequestedKsh}
                    onChange={(e) => setAmountRequestedKsh(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: FAMILY & HOUSEHOLD VULNERABILITY INFORMATION */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-900 border-b border-neutral-200 pb-2">
                3. Family & Socio-Economic Vulnerability Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-neutral-700 mb-1">
                    Primary Household Situation *
                  </label>
                  <select
                    value={householdSituation}
                    onChange={(e) => setHouseholdSituation(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Total Orphan">Total Orphan (Both Parents Deceased)</option>
                    <option value="Partial Orphan">Partial Orphan (One Parent Deceased)</option>
                    <option value="Single-Parent Household">Single-Parent Household</option>
                    <option value="Economically Vulnerable (Both Parents Alive)">
                      Both Parents Alive — Economically Vulnerable / Unemployed
                    </option>
                    <option value="Guardian-Supported">Guardian-Supported Household</option>
                    <option value="Special Needs / Disability">
                      Special Needs / Person with Disability (NCPWD)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Father&apos;s Employment / Status
                  </label>
                  <select
                    value={fatherEmploymentStatus}
                    onChange={(e) => setFatherEmploymentStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Deceased">Deceased</option>
                    <option value="Unemployed / Peasant Farmer">
                      Unemployed / Subsistence Farmer
                    </option>
                    <option value="Informal / Casual Labourer">Informal / Casual Labourer</option>
                    <option value="Formal Employment">Formal Salaried Employment</option>
                    <option value="Not Applicable / Absent">Not Applicable / Absent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Mother&apos;s Employment / Status
                  </label>
                  <select
                    value={motherEmploymentStatus}
                    onChange={(e) => setMotherEmploymentStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Deceased">Deceased</option>
                    <option value="Unemployed / Peasant Farmer">
                      Unemployed / Subsistence Farmer
                    </option>
                    <option value="Informal / Casual Labourer">Informal / Casual Labourer</option>
                    <option value="Formal Employment">Formal Salaried Employment</option>
                    <option value="Not Applicable / Absent">Not Applicable / Absent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Approximate Monthly Household Income (KSh) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={householdMonthlyIncomeKsh}
                    onChange={(e) => setHouseholdMonthlyIncomeKsh(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Household Income Sources & Dependents Summary
                  </label>
                  <input
                    type="text"
                    value={incomeSourceDescription}
                    onChange={(e) => setIncomeSourceDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSubmitApplication('Draft')}
                className="px-4 py-2.5 border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-medium rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save as Draft</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveOrSubmitApplication('Submitted')}
                className="px-5 py-2.5 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Submitting Application...' : 'Submit Bursary Application'}
                </span>
              </button>
            </div>
          </div>

          {/* Live Configurable Eligibility Pre-Assessment Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4 sticky top-20">
              <div className="border-b border-neutral-200 pb-3">
                <p className="text-xs font-mono text-[#0B4F32]">
                  LIVE BURSARY ELIGIBILITY ENGINE
                </p>
                <h3 className="text-base font-semibold text-neutral-900 mt-0.5">
                  Configurable Pre-Assessment Result
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAF9] border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-neutral-500 block">Composite Score</span>
                  <span className="text-2xl font-mono font-bold text-neutral-900 tabular-nums">
                    {liveAssessment.score} / 100
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-500 block">Pre-Assessment Status</span>
                  <span
                    className={`text-sm font-semibold ${
                      liveAssessment.qualified ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {liveAssessment.qualified ? 'QUALIFIES' : 'DOES NOT QUALIFY'}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-neutral-500 block">Matched Vulnerability Category:</span>
                <span className="font-semibold text-neutral-900 block">
                  {liveAssessment.category}
                </span>
                <span className="font-mono text-[#0B4F32] block">
                  Priority Level: {liveAssessment.priorityLevel} · Recommended Cap: KSh{' '}
                  {liveAssessment.recommendedAwardKsh.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-neutral-200">
                <span className="text-xs font-semibold text-neutral-800 block">
                  Point-by-Point Scoring Breakdown:
                </span>
                {liveAssessment.factors.map((f) => (
                  <div key={f.label} className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-700">{f.label}</span>
                      <span className="font-mono font-semibold tabular-nums">
                        +{f.points}/{f.maxPoints}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500">{f.reason}</p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-neutral-500 pt-3 border-t border-neutral-200 leading-relaxed">
                Note: Pre-assessment is advisory. Final bursary award requires CDF Staff document
                verification and Bursary Committee approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: STUDENT DOCUMENT UPLOAD & VERIFICATION TRACKER
      ===================================================================== */}
      {activeSubTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-lg font-display font-semibold text-neutral-900">
                Upload Supporting Documents
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Allowed formats: PDF, JPG/JPEG, PNG (Maximum 5.0 MB per file). Documents are
                strictly private and accessible only to you and authorized Kobujoi CDF officers.
              </p>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                {uploadSuccess}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1.5">
                  Select Document Category *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="Birth Certificate / National ID">
                    Birth Certificate / National ID
                  </option>
                  <option value="School Admission / ID Card">School Admission / ID Card</option>
                  <option value="Official Fee Structure / Balance">
                    Official Fee Structure / Balance Statement
                  </option>
                  <option value="Academic Results / Transcript">
                    Academic Results / Transcript
                  </option>
                  <option value="Parent / Guardian Death Certificate or Chief Letter">
                    Parent Death Certificate / Area Chief Verification Letter
                  </option>
                  <option value="Passport Photograph">Student Passport Photograph</option>
                  <option value="Other Vulnerability Evidence">
                    Other Vulnerability Evidence (e.g. NCPWD Card)
                  </option>
                </select>
              </div>

              <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center space-y-2 bg-[#F8FAF9]">
                <Upload className="w-6 h-6 text-[#0B4F32] mx-auto" />
                <p className="text-xs font-medium text-neutral-800">
                  Select PDF, JPG, or PNG file from your device
                </p>
                <p className="text-[11px] text-neutral-500">
                  Validated client-side and server-side against Firestore security rules
                </p>
                <div className="pt-2">
                  <label className="inline-block px-4 py-2 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-semibold rounded-lg cursor-pointer">
                    <span>{isUploading ? 'Uploading & Validating...' : 'Choose File to Upload'}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Uploaded Supporting Documents & Verification Status
            </h3>

            {myDocuments.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 border border-neutral-200 rounded-lg bg-[#F8FAF9]">
                No supporting documents uploaded yet for this session. Upload your Birth
                Certificate/ID and School Fee Statement on the left.
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {myDocuments.map((docItem) => (
                  <div
                    key={docItem.docId}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">
                          {docItem.documentType}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-neutral-500">{docItem.fileName}</span>
                      </div>
                      <p className="text-neutral-500 mt-1">
                        Size: {(docItem.fileSizeBytes / 1024).toFixed(1)} KB · Format:{' '}
                        {docItem.mimeType} · Notes: {docItem.verifierNotes}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-semibold ${
                          docItem.verificationStatus === 'Verified'
                            ? 'text-[#16A34A]'
                            : docItem.verificationStatus === 'Rejected' ||
                              docItem.verificationStatus === 'Requires Replacement'
                            ? 'text-[#DC2626]'
                            : 'text-[#D97706]'
                        }`}
                      >
                        {docItem.verificationStatus}
                      </span>
                      <span className="block text-[11px] text-neutral-400">
                        By: {docItem.verifiedBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: NOTIFICATIONS CENTER
      ===================================================================== */}
      {activeSubTab === 'notifications' && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-neutral-900">
            Student Notification Center
          </h2>
          {myNotifications.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">
              You have no notifications yet. Status updates for your bursary application will appear
              here automatically.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200">
              {myNotifications.map((n) => (
                <div
                  key={n.notificationId}
                  className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2 text-neutral-500">
                      <span className="font-semibold text-[#0B4F32]">{n.type}</span>
                      <span>·</span>
                      <span className="font-mono">Ref: {n.relatedRecordId}</span>
                      {!n.isRead && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-amber-700">UNREAD</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-neutral-900 mt-1">{n.title}</h4>
                    <p className="text-neutral-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationAsRead(n, isAdminUser)}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs shrink-0 cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 5: PERSONAL PROFILE
      ===================================================================== */}
      {activeSubTab === 'profile' && (
        <div className="max-w-xl bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-display font-semibold text-neutral-900">
              Update Permitted Personal Information
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Update your registered full name and phone number associated with your Kobujoi CDF
              account.
            </p>
          </div>

          {profileFeedback && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {profileFeedback}
            </div>
          )}

          <form onSubmit={handleUpdatePersonalProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Verified Email</label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-3 py-2 border border-neutral-200 bg-neutral-100 rounded-lg font-mono text-neutral-500"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
