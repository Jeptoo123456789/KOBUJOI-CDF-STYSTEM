import React, { useState } from 'react';
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
} from '../types/cdf.ts';
import { AdminBursaryModules } from './AdminBursaryModules.tsx';
import { AdminProjectGovernanceModules } from './AdminProjectGovernanceModules.tsx';
import { seedDatabaseAsAdmin } from '../services/cdfFirestoreService.ts';
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck2,
  Award,
  Sliders,
  Building2,
  Briefcase,
  FolderKanban,
  Wallet,
  BarChart3,
  Megaphone,
  Bell,
  History,
  Settings,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';

export type AdminSection =
  | 'overview'
  | 'students'
  | 'applications'
  | 'documents'
  | 'awards'
  | 'criteria'
  | 'schools'
  | 'staff'
  | 'projects'
  | 'finances'
  | 'reports'
  | 'announcements'
  | 'notifications'
  | 'audit'
  | 'settings';

interface AdminStaffPortalProps {
  roleMode: 'admin' | 'staff';
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
  staffList: StaffRecord[];
  projects: ProjectRecord[];
  expenditures: ProjectExpenditure[];
  photos: ProjectPhoto[];
  announcements: Announcement[];
  notifications: NotificationRecord[];
  auditLogs: AuditLog[];
}

