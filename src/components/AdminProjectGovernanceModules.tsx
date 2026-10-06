import React, { useState } from 'react';
import {
  StaffRecord,
  ProjectRecord,
  ProjectExpenditure,
  ProjectPhoto,
  Announcement,
  NotificationRecord,
  AuditLog,
  BursaryApplication,
  SchoolRecord,
  ProjectCategory,
  ProjectStatus,
  VALIDATION_LIMITS,
  sanitizeId,
  sanitizeString,
} from '../types/cdf.ts';
import { KOBUJOI_LOCATIONS, ASSET_IMAGES } from '../data/seedData.ts';
import {
  saveStaffRecord,
  saveProjectRecord,
  recordProjectExpenditureVoucher,
  saveProjectPhotoRecord,
  saveAnnouncementRecord,
  deleteAnnouncementRecord,
  createSystemNotification,
  logAuditAction,
  seedDatabaseAsAdmin,
} from '../services/cdfFirestoreService.ts';
import {
  exportBursaryReportCsv,
  exportBursaryReportPdf,
  exportProjectReportCsv,
  exportProjectReportPdf,
  exportFinancialReportCsv,
} from '../services/reportExporter.ts';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Camera,
  Trash2,
  Database,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface AdminProjectGovernanceModulesProps {
  activeSection:
    | 'staff'
    | 'projects'
    | 'finances'
    | 'reports'
    | 'announcements'
    | 'notifications'
    | 'audit'
    | 'settings';
  roleMode: 'admin' | 'staff';
  actorName: string;
  staffList: StaffRecord[];
  projects: ProjectRecord[];
  expenditures: ProjectExpenditure[];
  photos: ProjectPhoto[];
  announcements: Announcement[];
  notifications: NotificationRecord[];
  auditLogs: AuditLog[];
  applications: BursaryApplication[];
  schools: SchoolRecord[];
  onFeedback: (msg: string, isError?: boolean) => void;
}

export const AdminProjectGovernanceModules: React.FC<
  AdminProjectGovernanceModulesProps
