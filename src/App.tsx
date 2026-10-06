/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider } from './lib/firebase.ts';
import {
  PortalViewMode,
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
} from './types/cdf.ts';
import {
  INITIAL_ELIGIBILITY_CRITERIA,
  INITIAL_SCHOOLS,
  INITIAL_STAFF,
  INITIAL_PROJECTS,
  INITIAL_EXPENDITURES,
  INITIAL_PROJECT_PHOTOS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_DEMO_APPLICATIONS,
} from './data/seedData.ts';
import {
  saveUserProfile,
  seedDatabaseAsAdmin,
} from './services/cdfFirestoreService.ts';
import { PublicPortal, PublicTab } from './components/PublicPortal.tsx';
import { StudentPortal } from './components/StudentPortal.tsx';
import { AdminStaffPortal } from './components/AdminStaffPortal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import {
  Landmark,
  LogIn,
  LogOut,
  Shield,
  GraduationCap,
  Briefcase,
  Globe,
} from 'lucide-react';

const BOOTSTRAP_ADMIN_EMAIL = 'thabitajeptoo004@gmail.com';

function mergeById<T>(seedItems: T[], firestoreItems: T[], idKey: keyof T): T[] {
  const map = new Map<string, T>();
  for (const item of seedItems) {
    const key = String(item[idKey]);
    map.set(key, item);
  }
  for (const item of firestoreItems) {
    const key = String(item[idKey]);
    map.set(key, item);
  }
  return Array.from(map.values());
}

