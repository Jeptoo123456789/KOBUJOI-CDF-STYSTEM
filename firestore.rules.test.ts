/**
 * Phase 0 Security Test Specification for Kobujoi CDF Firestore Rules
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Privilege Escalation on User Profile Creation',
    operation: 'create',
    path: '/users/student_01',
    auth: { uid: 'student_01', email: 'student@example.com', email_verified: true },
    payload: {
      uid: 'student_01',
      email: 'student@example.com',
      fullName: 'Kiprop Bett',
      role: 'admin', // Illegal self-assigned admin role
      department: 'None',
      phone: '0712345678',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on Bursary Application',
    operation: 'create',
    path: '/bursary_applications/KBG-BURS-2026-000999',
    auth: { uid: 'student_01', email: 'student@example.com', email_verified: true },
    payload: {
      applicationId: 'KBG-BURS-2026-000999',
      applicantUid: 'student_01',
      isSecretAdminApproved: true, // Ghost field rejected by hasOnly
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-Awarded Bursary Amount by Student',
    operation: 'create',
    path: '/bursary_applications/KBG-BURS-2026-000998',
    auth: { uid: 'student_01', email: 'student@example.com', email_verified: true },
    payload: {
      applicationId: 'KBG-BURS-2026-000998',
      applicantUid: 'student_01',
      amountAwardedKsh: 45000,
      status: 'Awarded',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Horizontal PII Scraping of Another Student Application',
    operation: 'get',
    path: '/bursary_applications/KBG-BURS-2026-000001',
    auth: { uid: 'student_02', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Public Unauthenticated Access to Student Birth Certificate Document',
    operation: 'get',
    path: '/application_documents/doc_001',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Student Tampering with Terminal Awarded Application',
    operation: 'update',
    path: '/bursary_applications/KBG-BURS-2026-000001',
    auth: { uid: 'student_01', email: 'student@example.com', email_verified: true },
    payload: {
      feeBalanceKsh: 95000,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'ID Poisoning with Special Characters',
    operation: 'create',
    path: '/projects/bad$id!@#',
    auth: { uid: 'admin_01', email: 'thabitajeptoo004@gmail.com', email_verified: true },
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Spoofed Unverified Admin Email Attempting Project Expenditure Write',
    operation: 'create',
    path: '/project_expenditures/exp_spoof',
    auth: { uid: 'attacker_01', email: 'thabitajeptoo004@gmail.com', email_verified: false },
    payload: {
      expenditureId: 'exp_spoof',
      amountKsh: 1000000,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unauthorized Financial Expenditure Creation by Student',
    operation: 'create',
    path: '/project_expenditures/exp_student',
    auth: { uid: 'student_01', email: 'student@example.com', email_verified: true },
    payload: {
      expenditureId: 'exp_student',
      amountKsh: 250000,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Audit Log Deletion Attempt by Admin',
    operation: 'delete',
    path: '/audit_logs/log_001',
    auth: { uid: 'admin_01', email: 'thabitajeptoo004@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Forged Client Timestamp on Creation',
    operation: 'create',
    path: '/audit_logs/log_forged',
    auth: { uid: 'admin_01', email: 'thabitajeptoo004@gmail.com', email_verified: true },
    payload: {
      logId: 'log_forged',
      actorUid: 'admin_01',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Identity Spoofing on Application Submission',
    operation: 'create',
    path: '/bursary_applications/KBG-BURS-2026-000555',
    auth: { uid: 'student_01', email: 'student@example.com', email_verified: true },
    payload: {
      applicationId: 'KBG-BURS-2026-000555',
      applicantUid: 'victim_uid_999',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