> = ({
  activeSection,
  roleMode,
  actorName,
  staffList,
  projects,
  expenditures,
  photos,
  announcements,
  notifications,
  auditLogs,
  applications,
  schools,
  onFeedback,
}) => {
  // Staff Form State
  const [staffName, setStaffName] = useState('');
  const [staffPos, setStaffPos] = useState('Bursary Verification Clerk');
  const [staffDept, setStaffDept] = useState('Education & Bursary Vetting');
  const [staffResp, setStaffResp] = useState(
    'Reviews ward bursary applications and verifies student admission documents.'
  );
  const [staffEmail, setStaffEmail] = useState('clerk.kobujoi@ngcdf-aldai.go.ke');
  const [staffPhone, setStaffPhone] = useState('+254 720 111 222');

  // Project Form State
  const [projName, setProjName] = useState('');
  const [projCategory, setProjCategory] =
    useState<ProjectCategory>('Education & Laboratories');
  const [projLocation, setProjLocation] = useState(KOBUJOI_LOCATIONS[0].location);
  const [projSubLoc, setProjSubLoc] = useState(KOBUJOI_LOCATIONS[0].subLocations[0]);
  const [projVillage, setProjVillage] = useState('Kobujoi Center');
  const [projBudget, setProjBudget] = useState<number>(8500000);
  const [projStatus, setProjStatus] = useState<ProjectStatus>('Ongoing');
  const [projProgress, setProjProgress] = useState<number>(45);
  const [projStage, setProjStage] = useState('Substructure & Walling Completed');
  const [projDesc, setProjDesc] = useState('');

  // Project Update Inspector State
  const [selectedProjId, setSelectedProjId] = useState<string>(
    projects[0]?.projectId || 'KBG-PROJ-2026-001'
  );
  const selectedProj =
    projects.find((p) => p.projectId === selectedProjId) || projects[0] || null;
  const [editProgress, setEditProgress] = useState<number>(
    selectedProj?.percentageCompleted ?? 75
  );
  const [editStage, setEditStage] = useState<string>(
    selectedProj?.currentStage || 'Ongoing Works'
  );
  const [editStatus, setEditStatus] = useState<ProjectStatus>(
    selectedProj?.status || 'Ongoing'
  );

  // Expenditure Form State
  const [expProjectId, setExpProjectId] = useState<string>(
    projects[0]?.projectId || 'KBG-PROJ-2026-001'
  );
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expAmount, setExpAmount] = useState<number>(1250000);
  const [expCategory, setExpCategory] = useState('Civil Works & Masonry');
  const [expRef, setExpRef] = useState('NGCDF/KBG/EFT/2026/0512');
  const [expDesc, setExpDesc] = useState(
    'Interim Payment Certificate — Verified site works and materials delivery'
  );

  // Project Photo Upload State
  const [photoStage, setPhotoStage] =
    useState<ProjectPhoto['stage']>('During Construction');
  const [photoCaption, setPhotoCaption] = useState(
    'Site inspection photograph verifying ongoing construction works in Kobujoi Ward.'
  );
  const [photoPhotographer, setPhotoPhotographer] = useState(actorName);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annCat, setAnnCat] = useState<Announcement['category']>('Bursary Intake');
  const [annSummary, setAnnSummary] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annDeadline, setAnnDeadline] = useState('2026-11-30');

  // Notification Broadcast State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roleMode !== 'admin') {
      onFeedback('Only Administrators can add or modify staff records.', true);
      return;
    }
    if (!staffName.trim()) {
      onFeedback('Staff Full Name is required.', true);
      return;
    }
    try {
      const staffId = sanitizeId(`staff-${Date.now()}`);
      await saveStaffRecord({
        staffId,
        fullName: staffName.trim(),
        position: staffPos.trim(),
        department: staffDept.trim(),
        responsibilities: staffResp.trim(),
        officialEmail: staffEmail.trim(),
        officialPhone: staffPhone.trim(),
        status: 'Active',
        isPublic: true,
        isDemo: false,
        createdBy: actorName,
      });

      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: `Added CDF staff member "${staffName.trim()}" (${staffPos.trim()}).`,
        targetCollection: 'staff_records',
        targetRecordId: staffId,
        previousValueSummary: 'None',
        newValueSummary: `${staffName.trim()} — Active`,
      });

      setStaffName('');
      onFeedback(`Added "${staffName.trim()}" to Kobujoi CDF Staff Directory.`);
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Failed to add staff.', true);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roleMode !== 'admin') {
      onFeedback('Only Administrators can register new capital projects and budgets.', true);
      return;
    }
    if (!projName.trim() || projBudget <= 0) {
      onFeedback('Project Name and positive Approved Budget are required.', true);
      return;
    }
    try {
      const projectId = sanitizeId(
        `KBG-PROJ-2026-${String(projects.length + 10).padStart(3, '0')}`
      );
      await saveProjectRecord({
        projectId,
        projectName: projName.trim(),
        category: projCategory,
        ward: 'Kobujoi',
        location: projLocation,
        subLocation: projSubLoc,
        village: projVillage.trim() || projSubLoc,
        latitude: 0.0956 + (Math.random() - 0.5) * 0.02,
        longitude: 34.9754 + (Math.random() - 0.5) * 0.02,
        description:
          projDesc.trim() ||
          `Constituency infrastructure development project at ${projSubLoc}, Kobujoi Ward.`,
        startDate: new Date().toISOString().slice(0, 10),
        expectedCompletionDate: '2026-12-30',
        actualCompletionDate: projStatus === 'Completed' ? new Date().toISOString().slice(0, 10) : '',
        status: projStatus,
        approvedBudgetKsh: projBudget,
        contractAmountKsh: Math.round(projBudget * 0.96),
        amountSpentKsh: 0,
        fundingSource: 'NG-CDF Regular Allocation',
        financialYear: '2025/2026',
        percentageCompleted: projProgress,
        currentStage: projStage.trim(),
        milestonesSummary: '1. Public Participation (100%) · 2. Site Handover & Works',
        challenges: 'None reported',
        remarks: 'Approved by Kobujoi Ward NG-CDF Committee',
        primaryPhotoUrl: ASSET_IMAGES.schoolLab,
        beforePhotoCaption: 'Site condition prior to project commencement',
        duringPhotoCaption: 'Ongoing civil and structural works',
        afterPhotoCaption: 'Current milestone inspection view',
        isPublic: true,
        isDemo: false,
        updatedBy: actorName,
      });

      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: `Created constituency project ${projectId} ("${projName.trim()}") with budget KSh ${projBudget.toLocaleString()}.`,
        targetCollection: 'projects',
        targetRecordId: projectId,
        previousValueSummary: 'None',
        newValueSummary: `Budget: KSh ${projBudget.toLocaleString()} · Status: ${projStatus}`,
      });

      setProjName('');
      setProjDesc('');
      onFeedback(`Created constituency project ${projectId}.`);
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Failed to create project.', true);
    }
  };

  const handleUpdateProjectProgress = async () => {
    if (!selectedProj) return;
    try {
      await saveProjectRecord(
        {
          ...selectedProj,
          percentageCompleted: editProgress,
          currentStage: editStage,
          status: editStatus,
          updatedBy: actorName,
        },
        selectedProj
      );

      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: `Updated project ${selectedProj.projectId} progress from ${selectedProj.percentageCompleted}% to ${editProgress}% (${editStatus}).`,
        targetCollection: 'projects',
        targetRecordId: selectedProj.projectId,
        previousValueSummary: `${selectedProj.percentageCompleted}% (${selectedProj.status})`,
        newValueSummary: `${editProgress}% (${editStatus}) — ${editStage}`,
      });

      onFeedback(`Updated progress for ${selectedProj.projectId} to ${editProgress}%.`);
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Failed to update progress.', true);
    }
  };

  const handleRecordExpenditure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roleMode !== 'admin') {
      onFeedback(
        'Security Policy: Ordinary users and non-admin staff cannot record financial expenditure vouchers.',
        true
      );
      return;
    }
    const targetProject = projects.find((p) => p.projectId === expProjectId) || projects[0];
    if (!targetProject || expAmount <= 0) {
      onFeedback('Select a valid project and enter a positive expenditure amount.', true);
      return;
    }

    try {
      const expenditureId = sanitizeId(`exp-${Date.now()}`);
      await recordProjectExpenditureVoucher(
        {
          expenditureId,
          projectId: targetProject.projectId,
          projectName: targetProject.projectName,
          expenditureDate: expDate,
          description: expDesc.trim(),
          amountKsh: expAmount,
          category: expCategory,
          paymentReference: expRef.trim(),
          authorizedBy: `${actorName} (Admin)`,
          recordedBy: actorName,
          isPublic: true,
          isDemo: false,
        },
        targetProject
      );

      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: `Recorded project expenditure voucher ${expRef.trim()} of KSh ${expAmount.toLocaleString()} against ${targetProject.projectId}.`,
        targetCollection: 'project_expenditures',
        targetRecordId: expenditureId,
        previousValueSummary: `Previous Project Spent: KSh ${targetProject.amountSpentKsh.toLocaleString()}`,
        newValueSummary: `New Project Spent: KSh ${(targetProject.amountSpentKsh + expAmount).toLocaleString()}`,
      });

      onFeedback(
        `Recorded expenditure voucher ${expRef} (KSh ${expAmount.toLocaleString()}) and updated project utilization.`
      );
    } catch (err) {
      onFeedback(
        err instanceof Error ? err.message : 'Failed to record expenditure.',
        true
      );
    }
  };

  const handleProjectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      onFeedback('Please upload a JPG or PNG photograph.', true);
      return;
    }
    if (file.size > VALIDATION_LIMITS.MAX_UPLOAD_BYTES) {
      onFeedback('Photograph exceeds 5MB limit.', true);
      return;
    }

    const targetProject = projects.find((p) => p.projectId === expProjectId) || projects[0];
    if (!targetProject) return;

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const safeUrl =
        dataUrl.length <= VALIDATION_LIMITS.DOC_PREVIEW_MAX_LEN
          ? dataUrl
          : ASSET_IMAGES.schoolLab;

      const photoId = sanitizeId(`photo-${Date.now()}`);
      await saveProjectPhotoRecord(
        {
          photoId,
          projectId: targetProject.projectId,
          projectName: targetProject.projectName,
          stage: photoStage,
          caption: photoCaption.trim() || file.name,
          imageUrl: safeUrl,
          photographer: photoPhotographer.trim() || actorName,
          uploadDate: new Date().toISOString().slice(0, 10),
          isPublic: true,
          uploadedBy: actorName,
        },
        targetProject
      );

      await logAuditAction({
        actorName,
        actorRole: roleMode,
        action: `Uploaded "${photoStage}" project photograph for ${targetProject.projectId}.`,
        targetCollection: 'project_photos',
        targetRecordId: photoId,
        previousValueSummary: 'None',
        newValueSummary: `${photoStage}: ${photoCaption.trim()}`,
      });

      onFeedback(`Uploaded "${photoStage}" photograph for ${targetProject.projectName}.`);
      e.target.value = '';
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Failed to upload photo.', true);
    }
  };

  // =========================================================================
  // 1. STAFF DIRECTORY MANAGEMENT (SECTION 10)
  // =========================================================================
  if (activeSection === 'staff') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-neutral-900">
            Kobujoi CDF Staff Directory & Role Responsibilities
          </h2>
          <div className="divide-y divide-neutral-200 text-xs">
            {staffList.map((st) => (
              <div
                key={st.staffId}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 text-sm">
                      {st.fullName}
                    </span>
                    <span>·</span>
                    <span className="font-medium text-[#0B4F32]">{st.position}</span>
                  </div>
                  <p className="text-neutral-500 mt-0.5">
                    Department: {st.department} · {st.officialEmail} · {st.officialPhone}
                  </p>
                  <p className="text-neutral-600 mt-1">{st.responsibilities}</p>
                </div>

                {roleMode === 'admin' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        const nextStatus = st.status === 'Active' ? 'Inactive' : 'Active';
                        await saveStaffRecord({ ...st, status: nextStatus }, st);
                        onFeedback(`Updated ${st.fullName} status to ${nextStatus}.`);
                      }}
                      className="px-3 py-1.5 border border-neutral-300 rounded-lg hover:bg-neutral-50 font-medium cursor-pointer"
                    >
                      {st.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-neutral-900">Add CDF Staff Member</h3>
          <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g. Mr. Evans Kipchumba"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Position / Title *</label>
              <select
                value={staffPos}
                onChange={(e) => setStaffPos(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
              >
                <option value="Constituency Manager">Constituency Manager</option>
                <option value="Finance Officer">Finance Officer</option>
                <option value="Bursary Officer">Bursary Officer</option>
                <option value="Project Officer">Project Officer</option>
                <option value="ICT Officer">ICT Officer</option>
                <option value="Administrative Officer">Administrative Officer</option>
                <option value="Clerical Officer">Clerical Officer</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Department</label>
              <input
                type="text"
                value={staffDept}
                onChange={(e) => setStaffDept(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">
                Official Email & Phone
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">
                Official Responsibilities
              </label>
              <textarea
                rows={2}
                value={staffResp}
                onChange={(e) => setStaffResp(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
            >
              Add Staff Record
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. PROJECT MANAGEMENT SYSTEM (SECTION 11)
  // =========================================================================
  if (activeSection === 'projects') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Update Existing Project Progress & Stage */}
          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-neutral-900">
              Update Project Implementation Progress & Milestones
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Select Constituency Project
                </label>
                <select
                  value={selectedProjId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedProjId(id);
                    const found = projects.find((p) => p.projectId === id);
                    if (found) {
                      setEditProgress(found.percentageCompleted);
                      setEditStage(found.currentStage);
                      setEditStatus(found.status);
                    }
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectId} — {p.projectName} ({p.percentageCompleted}%)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProj && (
                <div className="p-4 rounded-xl bg-[#F8FAF9] border border-neutral-200 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-neutral-500 block">Approved Budget</span>
                      <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                        KSh {selectedProj.approvedBudgetKsh.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Amount Spent</span>
                      <span className="font-mono font-semibold text-[#0B4F32] tabular-nums">
                        KSh {selectedProj.amountSpentKsh.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Location</span>
                      <span className="font-medium text-neutral-900">
                        {selectedProj.subLocation}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Percentage Completed ({editProgress}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={editProgress}
                        onChange={(e) => setEditProgress(Number(e.target.value))}
                        className="w-full accent-[#0B4F32]"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Project Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                      >
                        <option value="Proposed">Proposed</option>
                        <option value="Approved">Approved</option>
                        <option value="Planning">Planning</option>
                        <option value="Procurement">Procurement</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">
                      Current Stage / Milestone Note
                    </label>
                    <input
                      type="text"
                      value={editStage}
                      onChange={(e) => setEditStage(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateProjectProgress}
                    className="px-4 py-2 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
                  >
                    Save Progress Update
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Create New Constituency Project (Admin Only) */}
          <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Register New Constituency Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="e.g. Kibwareng Primary 3-Classroom Renovation"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Category</label>
                  <select
                    value={projCategory}
                    onChange={(e) => setProjCategory(e.target.value as ProjectCategory)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Education & Laboratories">Education & Laboratories</option>
                    <option value="Water & Sanitation">Water & Sanitation</option>
                    <option value="ICT & Youth Innovation">ICT & Youth Innovation</option>
                    <option value="Roads & Bridges">Roads & Bridges</option>
                    <option value="Security & Administration">Security & Administration</option>
                    <option value="Environment & Afforestation">
                      Environment & Afforestation
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Approved Budget (KSh)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={projBudget}
                    onChange={(e) => setProjBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Location</label>
                  <select
                    value={projLocation}
                    onChange={(e) => {
                      const loc = e.target.value;
                      setProjLocation(loc);
                      const f = KOBUJOI_LOCATIONS.find((l) => l.location === loc);
                      if (f) setProjSubLoc(f.subLocations[0]);
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
                  <label className="block font-medium text-neutral-700 mb-1">Sub-Location</label>
                  <input
                    type="text"
                    value={projSubLoc}
                    onChange={(e) => setProjSubLoc(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Scope Description</label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
              >
                Create Project Record
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. PROJECT FINANCES & PHOTOGRAPH GALLERY UPLOAD (SECTIONS 12 & 13)
  // =========================================================================
  if (activeSection === 'finances') {
    const finProject =
      projects.find((p) => p.projectId === expProjectId) || projects[0] || null;
    const finRemaining = finProject
      ? Math.max(0, finProject.approvedBudgetKsh - finProject.amountSpentKsh)
      : 0;
    const finUtil =
      finProject && finProject.approvedBudgetKsh > 0
        ? Math.round((finProject.amountSpentKsh / finProject.approvedBudgetKsh) * 100)
        : 0;

    return (
      <div className="space-y-6">
        {/* Financial Utilization Summary Card (Section 13 Format) */}
        {finProject && (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
              <div>
                <span className="text-xs font-mono text-[#0B4F32]">
                  PROJECT FINANCIAL TRACKING & UTILIZATION
                </span>
                <h2 className="text-lg font-display font-semibold text-neutral-900">
                  {finProject.projectName}
                </h2>
              </div>
              <select
                value={expProjectId}
                onChange={(e) => setExpProjectId(e.target.value)}
                className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white"
              >
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectId} — {p.projectName.slice(0, 38)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                <span className="text-neutral-500 block">Approved Budget</span>
                <span className="text-lg font-mono font-bold text-neutral-900 tabular-nums mt-1 block">
                  KSh {finProject.approvedBudgetKsh.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                <span className="text-neutral-500 block">Total Expenditure (Spent)</span>
                <span className="text-lg font-mono font-bold text-[#0B4F32] tabular-nums mt-1 block">
                  KSh {finProject.amountSpentKsh.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                <span className="text-neutral-500 block">Remaining Balance</span>
                <span className="text-lg font-mono font-bold text-neutral-900 tabular-nums mt-1 block">
                  KSh {finRemaining.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-lg bg-[#F8FAF9] border border-neutral-200">
                <span className="text-neutral-500 block">Budget Utilization</span>
                <span className="text-lg font-mono font-bold text-neutral-900 tabular-nums mt-1 block">
                  {finUtil}%
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Record Expenditure Voucher (Admin Only) */}
          <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Record Project Expenditure Voucher (Admin Only)
            </h3>
            <form onSubmit={handleRecordExpenditure} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Voucher Date *</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Amount (KSh) *</label>
                  <input
                    type="number"
                    min={1}
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Expenditure Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Civil Works & Masonry">Civil Works & Masonry</option>
                    <option value="Materials & Equipment">Materials & Equipment</option>
                    <option value="Solar & Electrical Installation">
                      Solar & Electrical Installation
                    </option>
                    <option value="Consultancy & Supervision">Consultancy & Supervision</option>
                    <option value="Retention & Final Certificate">
                      Retention & Final Certificate
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Payment / EFT Reference *
                  </label>
                  <input
                    type="text"
                    value={expRef}
                    onChange={(e) => setExpRef(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Voucher Description *
                </label>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
              >
                Post Expenditure & Recalculate Project Balance
              </button>
            </form>
          </div>

          {/* Upload Project Photograph (Before / During / Completed) */}
          <div className="lg:col-span-6 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">
              Upload Project Progress Photograph
            </h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Project Stage *
                  </label>
                  <select
                    value={photoStage}
                    onChange={(e) => setPhotoStage(e.target.value as ProjectPhoto['stage'])}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                  >
                    <option value="Before">Before Project</option>
                    <option value="During Construction">During Construction</option>
                    <option value="Completed">Completed Project</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Photographer / Officer
                  </label>
                  <input
                    type="text"
                    value={photoPhotographer}
                    onChange={(e) => setPhotoPhotographer(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Photo Caption *</label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
              </div>
              <div className="border-2 border-dashed border-neutral-300 rounded-xl p-5 text-center bg-[#F8FAF9]">
                <Camera className="w-5 h-5 text-[#0B4F32] mx-auto mb-1.5" />
                <label className="inline-block px-4 py-2 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer">
                  <span>Select Project Photo (JPG / PNG)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleProjectPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. REPORT GENERATION & EXPORT CENTER (SECTION 19)
  // =========================================================================
  if (activeSection === 'reports') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-2">
          <h2 className="text-lg font-display font-semibold text-neutral-900">
            Official Reports & Data Export Center (PDF & Excel/CSV)
          </h2>
          <p className="text-xs text-neutral-500">
            Generate statutory Bursary Reports, Constituency Project Reports, and Financial
            Reconciliation Ledgers from live database records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bursary Reports */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-mono text-[#0B4F32] font-semibold">
                REPORT MODULE 01
              </span>
              <h3 className="text-base font-semibold text-neutral-900">
                Bursary Allocation & Eligibility Report
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Includes applications received ({applications.length}), approved/rejected breakdown,
                students by vulnerability category, and school allocations across {schools.length}{' '}
                institutions.
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => exportBursaryReportPdf(applications, schools)}
                className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Export Bursary Report (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => exportBursaryReportCsv(applications)}
                className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Bursary Register (Excel / CSV)</span>
              </button>
            </div>
          </div>

          {/* Project Reports */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-mono text-[#0B4F32] font-semibold">
                REPORT MODULE 02
              </span>
              <h3 className="text-base font-semibold text-neutral-900">
                Constituency Infrastructure Projects Report
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Covers {projects.length} projects across Kobujoi Ward sub-locations, category
                breakdown, physical completion percentages, and budget utilization.
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => exportProjectReportPdf(projects, expenditures)}
                className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Export Projects Report (PDF)</span>
              </button>
              <button
                type="button"
                onClick={() => exportProjectReportCsv(projects)}
                className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-medium rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Projects Portfolio (Excel / CSV)</span>
              </button>
            </div>
          </div>

          {/* Financial Reports */}
          <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-mono text-[#0B4F32] font-semibold">
                REPORT MODULE 03
              </span>
              <h3 className="text-base font-semibold text-neutral-900">
                Master Financial & Expenditure Ledger
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Consolidated FY 2025/2026 financial statement combining total bursary disbursements,
                project expenditure vouchers ({expenditures.length}), and budget vs actual balances.
              </p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => exportFinancialReportCsv(projects, expenditures, applications)}
                className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Master Financial Ledger (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. ANNOUNCEMENTS MANAGEMENT (SECTION 21)
  // =========================================================================
  if (activeSection === 'announcements') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-neutral-900">
            Published Constituency Announcements
          </h2>
          <div className="divide-y divide-neutral-200 text-xs">
            {announcements.map((ann) => (
              <div
                key={ann.announcementId}
                className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
              >
                <div>
                  <span className="font-semibold text-[#0B4F32]">{ann.category}</span>
                  <span className="text-neutral-400 mx-1.5">·</span>
                  <span className="font-mono text-neutral-500">Deadline: {ann.deadlineDate}</span>
                  <h4 className="text-sm font-semibold text-neutral-900 mt-1">{ann.title}</h4>
                  <p className="text-neutral-600 mt-1">{ann.content}</p>
                </div>
                {roleMode === 'admin' && !ann.isDemo && (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteAnnouncementRecord(ann.announcementId);
                      onFeedback(`Removed announcement "${ann.title}".`);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-neutral-900">Publish New Announcement</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (roleMode !== 'admin') {
                onFeedback('Only Administrators can publish official announcements.', true);
                return;
              }
              if (!annTitle.trim() || !annContent.trim()) {
                onFeedback('Title and Content are required.', true);
                return;
              }
              const announcementId = sanitizeId(`ann-${Date.now()}`);
              await saveAnnouncementRecord({
                announcementId,
                title: annTitle.trim(),
                category: annCat,
                summary: annSummary.trim() || annTitle.trim(),
                content: annContent.trim(),
                effectiveDate: new Date().toISOString().slice(0, 10),
                deadlineDate: annDeadline,
                isPublic: true,
                isPinned: true,
                isDemo: false,
                publishedBy: actorName,
              });
              await logAuditAction({
                actorName,
                actorRole: roleMode,
                action: `Published public announcement "${annTitle.trim()}".`,
                targetCollection: 'announcements',
                targetRecordId: announcementId,
              });
              setAnnTitle('');
              setAnnSummary('');
              setAnnContent('');
              onFeedback('Announcement published to homepage.');
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Title *</label>
              <input
                type="text"
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="e.g. Notice of Ward Bursary Verification Dates"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Category</label>
                <select
                  value={annCat}
                  onChange={(e) => setAnnCat(e.target.value as Announcement['category'])}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="Bursary Intake">Bursary Intake</option>
                  <option value="Application Deadline">Application Deadline</option>
                  <option value="Public Baraza / Meeting">Public Baraza / Meeting</option>
                  <option value="Project Handover">Project Handover</option>
                  <option value="Policy Notice">Policy Notice</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Deadline Date</label>
                <input
                  type="date"
                  value={annDeadline}
                  onChange={(e) => setAnnDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Full Notice Content *</label>
              <textarea
                rows={3}
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
            >
              Publish Announcement
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 6. NOTIFICATIONS CENTER (SECTION 20)
  // =========================================================================
  if (activeSection === 'notifications') {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-neutral-900">
            System Notifications & Applicant Alerts
          </h2>
          {notifications.length === 0 ? (
            <p className="text-xs text-neutral-500 py-8 text-center">
              No system notifications logged yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 text-xs">
              {notifications.map((n) => (
                <div key={n.notificationId} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span className="font-semibold text-[#0B4F32]">{n.type}</span>
                    <span className="font-mono">Ref: {n.relatedRecordId}</span>
                  </div>
                  <h4 className="font-semibold text-neutral-900 mt-1">{n.title}</h4>
                  <p className="text-neutral-600 mt-0.5">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-neutral-900">
            Send Notification to All Applicants
          </h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!notifTitle.trim() || !notifMsg.trim()) return;
              await createSystemNotification({
                recipientUid: 'ALL_STUDENTS',
                title: notifTitle.trim(),
                message: notifMsg.trim(),
                type: 'System Alert',
                relatedRecordId: 'FY-2025-2026',
              });
              setNotifTitle('');
              setNotifMsg('');
              onFeedback('Broadcast notification dispatched to student portal.');
            }}
            className="space-y-3 text-xs"
          >
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Alert Title *</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="e.g. Term 3 Cheque Collection Notice"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Message *</label>
              <textarea
                rows={3}
                value={notifMsg}
                onChange={(e) => setNotifMsg(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
            >
              Send Broadcast Alert
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 7. IMMUTABLE AUDIT LOGS (SECTION 23)
  // =========================================================================
  if (activeSection === 'audit') {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h2 className="text-lg font-display font-semibold text-neutral-900">
            Immutable Administrative & Financial Audit Trail
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Enforced by Firestore security rules (`allow update, delete: if false;`). Every
            approval, eligibility override, document verification, and financial expenditure is
            permanently recorded.
          </p>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-10 text-center text-xs text-neutral-500">
            No audit logs recorded in Firestore yet. Perform any administrative action or click
            &quot;Sync Demo Dataset to Firestore&quot; in System Settings.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Actor & Role</th>
                  <th className="py-3 px-4">Action Description</th>
                  <th className="py-3 px-4">Target Record</th>
                  <th className="py-3 px-4">Previous → New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {auditLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-neutral-50">
                    <td className="py-3 px-4 font-mono text-neutral-500">{log.logId}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-neutral-900 block">{log.actorName}</span>
                      <span className="font-mono text-[11px] text-[#0B4F32] uppercase">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-800">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      {log.targetCollection} / {log.targetRecordId}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                      {log.previousValueSummary} →{' '}
                      <strong className="text-neutral-900">{log.newValueSummary}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 8. SYSTEM SETTINGS & DATA VERIFICATION CONTROLS (SECTION 39)
  // =========================================================================
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-display font-semibold text-neutral-900">
          System Settings, Security Compliance & Database Seeding
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Configure official vs demo data boundaries and synchronize initial Kobujoi Ward records to
          Firestore.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="p-5 rounded-xl bg-[#F8FAF9] border border-neutral-200 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-neutral-900 text-sm">
            <Database className="w-4 h-4 text-[#0B4F32]" />
            <span>Firestore Database Seeding & Demo Synchronization</span>
          </div>
          <p className="text-neutral-600 leading-relaxed">
            Populate the live Firestore database with the initial Kobujoi Ward demo records (6
            Schools, 5 Eligibility Categories, 5 Constituency Projects, 6 Expenditure Vouchers,
            Staff Directory, and Sample Applications) if not yet seeded.
          </p>
          <button
            type="button"
            disabled={isSeeding || roleMode !== 'admin'}
            onClick={async () => {
              setIsSeeding(true);
              try {
                await seedDatabaseAsAdmin();
                onFeedback('Kobujoi CDF initial records synchronized to Firestore.');
              } catch (err) {
                onFeedback(
                  err instanceof Error ? err.message : 'Failed to seed database.',
                  true
                );
              } finally {
                setIsSeeding(false);
              }
            }}
            className="px-4 py-2.5 bg-[#0B4F32] hover:bg-[#083B25] text-white font-semibold rounded-lg cursor-pointer"
          >
            {isSeeding ? 'Synchronizing Records...' : 'Sync Demo Dataset to Firestore'}
          </button>
        </div>

        <div className="p-5 rounded-xl bg-[#F8FAF9] border border-neutral-200 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-neutral-900 text-sm">
            <ShieldCheck className="w-4 h-4 text-[#0B4F32]" />
            <span>Data Protection & Zero-Trust Security Architecture</span>
          </div>
          <ul className="space-y-1.5 text-neutral-600">
            <li>• Private student National IDs, Birth Certificates, and documents are isolated.</li>
            <li>• Public portal exposes only approved projects, budgets, and aggregate stats.</li>
            <li>• All administrative overrides and financial vouchers write to `/audit_logs`.</li>
            <li>• Demo records are explicitly marked with `DEMO RECORD` tags.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
