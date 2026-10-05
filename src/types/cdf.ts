import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'staff' | 'admin';
export type PortalViewMode = 'public' | 'student' | 'staff' | 'admin';

export const VALIDATION_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  ID_MAX_LEN: 128,
  NAME_MAX_LEN: 120,
  EMAIL_MAX_LEN: 160,
  PHONE_MAX_LEN: 30,
  DESC_MAX_LEN: 1200,
  SUMMARY_MAX_LEN: 600,
  DOC_PREVIEW_MAX_LEN: 195000,
  MAX_UPLOAD_BYTES: 5 * 1024 * 1024, // 5MB
} as const;

export function sanitizeString(val: string, maxLength: number): string {
  return (val || '').trim().slice(0, maxLength);
}

export function sanitizeId(id: string): string {
  const cleaned = (id || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, VALIDATION_LIMITS.ID_MAX_LEN);
  return cleaned.length > 0 ? cleaned : `id-${Date.now()}`;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  phone: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StaffRecord {
  staffId: string;
  fullName: string;
  position: string;
  department: string;
  responsibilities: string;
  officialEmail: string;
  officialPhone: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  isPublic: boolean;
  isDemo: boolean;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface EligibilityCriteria {
  criteriaId: string;
  categoryName: string;
  categoryCode: string;
  description: string;
  maxPoints: number;
  minAcademicScore: number;
  maxHouseholdIncomeKsh: number;
  priorityLevel: 'Critical' | 'High' | 'Standard';
  requiredDocuments: string;
  maxAwardKsh: number;
  financialYear: string;
  isActive: boolean;
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SchoolRecord {
  schoolId: string;
  schoolName: string;
  registrationNumber: string;
  schoolType: 'Secondary' | 'University' | 'TVET' | 'College' | 'Special School';
  category: 'National' | 'Extra-County' | 'County' | 'Sub-County' | 'Public University' | 'Public TVET';
  location: string;
  contactPhone: string;
  contactEmail: string;
  principalName: string;
  bankName: string;
  bankBranch: string;
  accountNumberMasked: string;
  beneficiaryCount: number;
  totalAllocatedKsh: number;
  totalPaidKsh: number;
  isDemo: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Documents Required'
  | 'Verification in Progress'
  | 'Eligible'
  | 'Not Eligible'
  | 'Approved'
  | 'Rejected'
  | 'Awarded'
  | 'Allocated to School'
  | 'Payment Processed'
  | 'Completed';

export type DocumentVerificationStatus =
  | 'Pending Verification'
  | 'Verified'
  | 'Rejected'
  | 'Requires Replacement';

export type PaymentAllocationStatus =
  | 'Unallocated'
  | 'Allocated to School'
  | 'Cheque Disbursed'
  | 'EFT Processed'
  | 'Confirmed by School';

export interface BursaryApplication {
  applicationId: string;
  applicantUid: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string;
  nationalIdOrBirthCert: string;
  ward: string;
  location: string;
  subLocation: string;
  schoolId: string;
  schoolName: string;
  schoolType: string;
  schoolCategory: string;
  admissionNumber: string;
  yearOfStudy: string;
  academicYear: string;
  term: string;
  previousPerformance: string;
  householdSituation: string;
  fatherEmploymentStatus: string;
  motherEmploymentStatus: string;
  householdMonthlyIncomeKsh: number;
  incomeSourceDescription: string;
  amountRequestedKsh: number;
  feeBalanceKsh: number;
  documentsSummary: string;
  documentVerificationStatus: DocumentVerificationStatus;
  eligibilityScore: number;
  eligibilityCategory: string;
  eligibilityQualified: boolean;
  eligibilityBreakdown: string;
  status: ApplicationStatus;
  amountAwardedKsh: number;
  paymentReference: string;
  paymentStatus: PaymentAllocationStatus;
  reviewerRemarks: string;
  reviewedBy: string;
  isDemo: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ApplicationDocument {
  docId: string;
  applicationId: string;
  applicantUid: string;
  documentType: string;
  fileName: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  fileSizeBytes: number;
  dataUrlPreview: string;
  verificationStatus: DocumentVerificationStatus;
  verifierNotes: string;
  verifiedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ProjectCategory =
  | 'Education & Laboratories'
  | 'Water & Sanitation'
  | 'ICT & Youth Innovation'
  | 'Roads & Bridges'
  | 'Security & Administration'
  | 'Environment & Afforestation'
  | 'Sports & Arts';

export type ProjectStatus =
  | 'Proposed'
  | 'Approved'
  | 'Planning'
  | 'Procurement'
  | 'Ongoing'
  | 'Completed'
  | 'Suspended'
  | 'Cancelled';

export interface ProjectRecord {
  projectId: string;
  projectName: string;
  category: ProjectCategory;
  ward: string;
  location: string;
  subLocation: string;
  village: string;
  latitude: number;
  longitude: number;
  description: string;
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate: string;
  status: ProjectStatus;
  approvedBudgetKsh: number;
  contractAmountKsh: number;
  amountSpentKsh: number;
  fundingSource: string;
  financialYear: string;
  percentageCompleted: number;
  currentStage: string;
  milestonesSummary: string;
  challenges: string;
  remarks: string;
  primaryPhotoUrl: string;
  beforePhotoCaption: string;
  duringPhotoCaption: string;
  afterPhotoCaption: string;
  isPublic: boolean;
  isDemo: boolean;
  updatedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ProjectExpenditure {
  expenditureId: string;
  projectId: string;
  projectName: string;
  expenditureDate: string;
  description: string;
  amountKsh: number;
  category: string;
  paymentReference: string;
  authorizedBy: string;
  recordedBy: string;
  isPublic: boolean;
  isDemo: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ProjectPhoto {
  photoId: string;
  projectId: string;
  projectName: string;
  stage: 'Before' | 'During Construction' | 'Completed';
  caption: string;
  imageUrl: string;
  photographer: string;
  uploadDate: string;
  isPublic: boolean;
  uploadedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Announcement {
  announcementId: string;
  title: string;
  category: 'Bursary Intake' | 'Application Deadline' | 'Public Baraza / Meeting' | 'Project Handover' | 'Policy Notice';
  summary: string;
  content: string;
  effectiveDate: string;
  deadlineDate: string;
  isPublic: boolean;
  isPinned: boolean;
  isDemo: boolean;
  publishedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface NotificationRecord {
  notificationId: string;
  recipientUid: string;
  title: string;
  message: string;
  type: string;
  relatedRecordId: string;
  isRead: boolean;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AuditLog {
  logId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetCollection: string;
  targetRecordId: string;
  previousValueSummary: string;
  newValueSummary: string;
  createdAt?: Timestamp;
}