export default function App() {
  const [portalMode, setPortalMode] = useState<PortalViewMode>('public');
  const [publicTab, setPublicTab] = useState<PublicTab>('home');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firestore Live Collections
  const [fsProjects, setFsProjects] = useState<ProjectRecord[]>([]);
  const [fsExpenditures, setFsExpenditures] = useState<ProjectExpenditure[]>([]);
  const [fsPhotos, setFsPhotos] = useState<ProjectPhoto[]>([]);
  const [fsAnnouncements, setFsAnnouncements] = useState<Announcement[]>([]);
  const [fsStaff, setFsStaff] = useState<StaffRecord[]>([]);
  const [fsCriteria, setFsCriteria] = useState<EligibilityCriteria[]>([]);
  const [fsSchools, setFsSchools] = useState<SchoolRecord[]>([]);
  const [fsApplications, setFsApplications] = useState<BursaryApplication[]>([]);
  const [fsDocuments, setFsDocuments] = useState<ApplicationDocument[]>([]);
  const [fsNotifications, setFsNotifications] = useState<NotificationRecord[]>([]);
  const [fsAuditLogs, setFsAuditLogs] = useState<AuditLog[]>([]);

  const isBootstrappedAdmin = Boolean(
    currentUser?.email &&
      currentUser.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL &&
      currentUser.emailVerified
  );

  const effectiveUserRole = isBootstrappedAdmin
    ? 'admin'
    : userProfile?.role || 'student';

  // 1. Listen to Firebase Auth state & bootstrap profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const isDefaultAdmin =
          user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified;

        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
        } else {
          const initialProfile: UserProfile = {
            uid: user.uid,
            email: user.email || 'resident@kobujoi.go.ke',
            fullName: user.displayName || 'Kobujoi Resident',
            role: isDefaultAdmin ? 'admin' : 'student',
            department: isDefaultAdmin ? 'Administration & Governance' : 'Kobujoi Ward',
            phone: '+254 700 000 000',
          };
          await saveUserProfile(initialProfile, true);
          setUserProfile(initialProfile);
        }

        if (isDefaultAdmin) {
          seedDatabaseAsAdmin().catch((err) => {
            console.warn('Auto-seed skipped or already populated:', err);
          });
        }
      } catch (err) {
        console.warn('Profile bootstrap notice:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // 2. Public Firestore Subscriptions (Strictly filtered by isPublic == true where required by rules)
  useEffect(() => {
    const qProjects = query(collection(db, 'projects'), where('isPublic', '==', true));
    const unsubProjects = onSnapshot(
      qProjects,
      (snap) => {
        setFsProjects(snap.docs.map((d) => d.data() as ProjectRecord));
      },
      (err) => console.warn('Public projects listener notice:', err.message)
    );

    const qExp = query(collection(db, 'project_expenditures'), where('isPublic', '==', true));
    const unsubExp = onSnapshot(
      qExp,
      (snap) => {
        setFsExpenditures(snap.docs.map((d) => d.data() as ProjectExpenditure));
      },
      (err) => console.warn('Public expenditures listener notice:', err.message)
    );

    const qPhotos = query(collection(db, 'project_photos'), where('isPublic', '==', true));
    const unsubPhotos = onSnapshot(
      qPhotos,
      (snap) => {
        setFsPhotos(snap.docs.map((d) => d.data() as ProjectPhoto));
      },
      (err) => console.warn('Public photos listener notice:', err.message)
    );

    const qAnn = query(collection(db, 'announcements'), where('isPublic', '==', true));
    const unsubAnn = onSnapshot(
      qAnn,
      (snap) => {
        setFsAnnouncements(snap.docs.map((d) => d.data() as Announcement));
      },
      (err) => console.warn('Public announcements listener notice:', err.message)
    );

    const qStaff = query(collection(db, 'staff_records'), where('isPublic', '==', true));
    const unsubStaff = onSnapshot(
      qStaff,
      (snap) => {
        setFsStaff(snap.docs.map((d) => d.data() as StaffRecord));
      },
      (err) => console.warn('Public staff listener notice:', err.message)
    );

    const unsubCriteria = onSnapshot(
      collection(db, 'eligibility_criteria'),
      (snap) => {
        setFsCriteria(snap.docs.map((d) => d.data() as EligibilityCriteria));
      },
      (err) => console.warn('Eligibility criteria listener notice:', err.message)
    );

    const unsubSchools = onSnapshot(
      collection(db, 'schools'),
      (snap) => {
        setFsSchools(snap.docs.map((d) => d.data() as SchoolRecord));
      },
      (err) => console.warn('Schools listener notice:', err.message)
    );

    return () => {
      unsubProjects();
      unsubExp();
      unsubPhotos();
      unsubAnn();
      unsubStaff();
      unsubCriteria();
      unsubSchools();
    };
  }, []);

  // 3. Authenticated User / Staff / Admin Subscriptions
  useEffect(() => {
    if (!authReady || !currentUser) {
      setFsApplications([]);
      setFsDocuments([]);
      setFsNotifications([]);
      setFsAuditLogs([]);
      return;
    }

    const isStaffOrAdmin =
      effectiveUserRole === 'admin' || effectiveUserRole === 'staff';

    const appsQuery = isStaffOrAdmin
      ? collection(db, 'bursary_applications')
      : query(
          collection(db, 'bursary_applications'),
          where('applicantUid', '==', currentUser.uid)
        );

    const unsubApps = onSnapshot(
      appsQuery,
      (snap) => {
        setFsApplications(snap.docs.map((d) => d.data() as BursaryApplication));
      },
      (err) => console.warn('Applications listener notice:', err.message)
    );

    const docsQuery = isStaffOrAdmin
      ? collection(db, 'application_documents')
      : query(
          collection(db, 'application_documents'),
          where('applicantUid', '==', currentUser.uid)
        );

    const unsubDocs = onSnapshot(
      docsQuery,
      (snap) => {
        setFsDocuments(snap.docs.map((d) => d.data() as ApplicationDocument));
      },
      (err) => console.warn('Documents listener notice:', err.message)
    );

    const notifQuery = isStaffOrAdmin
      ? collection(db, 'notifications')
      : query(
          collection(db, 'notifications'),
          where('recipientUid', 'in', [currentUser.uid, 'ALL_APPLICANTS'])
        );

    const unsubNotifs = onSnapshot(
      notifQuery,
      (snap) => {
        setFsNotifications(snap.docs.map((d) => d.data() as NotificationRecord));
      },
      (err) => console.warn('Notifications listener notice:', err.message)
    );

    let unsubAudit = () => {};
    if (isStaffOrAdmin) {
      unsubAudit = onSnapshot(
        collection(db, 'audit_logs'),
        (snap) => {
          setFsAuditLogs(snap.docs.map((d) => d.data() as AuditLog));
        },
        (err) => console.warn('Audit log listener notice:', err.message)
      );
    }

    return () => {
      unsubApps();
      unsubDocs();
      unsubNotifs();
      unsubAudit();
    };
  }, [authReady, currentUser, effectiveUserRole]);

  // Merge Seed Dataset + Live Firestore Records for Seamless Immediate Operations
  const mergedProjects = useMemo(
    () => mergeById(INITIAL_PROJECTS, fsProjects, 'projectId'),
    [fsProjects]
  );
  const mergedExpenditures = useMemo(
    () => mergeById(INITIAL_EXPENDITURES, fsExpenditures, 'expenditureId'),
    [fsExpenditures]
  );
  const mergedPhotos = useMemo(
    () => mergeById(INITIAL_PROJECT_PHOTOS, fsPhotos, 'photoId'),
    [fsPhotos]
  );
  const mergedAnnouncements = useMemo(
    () => mergeById(INITIAL_ANNOUNCEMENTS, fsAnnouncements, 'announcementId'),
    [fsAnnouncements]
  );
  const mergedStaff = useMemo(
    () => mergeById(INITIAL_STAFF, fsStaff, 'staffId'),
    [fsStaff]
  );
  const mergedCriteria = useMemo(
    () => mergeById(INITIAL_ELIGIBILITY_CRITERIA, fsCriteria, 'criteriaId'),
    [fsCriteria]
  );
  const mergedSchools = useMemo(
    () => mergeById(INITIAL_SCHOOLS, fsSchools, 'schoolId'),
    [fsSchools]
  );
  const mergedApplications = useMemo(
    () => mergeById(INITIAL_DEMO_APPLICATIONS, fsApplications, 'applicationId'),
    [fsApplications]
  );

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign-in popup closed or blocked.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setPortalMode('public');
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#FBFBF9] text-slate-900">
        {/* TOP BAR CONTRACT: Single Row, 3 Zones (Brand Left, Public Nav Center, Role Switcher & Auth Right) */}
        <header className="sticky top-0 z-40 h-16 bg-[#0B2A1E] text-white border-b border-emerald-900/80 px-4 lg:px-8 flex items-center justify-between gap-4 no-print">
          {/* Zone 1: Brand Identity */}
          <button
            onClick={() => {
              setPortalMode('public');
              setPublicTab('home');
            }}
            className="flex items-center gap-3 text-left group shrink-0"
          >
            <div className="w-9 h-9 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors">
                  KOBUJOI CDF
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-200 border border-emerald-700">
                  ALDAI • NANDI
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 hidden sm:block">
                Bursary & Constituency Development System
              </p>
            </div>
          </button>

          {/* Zone 2: Primary Public Navigation (Visible when in Public Portal, max 5 items) */}
          {portalMode === 'public' ? (
            <nav className="hidden xl:flex items-center gap-1">
              {(
                [
                  { id: 'home', label: 'Overview' },
                  { id: 'projects', label: 'Projects & Map' },
                  { id: 'transparency', label: 'Transparency Ledger' },
                  { id: 'status-check', label: 'Bursary Status Check' },
                  { id: 'staff', label: 'CDF Staff & Contacts' },
                ] as { id: PublicTab; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPublicTab(item.id)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    publicTab === item.id
                      ? 'bg-emerald-800 text-amber-300 font-semibold'
                      : 'text-emerald-100/80 hover:text-white hover:bg-emerald-900/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : (
            <div className="hidden xl:flex items-center gap-2 text-xs text-emerald-200">
              <span className="px-2.5 py-1 rounded bg-emerald-900/90 border border-emerald-700 font-mono">
                Active Workspace: {portalMode.toUpperCase()} PORTAL
              </span>
            </div>
          )}

          {/* Zone 3: Role Workspace Switcher & Authentication */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Role Portal Switcher */}
            <div className="flex items-center bg-[#071D15] p-1 rounded border border-emerald-800/80">
              <button
                onClick={() => setPortalMode('public')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  portalMode === 'public'
                    ? 'bg-emerald-700 text-white font-semibold'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
                title="Public Citizen Portal"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Public</span>
              </button>

              <button
                onClick={() => setPortalMode('student')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  portalMode === 'student'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
                title="Student / Applicant Bursary Portal"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Student Portal</span>
              </button>

              <button
                onClick={() => setPortalMode('staff')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  portalMode === 'staff'
                    ? 'bg-emerald-700 text-white font-semibold'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
                title="CDF Staff Vetting & Operations Portal"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden md:inline">CDF Staff</span>
              </button>

              <button
                onClick={() => setPortalMode('admin')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  portalMode === 'admin'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
                title="CDF Administrator Portal"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Admin</span>
              </button>
            </div>

            {/* Auth CTA */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline-block text-xs text-emerald-200 max-w-[140px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-900 hover:bg-red-900/80 text-xs font-medium text-emerald-100 border border-emerald-700 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Secondary Mobile Navigation Bar for Public Tabs */}
        {portalMode === 'public' && (
          <div className="xl:hidden bg-[#0F3828] border-b border-emerald-900 px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-print">
            {(
              [
                { id: 'home', label: 'Overview' },
                { id: 'projects', label: 'Projects & Map' },
                { id: 'transparency', label: 'Transparency' },
                { id: 'status-check', label: 'Status Check' },
                { id: 'staff', label: 'Staff & Contacts' },
              ] as { id: PublicTab; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setPublicTab(item.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  publicTab === item.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-emerald-100 hover:bg-emerald-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Auth Error Notice */}
        {authError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-xs text-red-800 flex items-center justify-between">
            <span>Authentication Notice: {authError}</span>
            <button onClick={() => setAuthError(null)} className="underline font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* MAIN PORTAL VIEWPORT */}
        <main className="flex-1">
          {portalMode === 'public' && (
            <PublicPortal
              activeTab={publicTab}
              onChangeTab={setPublicTab}
              onApplyForBursary={() => setPortalMode('student')}
              projects={mergedProjects.filter((p) => p.isPublic)}
              expenditures={mergedExpenditures.filter((e) => e.isPublic)}
              photos={mergedPhotos.filter((ph) => ph.isPublic)}
              announcements={mergedAnnouncements.filter((a) => a.isPublic)}
              staffList={mergedStaff.filter((s) => s.isPublic)}
              criteriaList={mergedCriteria.filter((c) => c.isActive)}
              schools={mergedSchools}
              publicStatusLookupPool={mergedApplications}
            />
          )}

          {portalMode === 'student' && (
            <StudentPortal
              currentUser={
                currentUser
                  ? {
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      displayName: currentUser.displayName || 'Student Applicant',
                    }
                  : null
              }
              userProfile={userProfile}
              onRequireSignIn={handleGoogleSignIn}
              applications={mergedApplications}
              documents={fsDocuments}
              schools={mergedSchools}
              criteriaList={mergedCriteria}
              notifications={fsNotifications}
              isAdminUser={effectiveUserRole === 'admin'}
            />
          )}

          {(portalMode === 'staff' || portalMode === 'admin') && (
            <AdminStaffPortal
              roleMode={portalMode}
              currentUser={
                currentUser
                  ? {
                      uid: currentUser.uid,
                      email: currentUser.email || '',
                      displayName: currentUser.displayName || 'CDF Officer',
                    }
                  : null
              }
              userProfile={userProfile}
              onRequireSignIn={handleGoogleSignIn}
              applications={mergedApplications}
              documents={fsDocuments}
              schools={mergedSchools}
              criteriaList={mergedCriteria}
              staffList={mergedStaff}
              projects={mergedProjects}
              expenditures={mergedExpenditures}
              photos={mergedPhotos}
              announcements={mergedAnnouncements}
              notifications={fsNotifications}
              auditLogs={fsAuditLogs}
            />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