export const AdminStaffPortal: React.FC<AdminStaffPortalProps> = ({
  roleMode,
  currentUser,
  userProfile,
  onRequireSignIn,
  applications,
  documents,
  schools,
  criteriaList,
  staffList,
  projects,
  expenditures,
  photos,
  announcements,
  notifications,
  auditLogs,
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [feedback, setFeedback] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const actorName =
    userProfile?.fullName ||
    currentUser?.displayName ||
    currentUser?.email ||
    (roleMode === 'admin' ? 'CDF Administrator' : 'CDF Vetting Officer');

  const handleFeedback = (msg: string, isError?: boolean) => {
    setFeedback({ msg, isError });
    setTimeout(() => {
      setFeedback((prev) => (prev?.msg === msg ? null : prev));
    }, 6000);
  };

  const handleQuickSeed = async () => {
    if (!currentUser) {
      onRequireSignIn();
      return;
    }
    setIsSeeding(true);
    try {
      await seedDatabaseAsAdmin();
      handleFeedback('Kobujoi CDF master records synchronized to Firestore database.');
    } catch (err) {
      handleFeedback(
        err instanceof Error ? err.message : 'Unable to seed database (Admin privileges required).',
        true
      );
    } finally {
      setIsSeeding(false);
    }
  };

  // Computed KPIs for Overview
  const totalApplications = applications.length;
  const approvedOrPaidApps = applications.filter((a) =>
    ['Approved', 'Awarded', 'Allocated to School', 'Payment Processed', 'Completed'].includes(a.status)
  );
  const pendingReviewApps = applications.filter((a) =>
    ['Submitted', 'Under Review', 'Documents Required', 'Verification in Progress', 'Eligible'].includes(
      a.status
    )
  );
  const totalBursaryDisbursedKsh = applications.reduce(
    (sum, a) => sum + (Number(a.amountAwardedKsh) || 0),
    0
  );
  const totalProjectBudgetKsh = projects.reduce(
    (sum, p) => sum + (Number(p.approvedBudgetKsh) || 0),
    0
  );
  const totalProjectSpentKsh = projects.reduce(
    (sum, p) => sum + (Number(p.amountSpentKsh) || 0),
    0
  );
  const completedProjectsCount = projects.filter((p) => p.status === 'Completed').length;
  const ongoingProjectsCount = projects.filter((p) => p.status === 'Ongoing').length;

  const navGroups: {
    groupLabel: string;
    items: { id: AdminSection; label: string; icon: React.ReactNode; badge?: string | number }[];
  }[] = [
    {
      groupLabel: 'Command Center',
      items: [
        {
          id: 'overview',
          label: 'Executive Overview',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      groupLabel: 'Bursary Operations',
      items: [
        {
          id: 'applications',
          label: 'Applications Vetting',
          icon: <FileText className="w-4 h-4" />,
          badge: pendingReviewApps.length > 0 ? pendingReviewApps.length : undefined,
        },
        {
          id: 'documents',
          label: 'Document Verification',
          icon: <FileCheck2 className="w-4 h-4" />,
          badge: documents.filter((d) => d.verificationStatus === 'Pending Verification').length || undefined,
        },
        {
          id: 'awards',
          label: 'Awards & Allocations',
          icon: <Award className="w-4 h-4" />,
        },
        {
          id: 'students',
          label: 'Applicants Registry',
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: 'schools',
          label: 'Institutions & Banks',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          id: 'criteria',
          label: 'Eligibility Engine',
          icon: <Sliders className="w-4 h-4" />,
        },
      ],
    },
    {
      groupLabel: 'Constituency Development',
      items: [
        {
          id: 'projects',
          label: 'Projects & Milestones',
          icon: <FolderKanban className="w-4 h-4" />,
          badge: projects.length,
        },
        {
          id: 'finances',
          label: 'Budgets & Vouchers',
          icon: <Wallet className="w-4 h-4" />,
        },
        {
          id: 'staff',
          label: 'CDF Staff Directory',
          icon: <Briefcase className="w-4 h-4" />,
        },
      ],
    },
    {
      groupLabel: 'Governance & Reporting',
      items: [
        {
          id: 'reports',
          label: 'Reports & Exports',
          icon: <BarChart3 className="w-4 h-4" />,
        },
        {
          id: 'announcements',
          label: 'Public Notices',
          icon: <Megaphone className="w-4 h-4" />,
        },
        {
          id: 'notifications',
          label: 'Applicant Alerts',
          icon: <Bell className="w-4 h-4" />,
        },
        {
          id: 'audit',
          label: 'Immutable Audit Trail',
          icon: <History className="w-4 h-4" />,
        },
        {
          id: 'settings',
          label: 'Database & Settings',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F4F6F8] flex flex-col lg:flex-row">
      {/* Persistent Left Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-[#0B2A1E] text-stone-200 flex-shrink-0 border-r border-emerald-950 flex flex-col justify-between">
        <div>
          {/* Role Banner inside Sidebar */}
          <div className="p-4 border-b border-emerald-900/70 bg-[#071D15]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold">
                {roleMode === 'admin' ? 'NG-CDF Administrator' : 'CDF Staff Officer'}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-800/80 text-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {roleMode === 'admin' ? 'Full Control' : 'Vetting Mode'}
              </span>
            </div>
            <p className="text-xs font-semibold text-white truncate">{actorName}</p>
            <p className="text-[11px] text-emerald-300/70 truncate">
              {currentUser ? currentUser.email : 'Preview Session — Sign in to persist changes'}
            </p>
          </div>

          {/* Navigation Groups */}
          <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {navGroups.map((group) => (
              <div key={group.groupLabel}>
                <div className="px-2.5 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400/70 font-semibold">
                  {group.groupLabel}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs font-medium transition-colors ${
                          active
                            ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                            : 'text-stone-300 hover:bg-emerald-900/60 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 truncate">
                          {item.icon}
                          <span className="truncate">{item.label}</span>
                        </span>
                        {item.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                              active
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-emerald-900 text-emerald-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer info in Sidebar */}
        <div className="p-3 border-t border-emerald-900/70 bg-[#071D15] text-[11px] text-emerald-300/70">
          <div className="font-mono uppercase text-[10px] text-emerald-400">Kobujoi Ward MIS</div>
          <div>Aldai Constituency • FY 2025/2026</div>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <div className="flex-1 min-w-0 p-5 lg:p-7 space-y-6">
        {/* Auth Prompt Banner if not signed in */}
        {!currentUser && (
          <div className="bg-amber-50 border border-amber-300 rounded-md p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Interactive Read-Only Preview:</strong> You can explore all {roleMode === 'admin' ? 'Administrator' : 'CDF Staff'} modules and export PDF/CSV reports immediately. Sign in with Google to save changes or seed live Firestore records.
              </span>
            </div>
            <button
              onClick={onRequireSignIn}
              className="px-3 py-1.5 rounded bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition-colors"
            >
              Sign In to Enable Writes
            </button>
          </div>
        )}

        {/* Toast Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 rounded-md border flex items-center justify-between text-xs font-medium ${
              feedback.isError
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.isError ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              )}
              <span>{feedback.msg}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs underline ml-4 opacity-75 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SECTION 1: EXECUTIVE OVERVIEW */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Workspace Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-800 font-semibold">
                  Kobujoi Ward • Aldai Constituency NG-CDF
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {roleMode === 'admin'
                    ? 'Administrator Command & Governance Dashboard'
                    : 'CDF Staff Vetting & Field Operations Workspace'}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {roleMode === 'admin' && (
                  <button
                    onClick={handleQuickSeed}
                    disabled={isSeeding}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800"
                  >
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    {isSeeding ? 'Syncing Firestore...' : 'Sync Seed Dataset to Firestore'}
                  </button>
                )}
                <button
                  onClick={() => setActiveSection('applications')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0F4C3A] hover:bg-[#0B382B] text-white text-xs font-semibold"
                >
                  Open Vetting Queue ({pendingReviewApps.length})
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Single-Row 4-Card KPI Strip (Max 3 data points per card: Label, Primary Metric, Context) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-md border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Bursary Applications (FY 25/26)</div>
                <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {totalApplications}
                </div>
                <div className="mt-1 text-xs text-emerald-700 font-medium">
                  {approvedOrPaidApps.length} Approved • {pendingReviewApps.length} In Vetting Queue
                </div>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Total Bursary Awarded</div>
                <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-800 tabular-nums">
                  KSh {totalBursaryDisbursedKsh.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Across {schools.length} registered schools & institutions
                </div>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Constituency Projects</div>
                <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {projects.length} Projects
                </div>
                <div className="mt-1 text-xs text-emerald-700 font-medium">
                  {completedProjectsCount} Completed • {ongoingProjectsCount} Ongoing in Kobujoi
                </div>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200">
                <div className="text-xs font-medium text-slate-500">Project Capital Absorption</div>
                <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  KSh {(totalProjectSpentKsh / 1_000_000).toFixed(2)}M
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  of KSh {(totalProjectBudgetKsh / 1_000_000).toFixed(2)}M Approved (
                  {totalProjectBudgetKsh > 0
                    ? Math.round((totalProjectSpentKsh / totalProjectBudgetKsh) * 100)
                    : 0}
                  %)
                </div>
              </div>
            </div>

            {/* 2-Column Operational Workspace: Bursary Vetting Queue + Project Financial Utilization */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left 7 Cols: Priority Bursary Applications Queue */}
              <div className="xl:col-span-7 bg-white rounded-md border border-slate-200 overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Priority Bursary Vetting & Allocation Queue
                    </h2>
                    <p className="text-xs text-slate-500">
                      Ranked by configurable Kobujoi CDF need & vulnerability score
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSection('applications')}
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    Manage All ({applications.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                        <th className="py-2.5 px-3">Applicant</th>
                        <th className="py-2.5 px-3">Institution</th>
                        <th className="py-2.5 px-3 text-right">Need Score</th>
                        <th className="py-2.5 px-3 text-right">Awarded</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {applications.slice(0, 6).map((app) => (
                        <tr
                          key={app.applicationId}
                          onClick={() => setActiveSection('applications')}
                          className="hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{app.fullName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {app.applicationId} • {app.location}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-slate-800 truncate max-w-[170px]">{app.schoolName}</div>
                            <div className="text-[11px] text-slate-500">{app.schoolCategory}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                            {app.eligibilityScore}/100
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                            {app.amountAwardedKsh > 0
                              ? `KSh ${app.amountAwardedKsh.toLocaleString()}`
                              : `Req: ${app.amountRequestedKsh.toLocaleString()}`}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                ['Approved', 'Awarded', 'Allocated to School', 'Payment Processed', 'Completed'].includes(
                                  app.status
                                )
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : app.status === 'Rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right 5 Cols: Project Implementation & Budget Monitor */}
              <div className="xl:col-span-5 bg-white rounded-md border border-slate-200 overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Constituency Infrastructure Progress
                    </h2>
                    <p className="text-xs text-slate-500">
                      Physical completion vs financial disbursement
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSection('projects')}
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    Update Projects
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {projects.slice(0, 5).map((proj) => {
                    const spentPct =
                      proj.approvedBudgetKsh > 0
                        ? Math.min(100, Math.round((proj.amountSpentKsh / proj.approvedBudgetKsh) * 100))
                        : 0;
                    return (
                      <div key={proj.projectId} className="space-y-1.5 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                              {proj.projectName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {proj.location} • {proj.status}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-800">
                            {proj.percentageCompleted}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-[#0F4C3A]"
                            style={{ width: `${proj.percentageCompleted}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                          <span>Spent: KSh {proj.amountSpentKsh.toLocaleString()}</span>
                          <span>Budget: KSh {proj.approvedBudgetKsh.toLocaleString()} ({spentPct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Row: Quick Module Launchers & Recent Audit Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-md border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-emerald-800 font-semibold">
                    School Cheques & EFTs
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    Institution Bursary Schedules
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Generate printable PDF award statements and school beneficiary payment schedules for principals and bursars.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection('awards')}
                  className="mt-4 w-full py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Manage Awards & Disbursements
                </button>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-emerald-800 font-semibold">
                    Financial Transparency
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    Expenditure Vouchers & Audits
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {expenditures.length} verified payment vouchers recorded across {projects.length} development projects in Kobujoi Ward.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection('finances')}
                  className="mt-4 w-full py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Open Financial Ledger
                </button>
              </div>

              <div className="bg-white p-4 rounded-md border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-emerald-800 font-semibold">
                    Export Center
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    Official NG-CDF Returns (PDF / CSV)
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Download committee-ready bursary registers, project status returns, and financial expenditure schedules.
                  </p>
                </div>
                <button
                  onClick={() => setActiveSection('reports')}
                  className="mt-4 w-full py-2 rounded bg-[#0F4C3A] hover:bg-[#0B382B] text-white text-xs font-semibold"
                >
                  Generate Official Reports
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BURSARY MODULES */}
        {(activeSection === 'students' ||
          activeSection === 'applications' ||
          activeSection === 'documents' ||
          activeSection === 'awards' ||
          activeSection === 'criteria' ||
          activeSection === 'schools') && (
          <AdminBursaryModules
            activeSection={activeSection}
            roleMode={roleMode}
            actorName={actorName}
            applications={applications}
            documents={documents}
            schools={schools}
            criteriaList={criteriaList}
            onFeedback={handleFeedback}
          />
        )}

        {/* PROJECT & GOVERNANCE MODULES */}
        {(activeSection === 'staff' ||
          activeSection === 'projects' ||
          activeSection === 'finances' ||
          activeSection === 'reports' ||
          activeSection === 'announcements' ||
          activeSection === 'notifications' ||
          activeSection === 'audit' ||
          activeSection === 'settings') && (
          <AdminProjectGovernanceModules
            activeSection={activeSection}
            roleMode={roleMode}
            actorName={actorName}
            staffList={staffList}
            projects={projects}
            expenditures={expenditures}
            photos={photos}
            announcements={announcements}
            notifications={notifications}
            auditLogs={auditLogs}
            applications={applications}
            schools={schools}
            onFeedback={handleFeedback}
          />
        )}
      </div>
    </div>
  );
};
