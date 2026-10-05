import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  UserProfile,
  StaffRecord,
  EligibilityCriteria,
  SchoolRecord,
  BursaryApplication,
  ApplicationDocument,
  ProjectRecord,
  ProjectExpenditure,
  ProjectPhoto,
  Announcement,
  NotificationRecord,
  AuditLog,
  sanitizeId,
  sanitizeString,
  VALIDATION_LIMITS,
} from '../types/cdf.ts';
import {
  INITIAL_ELIGIBILITY_CRITERIA,
  INITIAL_SCHOOLS,
  INITIAL_STAFF,
  INITIAL_PROJECTS,
  INITIAL_EXPENDITURES,
  INITIAL_PROJECT_PHOTOS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_DEMO_APPLICATIONS,
} from '../data/seedData.ts';

export async function logAuditAction(params: {
  actorName: string;
  actorRole: string;
  action: string;
  targetCollection: string;
  targetRecordId: string;
  previousValueSummary?: string;
  newValueSummary?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const logId = sanitizeId(`audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const path = `audit_logs/${logId}`;

  const payload = {
    logId,
    actorUid: sanitizeId(user.uid),
    actorName: sanitizeString(params.actorName || user.displayName || user.email || 'User', 120),
    actorRole: sanitizeString(params.actorRole || 'user', 30),
    action: sanitizeString(params.action, 300),
    targetCollection: sanitizeString(params.targetCollection, 60),
    targetRecordId: sanitizeString(params.targetRecordId, 128),
    previousValueSummary: sanitizeString(params.previousValueSummary || 'N/A', 400),
    newValueSummary: sanitizeString(params.newValueSummary || 'Recorded', 400),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'audit_logs', logId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createSystemNotification(params: {
  recipientUid: string;
  title: string;
  message: string;
  type: string;
  relatedRecordId: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const notificationId = sanitizeId(`notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const path = `notifications/${notificationId}`;

  const payload = {
    notificationId,
    recipientUid: sanitizeString(params.recipientUid, 128),
    title: sanitizeString(params.title, 140),
    message: sanitizeString(params.message, 500),
    type: sanitizeString(params.type, 60),
    relatedRecordId: sanitizeString(params.relatedRecordId, 128),
    isRead: false,
    createdBy: sanitizeId(user.uid),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'notifications', notificationId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationAsRead(
  notif: NotificationRecord,
  isAdminUser: boolean
): Promise<void> {
  const path = `notifications/${notif.notificationId}`;
  try {
    if (isAdminUser) {
      await setDoc(
        doc(db, 'notifications', notif.notificationId),
        {
          ...notif,
          isRead: true,
          createdAt: notif.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
    } else {
      await updateDoc(doc(db, 'notifications', notif.notificationId), {
        isRead: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveUserProfile(
  profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const uid = sanitizeId(profile.uid);
  const path = `users/${uid}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: sanitizeString(profile.email, VALIDATION_LIMITS.EMAIL_MAX_LEN),
        fullName: sanitizeString(profile.fullName || 'Kobujoi Resident', VALIDATION_LIMITS.NAME_MAX_LEN),
        role: profile.role,
        department: sanitizeString(profile.department || 'Kobujoi Ward', 80),
        phone: sanitizeString(profile.phone || '', VALIDATION_LIMITS.PHONE_MAX_LEN),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'users', uid), {
        fullName: sanitizeString(profile.fullName, VALIDATION_LIMITS.NAME_MAX_LEN),
        phone: sanitizeString(profile.phone, VALIDATION_LIMITS.PHONE_MAX_LEN),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function submitOrUpdateBursaryApplication(
  appData: Omit<BursaryApplication, 'createdAt' | 'updatedAt'>,
  existingApp?: BursaryApplication
): Promise<void> {
  const applicationId = sanitizeId(appData.applicationId);
  const path = `bursary_applications/${applicationId}`;

  const sanitized = {
    applicationId,
    applicantUid: sanitizeId(appData.applicantUid),
    fullName: sanitizeString(appData.fullName, 120),
    dateOfBirth: sanitizeString(appData.dateOfBirth, 20),
    gender: sanitizeString(appData.gender, 20),
    phone: sanitizeString(appData.phone, 30),
    email: sanitizeString(appData.email, 160),
    nationalIdOrBirthCert: sanitizeString(appData.nationalIdOrBirthCert, 60),
    ward: sanitizeString(appData.ward || 'Kobujoi', 60),
    location: sanitizeString(appData.location, 80),
    subLocation: sanitizeString(appData.subLocation, 80),
    schoolId: sanitizeString(appData.schoolId, 128),
    schoolName: sanitizeString(appData.schoolName, 160),
    schoolType: sanitizeString(appData.schoolType, 40),
    schoolCategory: sanitizeString(appData.schoolCategory, 40),
    admissionNumber: sanitizeString(appData.admissionNumber, 60),
    yearOfStudy: sanitizeString(appData.yearOfStudy, 40),
    academicYear: sanitizeString(appData.academicYear || '2025/2026', 20),
    term: sanitizeString(appData.term || 'Term 1', 30),
    previousPerformance: sanitizeString(appData.previousPerformance, 60),
    householdSituation: sanitizeString(appData.householdSituation, 80),
    fatherEmploymentStatus: sanitizeString(appData.fatherEmploymentStatus || 'Not Applicable', 80),
    motherEmploymentStatus: sanitizeString(appData.motherEmploymentStatus || 'Not Applicable', 80),
    householdMonthlyIncomeKsh: Math.max(0, Number(appData.householdMonthlyIncomeKsh) || 0),
    incomeSourceDescription: sanitizeString(appData.incomeSourceDescription, 300),
    amountRequestedKsh: Math.max(0, Number(appData.amountRequestedKsh) || 0),
    feeBalanceKsh: Math.max(0, Number(appData.feeBalanceKsh) || 0),
    documentsSummary: sanitizeString(appData.documentsSummary || 'Uploaded via Student Portal', 500),
    documentVerificationStatus: appData.documentVerificationStatus,
    eligibilityScore: Math.min(100, Math.max(0, Number(appData.eligibilityScore) || 0)),
    eligibilityCategory: sanitizeString(appData.eligibilityCategory, 80),
    eligibilityQualified: Boolean(appData.eligibilityQualified),
    eligibilityBreakdown: sanitizeString(appData.eligibilityBreakdown, 600),
    status: appData.status,
    amountAwardedKsh: Math.max(0, Number(appData.amountAwardedKsh) || 0),
    paymentReference: sanitizeString(appData.paymentReference || '', 80),
    paymentStatus: appData.paymentStatus,
    reviewerRemarks: sanitizeString(appData.reviewerRemarks || '', 600),
    reviewedBy: sanitizeString(appData.reviewedBy || '', 120),
    isDemo: Boolean(appData.isDemo),
  };

  try {
    if (!existingApp || !existingApp.createdAt) {
      await setDoc(doc(db, 'bursary_applications', applicationId), {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'bursary_applications', applicationId), {
        ...sanitized,
        createdAt: existingApp.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingApp?.createdAt ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function uploadStudentDocument(
  docData: Omit<ApplicationDocument, 'createdAt' | 'updatedAt'>
): Promise<void> {
  const docId = sanitizeId(docData.docId);
  const path = `application_documents/${docId}`;

  const payload = {
    docId,
    applicationId: sanitizeId(docData.applicationId),
    applicantUid: sanitizeId(docData.applicantUid),
    documentType: sanitizeString(docData.documentType, 100),
    fileName: sanitizeString(docData.fileName, 160),
    mimeType: docData.mimeType,
    fileSizeBytes: Math.min(VALIDATION_LIMITS.MAX_UPLOAD_BYTES, Math.max(0, Number(docData.fileSizeBytes) || 0)),
    dataUrlPreview: sanitizeString(docData.dataUrlPreview, VALIDATION_LIMITS.DOC_PREVIEW_MAX_LEN),
    verificationStatus: docData.verificationStatus,
    verifierNotes: sanitizeString(docData.verifierNotes || 'Submitted for verification', 400),
    verifiedBy: sanitizeString(docData.verifiedBy || 'Pending Staff Vetting', 120),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'application_documents', docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function verifyStudentDocumentStatus(
  existingDoc: ApplicationDocument,
  verificationStatus: ApplicationDocument['verificationStatus'],
  verifierNotes: string,
  verifiedBy: string
): Promise<void> {
  const path = `application_documents/${existingDoc.docId}`;
  try {
    await updateDoc(doc(db, 'application_documents', existingDoc.docId), {
      verificationStatus,
      verifierNotes: sanitizeString(verifierNotes, 400),
      verifiedBy: sanitizeString(verifiedBy, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveProjectRecord(
  project: Omit<ProjectRecord, 'createdAt' | 'updatedAt'>,
  existingProject?: ProjectRecord
): Promise<void> {
  const projectId = sanitizeId(project.projectId);
  const path = `projects/${projectId}`;

  const payload = {
    projectId,
    projectName: sanitizeString(project.projectName, 180),
    category: project.category,
    ward: sanitizeString(project.ward || 'Kobujoi', 60),
    location: sanitizeString(project.location, 100),
    subLocation: sanitizeString(project.subLocation, 100),
    village: sanitizeString(project.village, 100),
    latitude: Number(project.latitude) || 0.0956,
    longitude: Number(project.longitude) || 34.9754,
    description: sanitizeString(project.description, 1200),
    startDate: sanitizeString(project.startDate, 20),
    expectedCompletionDate: sanitizeString(project.expectedCompletionDate, 20),
    actualCompletionDate: sanitizeString(project.actualCompletionDate || '', 20),
    status: project.status,
    approvedBudgetKsh: Math.max(0, Number(project.approvedBudgetKsh) || 0),
    contractAmountKsh: Math.max(0, Number(project.contractAmountKsh) || 0),
    amountSpentKsh: Math.max(0, Number(project.amountSpentKsh) || 0),
    fundingSource: sanitizeString(project.fundingSource || 'NG-CDF Regular Allocation', 100),
    financialYear: sanitizeString(project.financialYear || '2025/2026', 20),
    percentageCompleted: Math.min(100, Math.max(0, Number(project.percentageCompleted) || 0)),
    currentStage: sanitizeString(project.currentStage, 160),
    milestonesSummary: sanitizeString(project.milestonesSummary, 600),
    challenges: sanitizeString(project.challenges || 'None reported', 400),
    remarks: sanitizeString(project.remarks || '', 400),
    primaryPhotoUrl: sanitizeString(project.primaryPhotoUrl, VALIDATION_LIMITS.DOC_PREVIEW_MAX_LEN),
    beforePhotoCaption: sanitizeString(project.beforePhotoCaption || '', 200),
    duringPhotoCaption: sanitizeString(project.duringPhotoCaption || '', 200),
    afterPhotoCaption: sanitizeString(project.afterPhotoCaption || '', 200),
    isPublic: Boolean(project.isPublic),
    isDemo: Boolean(project.isDemo),
    updatedBy: sanitizeString(project.updatedBy || 'Admin', 128),
  };

  try {
    if (!existingProject || !existingProject.createdAt) {
      await setDoc(doc(db, 'projects', projectId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'projects', projectId), {
        ...payload,
        createdAt: existingProject.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingProject?.createdAt ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function recordProjectExpenditureVoucher(
  exp: Omit<ProjectExpenditure, 'createdAt' | 'updatedAt'>,
  targetProject: ProjectRecord
): Promise<void> {
  const expenditureId = sanitizeId(exp.expenditureId);
  const path = `project_expenditures/${expenditureId}`;

  // Ensure the parent project exists in Firestore first so exists() rule passes
  if (!targetProject.createdAt) {
    await saveProjectRecord(targetProject);
  }

  const payload = {
    expenditureId,
    projectId: sanitizeId(exp.projectId),
    projectName: sanitizeString(exp.projectName, 180),
    expenditureDate: sanitizeString(exp.expenditureDate, 20),
    description: sanitizeString(exp.description, 400),
    amountKsh: Math.max(0, Number(exp.amountKsh) || 0),
    category: sanitizeString(exp.category, 80),
    paymentReference: sanitizeString(exp.paymentReference, 80),
    authorizedBy: sanitizeString(exp.authorizedBy, 120),
    recordedBy: sanitizeString(exp.recordedBy, 128),
    isPublic: Boolean(exp.isPublic),
    isDemo: Boolean(exp.isDemo),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'project_expenditures', expenditureId), payload);
    // Update the parent project's spent amount
    const newSpent = (targetProject.amountSpentKsh || 0) + payload.amountKsh;
    await saveProjectRecord(
      {
        ...targetProject,
        amountSpentKsh: newSpent,
        updatedBy: exp.recordedBy,
      },
      targetProject
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveProjectPhotoRecord(
  photo: Omit<ProjectPhoto, 'createdAt' | 'updatedAt'>,
  targetProject?: ProjectRecord
): Promise<void> {
  const photoId = sanitizeId(photo.photoId);
  const path = `project_photos/${photoId}`;

  if (targetProject && !targetProject.createdAt) {
    await saveProjectRecord(targetProject);
  }

  const payload = {
    photoId,
    projectId: sanitizeId(photo.projectId),
    projectName: sanitizeString(photo.projectName, 180),
    stage: photo.stage,
    caption: sanitizeString(photo.caption, 300),
    imageUrl: sanitizeString(photo.imageUrl, VALIDATION_LIMITS.DOC_PREVIEW_MAX_LEN),
    photographer: sanitizeString(photo.photographer, 120),
    uploadDate: sanitizeString(photo.uploadDate, 20),
    isPublic: Boolean(photo.isPublic),
    uploadedBy: sanitizeString(photo.uploadedBy, 128),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'project_photos', photoId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveSchoolRecord(
  school: Omit<SchoolRecord, 'createdAt' | 'updatedAt'>,
  existingSchool?: SchoolRecord
): Promise<void> {
  const schoolId = sanitizeId(school.schoolId);
  const path = `schools/${schoolId}`;

  const payload = {
    schoolId,
    schoolName: sanitizeString(school.schoolName, 160),
    registrationNumber: sanitizeString(school.registrationNumber, 60),
    schoolType: school.schoolType,
    category: school.category,
    location: sanitizeString(school.location, 120),
    contactPhone: sanitizeString(school.contactPhone, 40),
    contactEmail: sanitizeString(school.contactEmail, 160),
    principalName: sanitizeString(school.principalName, 120),
    bankName: sanitizeString(school.bankName, 100),
    bankBranch: sanitizeString(school.bankBranch, 100),
    accountNumberMasked: sanitizeString(school.accountNumberMasked, 60),
    beneficiaryCount: Math.max(0, Number(school.beneficiaryCount) || 0),
    totalAllocatedKsh: Math.max(0, Number(school.totalAllocatedKsh) || 0),
    totalPaidKsh: Math.max(0, Number(school.totalPaidKsh) || 0),
    isDemo: Boolean(school.isDemo),
  };

  try {
    if (!existingSchool || !existingSchool.createdAt) {
      await setDoc(doc(db, 'schools', schoolId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'schools', schoolId), {
        ...payload,
        createdAt: existingSchool.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingSchool?.createdAt ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveStaffRecord(
  staff: Omit<StaffRecord, 'createdAt' | 'updatedAt'>,
  existingStaff?: StaffRecord
): Promise<void> {
  const staffId = sanitizeId(staff.staffId);
  const path = `staff_records/${staffId}`;

  const payload = {
    staffId,
    fullName: sanitizeString(staff.fullName, 120),
    position: sanitizeString(staff.position, 100),
    department: sanitizeString(staff.department, 100),
    responsibilities: sanitizeString(staff.responsibilities, 600),
    officialEmail: sanitizeString(staff.officialEmail, 160),
    officialPhone: sanitizeString(staff.officialPhone, 40),
    status: staff.status,
    isPublic: Boolean(staff.isPublic),
    isDemo: Boolean(staff.isDemo),
    createdBy: sanitizeString(staff.createdBy || 'Admin', 128),
  };

  try {
    if (!existingStaff || !existingStaff.createdAt) {
      await setDoc(doc(db, 'staff_records', staffId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'staff_records', staffId), {
        ...payload,
        createdAt: existingStaff.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingStaff?.createdAt ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveEligibilityCriterion(
  criterion: Omit<EligibilityCriteria, 'createdAt' | 'updatedAt'>,
  existingCriterion?: EligibilityCriteria
): Promise<void> {
  const criteriaId = sanitizeId(criterion.criteriaId);
  const path = `eligibility_criteria/${criteriaId}`;

  const payload = {
    criteriaId,
    categoryName: sanitizeString(criterion.categoryName, 120),
    categoryCode: sanitizeString(criterion.categoryCode, 50),
    description: sanitizeString(criterion.description, 600),
    maxPoints: Math.min(100, Math.max(0, Number(criterion.maxPoints) || 30)),
    minAcademicScore: Math.min(100, Math.max(0, Number(criterion.minAcademicScore) || 50)),
    maxHouseholdIncomeKsh: Math.max(0, Number(criterion.maxHouseholdIncomeKsh) || 20000),
    priorityLevel: criterion.priorityLevel,
    requiredDocuments: sanitizeString(criterion.requiredDocuments, 400),
    maxAwardKsh: Math.max(0, Number(criterion.maxAwardKsh) || 25000),
    financialYear: sanitizeString(criterion.financialYear || '2025/2026', 20),
    isActive: Boolean(criterion.isActive),
    updatedBy: sanitizeString(criterion.updatedBy || 'Admin', 128),
  };

  try {
    if (!existingCriterion || !existingCriterion.createdAt) {
      await setDoc(doc(db, 'eligibility_criteria', criteriaId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'eligibility_criteria', criteriaId), {
        ...payload,
        createdAt: existingCriterion.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingCriterion?.createdAt ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function saveAnnouncementRecord(
  ann: Omit<Announcement, 'createdAt' | 'updatedAt'>,
  existingAnn?: Announcement
): Promise<void> {
  const announcementId = sanitizeId(ann.announcementId);
  const path = `announcements/${announcementId}`;

  const payload = {
    announcementId,
    title: sanitizeString(ann.title, 180),
    category: ann.category,
    summary: sanitizeString(ann.summary, 300),
    content: sanitizeString(ann.content, 1500),
    effectiveDate: sanitizeString(ann.effectiveDate, 20),
    deadlineDate: sanitizeString(ann.deadlineDate, 20),
    isPublic: Boolean(ann.isPublic),
    isPinned: Boolean(ann.isPinned),
    isDemo: Boolean(ann.isDemo),
    publishedBy: sanitizeString(ann.publishedBy, 120),
  };

  try {
    if (!existingAnn || !existingAnn.createdAt) {
      await setDoc(doc(db, 'announcements', announcementId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'announcements', announcementId), {
        ...payload,
        createdAt: existingAnn.createdAt,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingAnn?.createdAt ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function deleteAnnouncementRecord(announcementId: string): Promise<void> {
  const path = `announcements/${announcementId}`;
  try {
    await deleteDoc(doc(db, 'announcements', announcementId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDatabaseAsAdmin(): Promise<void> {
  if (!auth.currentUser) return;

  // Check if projects are already seeded in Firestore
  const projSnap = await getDocs(
    query(collection(db, 'projects'), where('isPublic', '==', true))
  );
  if (!projSnap.empty) {
    return;
  }

  for (const crit of INITIAL_ELIGIBILITY_CRITERIA) {
    await saveEligibilityCriterion(crit);
  }
  for (const school of INITIAL_SCHOOLS) {
    await saveSchoolRecord(school);
  }
  for (const staff of INITIAL_STAFF) {
    await saveStaffRecord(staff);
  }
  for (const proj of INITIAL_PROJECTS) {
    await saveProjectRecord(proj);
  }
  for (const exp of INITIAL_EXPENDITURES) {
    const parentProj = INITIAL_PROJECTS.find((p) => p.projectId === exp.projectId);
    if (parentProj) {
      await setDoc(doc(db, 'project_expenditures', exp.expenditureId), {
        ...exp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
  for (const photo of INITIAL_PROJECT_PHOTOS) {
    await saveProjectPhotoRecord(photo);
  }
  for (const ann of INITIAL_ANNOUNCEMENTS) {
    await saveAnnouncementRecord(ann);
  }
  for (const app of INITIAL_DEMO_APPLICATIONS) {
    await submitOrUpdateBursaryApplication(app);
  }

  await logAuditAction({
    actorName: auth.currentUser.displayName || auth.currentUser.email || 'Administrator',
    actorRole: 'admin',
    action: 'Initialized Kobujoi CDF seed dataset in Firestore database.',
    targetCollection: 'system',
    targetRecordId: 'kobujoi-seed-v1',
    previousValueSummary: 'Empty database',
    newValueSummary: 'Seeded projects, schools, eligibility criteria, staff, announcements, and sample applications.',
  });
}
