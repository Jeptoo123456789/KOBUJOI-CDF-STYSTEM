import React, { useState } from 'react';
import {
  ProjectRecord,
  ProjectExpenditure,
  ProjectPhoto,
  Announcement,
  StaffRecord,
  EligibilityCriteria,
  SchoolRecord,
  BursaryApplication,
} from '../types/cdf.ts';
import { ASSET_IMAGES } from '../data/seedData.ts';
import { ProjectMap } from './ProjectMap.tsx';
import {
  Search,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Building2,
  Phone,
  Mail,
  Eye,
  X,
  SlidersHorizontal,
  ShieldCheck,
  GraduationCap,
  Landmark,
  Camera,
} from 'lucide-react';

export type PublicTab = 'home' | 'projects' | 'transparency' | 'status-check' | 'staff';

interface PublicPortalProps {
  activeTab: PublicTab;
  onChangeTab: (tab: PublicTab) => void;
  onApplyForBursary: () => void;
  projects: ProjectRecord[];
  expenditures: ProjectExpenditure[];
  photos: ProjectPhoto[];
  announcements: Announcement[];
  staffList: StaffRecord[];
  criteriaList: EligibilityCriteria[];
  schools: SchoolRecord[];
  publicStatusLookupPool: BursaryApplication[];
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  activeTab,
  onChangeTab,
  onApplyForBursary,
  projects,
  expenditures,
  photos,
  announcements,
  staffList,
  criteriaList,
  schools,
  publicStatusLookupPool,
}) => {
  // Project Directory Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Gallery Stage Filter & Lightbox
  const [photoStageFilter, setPhotoStageFilter] = useState<'ALL' | 'Before' | 'During Construction' | 'Completed'>('ALL');
  const [lightboxPhoto, setLightboxPhoto] = useState<ProjectPhoto | null>(null);

  // Selected Project Detail Modal
  const [inspectedProject, setInspectedProject] = useState<ProjectRecord | null>(null);

  // Public Status Lookup State
  const [lookupRef, setLookupRef] = useState('KBG-BURS-2026-000001');
  const [lookupResult, setLookupResult] = useState<BursaryApplication | null | 'NOT_FOUND'>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  // Publicly approved collections only
  const publicProjects = projects.filter((p) => p.isPublic);
  const publicExpenditures = expenditures.filter((e) => e.isPublic);
  const publicPhotos = photos.filter((ph) => ph.isPublic);
  const publicAnnouncements = announcements.filter((a) => a.isPublic);
  const publicStaff = staffList.filter((s) => s.isPublic && s.status === 'Active');
  const activeCriteria = criteriaList.filter((c) => c.isActive);

  // Aggregate Portfolio Metrics
  const totalProjects = publicProjects.length;
  const completedProjects = publicProjects.filter((p) => p.status === 'Completed').length;
  const ongoingProjects = publicProjects.filter((p) => p.status === 'Ongoing').length;
  const proposedOrProcurement = publicProjects.filter((p) =>
    ['Proposed', 'Approved', 'Planning', 'Procurement'].includes(p.status)
  ).length;

  const totalProjectBudget = publicProjects.reduce((sum, p) => sum + p.approvedBudgetKsh, 0);
  const totalProjectSpent = publicProjects.reduce((sum, p) => sum + p.amountSpentKsh, 0);
  const overallBudgetUtilization =
    totalProjectBudget > 0 ? Math.round((totalProjectSpent / totalProjectBudget) * 100) : 0;

  const totalBursaryBeneficiaries = schools.reduce((sum, s) => sum + s.beneficiaryCount, 0);
  const totalBursaryAllocated = schools.reduce((sum, s) => sum + s.totalAllocatedKsh, 0);
  const totalBursaryPaid = schools.reduce((sum, s) => sum + s.totalPaidKsh, 0);

  // Filtered Projects for Directory
  const filteredDirectoryProjects = publicProjects.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'ALL' || p.financialYear === yearFilter;
    const matchesLoc = locationFilter === 'ALL' || p.location === locationFilter;
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesYear && matchesLoc && matchesCat && matchesStatus;
  });

  const filteredGalleryPhotos = publicPhotos.filter(
    (ph) => photoStageFilter === 'ALL' || ph.stage === photoStageFilter
  );

  const handleStatusLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = lookupRef.trim().toUpperCase();
    if (!cleaned) return;
    const found = publicStatusLookupPool.find(
      (a) => a.applicationId.toUpperCase() === cleaned
    );
    setLookupResult(found || 'NOT_FOUND');
  };

  // Group by category for Transparency Charts
  const categoriesList = Array.from(new Set(publicProjects.map((p) => p.category)));
  const categoryStats = categoriesList.map((cat) => {
    const projs = publicProjects.filter((p) => p.category === cat);
    const budget = projs.reduce((s, p) => s + p.approvedBudgetKsh, 0);
    const spent = projs.reduce((s, p) => s + p.amountSpentKsh, 0);
    const count = projs.length;
    return { category: cat, budget, spent, count };
  });

  // Group by location for Ward Distribution
  const locationsList = Array.from(new Set(publicProjects.map((p) => p.location)));
  const locationStats = locationsList.map((loc) => {
    const projs = publicProjects.filter((p) => p.location === loc);
    const budget = projs.reduce((s, p) => s + p.approvedBudgetKsh, 0);
    const spent = projs.reduce((s, p) => s + p.amountSpentKsh, 0);
    const avgProgress =
      projs.length > 0
        ? Math.round(projs.reduce((s, p) => s + p.percentageCompleted, 0) / projs.length)
        : 0;
    return { location: loc, count: projs.length, budget, spent, avgProgress };
  });

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">
      {/* Sub-Navigation Bar for Public Sections */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => onChangeTab('home')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'home'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Overview & Bursary Info
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('projects')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'projects'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Public Project Directory ({totalProjects})
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('transparency')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'transparency'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Financial Transparency Dashboard
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('status-check')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'status-check'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Check Application Status
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('staff')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'staff'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            CDF Office & Staff Directory
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          Kobujoi Ward · Aldai Constituency · Nandi County · FY 2025/2026
        </p>
      </div>

      {/* =====================================================================
          TAB 1: HOMEPAGE
      ===================================================================== */}
      {activeTab === 'home' && (
        <div className="space-y-16">
          {/* 1. HERO SECTION */}
          <section className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-[#0B4F32]">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 flex flex-col justify-between text-white z-10">
                <div>
                  <p className="text-xs text-emerald-200 tracking-wide">
                    Kobujoi Ward · Aldai Constituency · Nandi County, Republic of Kenya
                  </p>
                  <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-display font-bold leading-[1.15] mt-3 text-white">
                    KOBUJOI CDF — Empowering Education. Supporting Communities. Building Kobujoi.
                  </h1>
                  <p className="text-sm sm:text-base text-emerald-50/90 mt-4 max-w-xl leading-relaxed">
                    Official-style digital governance portal for student bursary applications,
                    configurable vulnerability vetting, school fee allocations, and real-time
                    constituency infrastructure financial tracking.
                  </p>
                </div>

                {/* 4 Required Hero Action Buttons */}
                <div className="mt-8 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={onApplyForBursary}
                      className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <span>Apply for Bursary</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeTab('status-check')}
                      className="px-4 py-3 bg-white/15 hover:bg-white/25 text-white font-medium text-xs sm:text-sm rounded-lg border border-white/25 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Check Application Status
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => onChangeTab('projects')}
                      className="px-4 py-2.5 bg-transparent hover:bg-white/10 text-emerald-100 text-xs font-medium rounded-lg border border-emerald-300/30 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      View Constituency Projects
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeTab('transparency')}
                      className="px-4 py-2.5 bg-transparent hover:bg-white/10 text-emerald-100 text-xs font-medium rounded-lg border border-emerald-300/30 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Transparency Dashboard
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-full bg-neutral-900">
                {!imgErrors['hero'] ? (
                  <img
                    src={ASSET_IMAGES.heroBanner}
                    alt="Kobujoi Ward modern secondary school science complex and green tea highlands in Nandi County"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErrors((p) => ({ ...p, hero: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0B4F32] to-[#072E1D]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent lg:bg-gradient-to-r lg:from-[#0B4F32] lg:via-[#0B4F32]/30 lg:to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-lg bg-black/65 backdrop-blur-xs text-white border border-white/15">
                  <p className="text-xs text-emerald-300 font-mono tabular-nums">
                    FY 2025/2026 ACTIVE INTAKE & INFRASTRUCTURE PORTFOLIO
                  </p>
                  <p className="text-xs text-white/90 mt-1">
                    {totalBursaryBeneficiaries} Students Supported Across {schools.length} Institutions ·{' '}
                    {totalProjects} Capital Projects Tracked
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. KEY CONSTITUENCY & BURSARY METRICS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <span className="text-xs text-neutral-500">Bursary Funds Allocated (FY 25/26)</span>
              <p className="text-2xl font-mono font-semibold text-neutral-900 tabular-nums mt-1.5">
                KSh {totalBursaryAllocated.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-600 mt-2">
                Disbursed: KSh {totalBursaryPaid.toLocaleString()} · {totalBursaryBeneficiaries} Beneficiaries
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <span className="text-xs text-neutral-500">Approved Infrastructure Budget</span>
              <p className="text-2xl font-mono font-semibold text-neutral-900 tabular-nums mt-1.5">
                KSh {totalProjectBudget.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-600 mt-2">
                {totalProjects} Ward Projects · {completedProjects} Completed · {ongoingProjects} Ongoing
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <span className="text-xs text-neutral-500">Verified Project Expenditure</span>
              <p className="text-2xl font-mono font-semibold text-[#0B4F32] tabular-nums mt-1.5">
                KSh {totalProjectSpent.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-600 mt-2">
                {overallBudgetUtilization}% Budget Utilization · Balance KSh{' '}
                {Math.max(0, totalProjectBudget - totalProjectSpent).toLocaleString()}
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-5">
              <span className="text-xs text-neutral-500">Partner Schools & Institutions</span>
              <p className="text-2xl font-mono font-semibold text-neutral-900 tabular-nums mt-1.5">
                {schools.length} Institutions
              </p>
              <p className="text-xs text-neutral-600 mt-2">
                Secondary, Public TVETs & Universities verified for direct EFT/Cheque
              </p>
            </div>
          </section>

          {/* 3. LATEST ANNOUNCEMENTS & IMPORTANT BURSARY REQUIREMENTS */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <h2 className="text-xl font-display font-semibold text-neutral-900">
                    01. Official Constituency Announcements
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Bursary opening dates, application deadlines, and public accountability notices
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {publicAnnouncements.map((ann) => (
                  <article
                    key={ann.announcementId}
                    className="bg-white border border-neutral-200 rounded-xl p-5 transition-colors hover:border-neutral-300"
                  >
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="font-semibold text-[#0B4F32]">{ann.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Effective: {ann.effectiveDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-amber-800">
                        Deadline: {ann.deadlineDate}
                      </span>
                      {ann.isDemo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-mono">DEMO NOTICE</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-neutral-900 mt-2">
                      {ann.title}
                    </h3>
                    <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">
                      {ann.content}
                    </p>
                    <p className="text-xs text-neutral-400 mt-3">
                      Published by {ann.publishedBy}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            {/* Configurable Eligibility Criteria & Application Requirements */}
            <div className="lg:col-span-5 space-y-4">
              <div className="border-b border-neutral-200 pb-3">
                <h2 className="text-xl font-display font-semibold text-neutral-900">
                  02. Bursary Eligibility & Required Documents
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Configured by the Kobujoi NG-CDF Bursary Vetting Committee
                </p>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Every student application undergoes transparent pre-assessment against the
                  officially configured criteria below, followed by mandatory document verification
                  by CDF staff and final approval by the Bursary Committee.
                </p>

                <div className="divide-y divide-neutral-200">
                  {activeCriteria.map((crit) => (
                    <div key={crit.criteriaId} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-neutral-900">
                          {crit.categoryName}
                        </h4>
                        <span className="text-xs font-mono text-[#0B4F32] tabular-nums shrink-0">
                          Max KSh {crit.maxAwardKsh.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1">{crit.description}</p>
                      <p className="text-xs text-neutral-500 mt-1.5 font-mono tabular-nums">
                        Priority: {crit.priorityLevel} · Max Weight: {crit.maxPoints} pts · Income Ceiling: KSh{' '}
                        {crit.maxHouseholdIncomeKsh.toLocaleString()}/mo
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Required Docs: {crit.requiredDocuments}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-neutral-200 flex items-center justify-between gap-3">
                  <span className="text-xs text-neutral-500">
                    Formats accepted: PDF, JPG, PNG (Max 5MB per document)
                  </span>
                  <button
                    type="button"
                    onClick={onApplyForBursary}
                    className="px-4 py-2 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Start Application
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 4. FEATURED DEVELOPMENT PROJECTS */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-3">
              <div>
                <h2 className="text-2xl font-display font-semibold text-neutral-900">
                  03. Featured Constituency Development Projects
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Verified infrastructure investments across Kobujoi Township, Kapkoros, Chepkumia, and Kaptumo-Kaboi
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChangeTab('projects')}
                className="text-xs font-semibold text-[#0B4F32] hover:underline flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <span>Explore Full Project Directory ({totalProjects})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicProjects.slice(0, 3).map((proj) => {
                const utilPercent =
                  proj.approvedBudgetKsh > 0
                    ? Math.round((proj.amountSpentKsh / proj.approvedBudgetKsh) * 100)
                    : 0;
                return (
                  <div
                    key={proj.projectId}
                    className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-48 bg-neutral-200 border-b border-neutral-200">
                        {!imgErrors[proj.projectId] && proj.primaryPhotoUrl ? (
                          <img
                            src={proj.primaryPhotoUrl}
                            alt={proj.projectName}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setImgErrors((prev) => ({ ...prev, [proj.projectId]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#0B4F32] to-neutral-800 flex items-center justify-center text-white p-4 text-center text-xs">
                            {proj.projectName}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 text-white flex items-center justify-between text-xs font-mono tabular-nums">
                          <span>{proj.projectId}</span>
                          <span>{proj.percentageCompleted}% Complete</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <span className="font-semibold text-[#0B4F32]">{proj.status}</span>
                          <span aria-hidden="true">·</span>
                          <span>{proj.subLocation}</span>
                          <span aria-hidden="true">·</span>
                          <span>FY {proj.financialYear}</span>
                        </div>

                        <h3 className="text-base font-semibold text-neutral-900 mt-1.5 leading-snug">
                          {proj.projectName}
                        </h3>

                        <p className="text-xs text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                          {proj.description}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-3 border-t border-neutral-100 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-neutral-500 block">Approved Budget</span>
                          <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                            KSh {proj.approvedBudgetKsh.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block">Spent ({utilPercent}%)</span>
                          <span className="font-mono font-semibold text-[#0B4F32] tabular-nums">
                            KSh {proj.amountSpentKsh.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0B4F32]"
                          style={{ width: `${proj.percentageCompleted}%` }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setInspectedProject(proj)}
                        className="w-full py-2 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Expenditure & Photo Evidence</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. INTERACTIVE GEOSPATIAL PROJECT MAP */}
          <section className="space-y-4">
            <ProjectMap
              projects={publicProjects}
              onSelectProjectDetail={(proj) => setInspectedProject(proj)}
            />
          </section>

          {/* 6. PROJECT PHOTOGRAPHS GALLERY WITH STAGE FILTER & LIGHTBOX */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-3">
              <div>
                <h2 className="text-2xl font-display font-semibold text-neutral-900">
                  04. Photographic Verification Gallery
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Visual inspection of Before, During Construction, and Completed constituency projects
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
                {(['ALL', 'Before', 'During Construction', 'Completed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPhotoStageFilter(st)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      photoStageFilter === st
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Stages' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredGalleryPhotos.map((ph) => (
                <div
                  key={ph.photoId}
                  className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between group cursor-pointer"
                  onClick={() => setLightboxPhoto(ph)}
                >
                  <div className="relative h-44 bg-neutral-200 overflow-hidden">
                    {!imgErrors[ph.photoId] && ph.imageUrl ? (
                      <img
                        src={ph.imageUrl}
                        alt={ph.caption}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImgErrors((prev) => ({ ...prev, [ph.photoId]: true }))
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white p-4 text-xs text-center">
                        {ph.projectName}
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2.5 text-white text-xs font-mono">
                      Stage: {ph.stage}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-neutral-900 line-clamp-1">
                      {ph.projectName}
                    </p>
                    <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{ph.caption}</p>
                    <p className="text-[11px] text-neutral-400 mt-2 font-mono tabular-nums">
                      {ph.uploadDate} · {ph.photographer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: PUBLIC PROJECT DIRECTORY
      ===================================================================== */}
      {activeTab === 'projects' && (
        <div className="space-y-8">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-200">
              <div>
                <h2 className="text-2xl font-display font-semibold text-neutral-900">
                  Public Constituency Project Directory
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Search and inspect approved budgets, contract awards, expenditure vouchers, and milestones across Kobujoi Ward
                </p>
              </div>
              <div className="text-xs font-mono text-neutral-600 tabular-nums">
                Showing {filteredDirectoryProjects.length} of {publicProjects.length} Approved Projects
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search project name, ID, sub-location..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F32]"
                />
              </div>

              <select
                aria-label="Filter by Location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white text-neutral-800"
              >
                <option value="ALL">All Locations (Kobujoi Ward)</option>
                {locationsList.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white text-neutral-800"
              >
                <option value="ALL">All Sector Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-neutral-300 rounded-lg px-3 py-2 bg-white text-neutral-800"
              >
                <option value="ALL">All Project Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Procurement">Procurement</option>
                <option value="Proposed">Proposed</option>
              </select>
            </div>
          </div>

          {filteredDirectoryProjects.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center space-y-3">
              <p className="text-sm font-medium text-neutral-800">
                No constituency projects match your current filter selection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setYearFilter('ALL');
                  setLocationFilter('ALL');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="px-4 py-2 bg-[#0B4F32] text-white text-xs font-medium rounded-lg"
              >
                Reset Directory Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDirectoryProjects.map((proj) => {
                const remaining = Math.max(0, proj.approvedBudgetKsh - proj.amountSpentKsh);
                const utilPercent =
                  proj.approvedBudgetKsh > 0
                    ? Math.round((proj.amountSpentKsh / proj.approvedBudgetKsh) * 100)
                    : 0;
                const projExps = publicExpenditures.filter((e) => e.projectId === proj.projectId);

                return (
                  <div
                    key={proj.projectId}
                    className="bg-white border border-neutral-200 rounded-xl p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                  >
                    <div className="lg:col-span-3">
                      <div className="relative h-44 rounded-lg overflow-hidden bg-neutral-200 border border-neutral-200">
                        {!imgErrors[proj.projectId] && proj.primaryPhotoUrl ? (
                          <img
                            src={proj.primaryPhotoUrl}
                            alt={proj.projectName}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setImgErrors((p) => ({ ...p, [proj.projectId]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#0B4F32] text-white p-4 text-xs text-center">
                            {proj.projectName}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 text-white text-xs font-mono tabular-nums">
                          {proj.projectId} · FY {proj.financialYear}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-6 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                        <span className="font-semibold text-[#0B4F32]">{proj.status}</span>
                        <span aria-hidden="true">·</span>
                        <span>{proj.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {proj.location} ({proj.subLocation} — {proj.village})
                        </span>
                        {proj.isDemo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-700 font-mono">DEMO RECORD</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-neutral-900">
                        {proj.projectName}
                      </h3>

                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {proj.description}
                      </p>

                      <p className="text-xs text-neutral-700 pt-1">
                        <span className="font-semibold">Current Stage:</span> {proj.currentStage}
                      </p>
                      <p className="text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-700">Milestones:</span>{' '}
                        {proj.milestonesSummary}
                      </p>
                    </div>

                    <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-neutral-200 pt-4 lg:pt-0 lg:pl-6 space-y-3">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Approved Budget:</span>
                          <span className="font-mono font-semibold text-neutral-900 tabular-nums">
                            KSh {proj.approvedBudgetKsh.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Total Spent:</span>
                          <span className="font-mono font-semibold text-[#0B4F32] tabular-nums">
                            KSh {proj.amountSpentKsh.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Remaining Balance:</span>
                          <span className="font-mono text-neutral-800 tabular-nums">
                            KSh {remaining.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Budget Utilization:</span>
                          <span className="font-mono font-semibold tabular-nums">{utilPercent}%</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-500">Physical Completion</span>
                          <span className="font-mono font-semibold tabular-nums">
                            {proj.percentageCompleted}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0B4F32]"
                            style={{ width: `${proj.percentageCompleted}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setInspectedProject(proj)}
                        className="w-full py-2.5 px-4 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect {projExps.length} Vouchers & Timeline</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: PUBLIC FINANCIAL TRANSPARENCY DASHBOARD
      ===================================================================== */}
      {activeTab === 'transparency' && (
        <div className="space-y-10">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <p className="text-xs text-neutral-500">
              Public Finance Accountability · NG-CDF Kobujoi Ward · Aldai Constituency
            </p>
            <h2 className="text-2xl font-display font-semibold text-neutral-900 mt-1">
              Citizen Financial & Project Transparency Dashboard
            </h2>
            <p className="text-xs text-neutral-600 mt-1.5 max-w-3xl">
              Real-time public disclosure of approved project budgets, certified expenditure
              vouchers, sub-location infrastructure equity, and aggregate school bursary
              allocations. Private student records remain strictly protected.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-neutral-200">
              <div>
                <span className="text-xs text-neutral-500">Total Approved Project Budgets</span>
                <p className="text-2xl font-mono font-semibold text-neutral-900 tabular-nums mt-1">
                  KSh {totalProjectBudget.toLocaleString()}
                </p>
                <span className="text-xs text-neutral-500">
                  Across {totalProjects} public capital projects
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-500">Certified Project Expenditure</span>
                <p className="text-2xl font-mono font-semibold text-[#0B4F32] tabular-nums mt-1">
                  KSh {totalProjectSpent.toLocaleString()}
                </p>
                <span className="text-xs text-neutral-500">
                  {overallBudgetUtilization}% utilization ({publicExpenditures.length} vouchers)
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-500">Remaining Unspent Project Balance</span>
                <p className="text-2xl font-mono font-semibold text-neutral-900 tabular-nums mt-1">
                  KSh {Math.max(0, totalProjectBudget - totalProjectSpent).toLocaleString()}
                </p>
                <span className="text-xs text-neutral-500">Held in Constituency Treasury Account</span>
              </div>
              <div>
                <span className="text-xs text-neutral-500">Completed vs Ongoing Projects</span>
                <p className="text-2xl font-mono font-semibold text-neutral-900 tabular-nums mt-1">
                  {completedProjects} Done / {ongoingProjects} Ongoing
                </p>
                <span className="text-xs text-neutral-500">
                  +{proposedOrProcurement} in Procurement/Planning
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row: Budget vs Expenditure by Sector & Distribution by Sub-Location */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bar Chart: Sector Budget vs Expenditure */}
            <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Approved Budget vs Certified Expenditure by Sector Category
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Comparison of allocated funds against verified contractor disbursements (KSh)
                </p>
              </div>

              <div className="space-y-4">
                {categoryStats.map((item) => {
                  const pct =
                    item.budget > 0 ? Math.round((item.spent / item.budget) * 100) : 0;
                  return (
                    <div key={item.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-neutral-800">
                          {item.category} ({item.count} {item.count === 1 ? 'project' : 'projects'})
                        </span>
                        <span className="font-mono text-neutral-700 tabular-nums">
                          Spent KSh {item.spent.toLocaleString()} / KSh{' '}
                          {item.budget.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-3 bg-neutral-100 rounded-md overflow-hidden flex">
                        <div
                          className="h-full bg-[#0B4F32]"
                          style={{ width: `${Math.min(100, pct)}%` }}
                          title={`Spent: ${pct}%`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ward / Location Distribution Breakdown */}
            <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Distribution by Location within Kobujoi Ward
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Equitable geographical distribution across administrative locations
                </p>
              </div>

              <div className="divide-y divide-neutral-200">
                {locationStats.map((loc) => (
                  <div key={loc.location} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-900">{loc.location}</span>
                      <span className="font-mono text-neutral-700 tabular-nums">
                        {loc.count} {loc.count === 1 ? 'Project' : 'Projects'} · Avg {loc.avgProgress}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500 font-mono tabular-nums">
                      <span>Budget: KSh {loc.budget.toLocaleString()}</span>
                      <span>Spent: KSh {loc.spent.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600"
                        style={{ width: `${loc.avgProgress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Public Expenditure Vouchers Ledger */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  Publicly Approved Project Expenditure Vouchers
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Every certified contractor payment recorded against Kobujoi Ward project budgets
                </p>
              </div>
              <span className="text-xs font-mono text-neutral-600 tabular-nums">
                {publicExpenditures.length} Certified Vouchers
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Voucher Reference</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Category & Description</th>
                    <th className="py-3 px-4">Authorized By</th>
                    <th className="py-3 px-4 text-right">Amount (KSh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {publicExpenditures.map((exp) => (
                    <tr key={exp.expenditureId} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-mono text-neutral-600 tabular-nums whitespace-nowrap">
                        {exp.expenditureDate}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-neutral-900 whitespace-nowrap">
                        {exp.paymentReference}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-900 max-w-[220px] truncate">
                        {exp.projectName}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        <span className="font-medium text-neutral-800">{exp.category}:</span>{' '}
                        {exp.description}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 whitespace-nowrap">
                        {exp.authorizedBy}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-[#0B4F32] tabular-nums whitespace-nowrap">
                        KSh {exp.amountKsh.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Public School Bursary Allocation Summary Table */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-neutral-200">
              <h3 className="text-base font-semibold text-neutral-900">
                Aggregate Bursary Allocations by Institution (Public Summary)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Shows total beneficiaries and funds disbursed per school without exposing private student identities
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                    <th className="py-3 px-4">Institution Name</th>
                    <th className="py-3 px-4">Type & Category</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Beneficiaries</th>
                    <th className="py-3 px-4 text-right">Total Allocated (KSh)</th>
                    <th className="py-3 px-4 text-right">Total Paid (KSh)</th>
                    <th className="py-3 px-4 text-right">Outstanding (KSh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {schools.map((sch) => {
                    const out = Math.max(0, sch.totalAllocatedKsh - sch.totalPaidKsh);
                    return (
                      <tr key={sch.schoolId} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 font-medium text-neutral-900">{sch.schoolName}</td>
                        <td className="py-3 px-4 text-neutral-600">
                          {sch.schoolType} · {sch.category}
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{sch.location}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {sch.beneficiaryCount}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium tabular-nums">
                          {sch.totalAllocatedKsh.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#0B4F32] font-semibold tabular-nums">
                          {sch.totalPaidKsh.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-800 tabular-nums">
                          {out.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: PUBLIC APPLICATION STATUS CHECKER (PRIVACY-SAFE)
      ===================================================================== */}
      {activeTab === 'status-check' && (
        <div className="max-w-2xl mx-auto bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs text-neutral-500">
              Privacy-Preserving Status Verification · Kenya Data Protection Compliant
            </p>
            <h2 className="text-2xl font-display font-semibold text-neutral-900 mt-1">
              Check Bursary Application Status
            </h2>
            <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
              Enter your unique Kobujoi CDF Application Reference Number (for example:{' '}
              <code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
                KBG-BURS-2026-000001
              </code>
              ) to check processing stage and school disbursement status. For full personal details
              and downloadable statements, sign in to your Student Dashboard.
            </p>
          </div>

          <form onSubmit={handleStatusLookup} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={lookupRef}
              onChange={(e) => setLookupRef(e.target.value)}
              placeholder="e.g. KBG-BURS-2026-000001"
              className="flex-1 px-4 py-2.5 text-sm font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B4F32]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0B4F32] hover:bg-[#083B25] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Verify Application Status
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>Try Demo Reference Numbers:</span>
            {['KBG-BURS-2026-000001', 'KBG-BURS-2026-000002', 'KBG-BURS-2026-000003'].map(
              (sampleRef) => (
                <button
                  key={sampleRef}
                  type="button"
                  onClick={() => {
                    setLookupRef(sampleRef);
                    const found = publicStatusLookupPool.find(
                      (a) => a.applicationId === sampleRef
                    );
                    setLookupResult(found || 'NOT_FOUND');
                  }}
                  className="font-mono text-[#0B4F32] hover:underline cursor-pointer"
                >
                  {sampleRef}
                </button>
              )
            )}
          </div>

          {lookupResult === 'NOT_FOUND' && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
              No application found matching reference <span className="font-mono font-bold">{lookupRef}</span>. Please verify the reference number or sign in to the Student Portal to view your applications.
            </div>
          )}

          {lookupResult && lookupResult !== 'NOT_FOUND' && (
            <div className="border border-neutral-200 rounded-xl p-5 bg-[#F8FAF9] space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div>
                  <span className="text-xs text-neutral-500 block">Application Number</span>
                  <span className="text-base font-mono font-bold text-neutral-900">
                    {lookupResult.applicationId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-500 block">Current Workflow Status</span>
                  <span className="text-sm font-semibold text-[#0B4F32]">
                    {lookupResult.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block">Applicant Initials (Privacy Masked)</span>
                  <span className="font-medium text-neutral-900">
                    {lookupResult.fullName
                      .split(' ')
                      .map((n) => `${n[0]}***`)
                      .join(' ')}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Target Institution</span>
                  <span className="font-medium text-neutral-900">{lookupResult.schoolName}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Academic Year & Term</span>
                  <span className="font-mono text-neutral-900">
                    {lookupResult.academicYear} ({lookupResult.term})
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Document Vetting Status</span>
                  <span className="font-medium text-neutral-900">
                    {lookupResult.documentVerificationStatus}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Awarded Amount</span>
                  <span className="font-mono font-semibold text-[#0B4F32] tabular-nums">
                    {lookupResult.amountAwardedKsh > 0
                      ? `KSh ${lookupResult.amountAwardedKsh.toLocaleString()}`
                      : 'Pending Final Allocation'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block">School Disbursement Status</span>
                  <span className="font-medium text-neutral-900">{lookupResult.paymentStatus}</span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-200">
                Note: Sensitive personal identifiers (National ID, Birth Certificate, household
                income, and uploaded documents) are hidden on public lookup queries. Sign in as the
                student owner to view full details and download your official award letter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: CDF OFFICE & APPROVED STAFF DIRECTORY
      ===================================================================== */}
      {activeTab === 'staff' && (
        <div className="space-y-8">
          <div className="bg-white border border-neutral-200 rounded-xl p-6">
            <p className="text-xs text-neutral-500">
              Public Service Directory · Kobujoi Ward NG-CDF Office · Aldai Constituency
            </p>
            <h2 className="text-2xl font-display font-semibold text-neutral-900 mt-1">
              Kobujoi CDF Staff Directory & Citizen Service Desk
            </h2>
            <p className="text-xs text-neutral-600 mt-1.5 max-w-3xl">
              Authorized public directory of constituency officers responsible for bursary vetting,
              infrastructure supervision, financial audit, and public participation in Kobujoi Ward.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {publicStaff.map((member) => (
                <div
                  key={member.staffId}
                  className="border border-neutral-200 rounded-xl p-5 bg-[#F8FAF9] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-semibold text-[#0B4F32]">{member.department}</span>
                      <span>{member.status}</span>
                    </div>
                    <h3 className="text-base font-semibold text-neutral-900 mt-1.5">
                      {member.fullName}
                    </h3>
                    <p className="text-xs font-medium text-neutral-700 mt-0.5">{member.position}</p>
                    <p className="text-xs text-neutral-600 mt-3 leading-relaxed">
                      {member.responsibilities}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-200 space-y-1 text-xs text-neutral-600 font-mono">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{member.officialEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{member.officialPhone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div>
              <h4 className="font-semibold text-neutral-900 text-sm">Physical Office Location</h4>
              <p className="text-neutral-600 mt-1.5 leading-relaxed">
                Kobujoi Ward NG-CDF Sub-Office, Next to Kobujoi Deputy County Commissioner (DCC)
                Complex, Kobujoi Township, Aldai Constituency, Nandi County.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 text-sm">Official Service Hours</h4>
              <p className="text-neutral-600 mt-1.5 leading-relaxed">
                Monday – Friday: 8:00 AM to 5:00 PM EAT
                <br />
                Bursary Vetting & Document Desk: Room 4, Ground Floor.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-900 text-sm">Citizen Helpdesk & Inquiries</h4>
              <p className="text-neutral-600 mt-1.5 font-mono leading-relaxed">
                Email: info.kobujoi@ngcdf-aldai.go.ke
                <br />
                Toll-Free / Desk: +254 722 301 440
                <br />
                P.O. Box 142 – 30305, Kobujoi, Kenya
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: PROJECT DETAIL, EXPENDITURE LEDGER & PHOTO COMPARISON
      ===================================================================== */}
      {inspectedProject && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <p className="text-xs font-mono text-neutral-500">
                  {inspectedProject.projectId} · {inspectedProject.ward} Ward ·{' '}
                  {inspectedProject.location} ({inspectedProject.subLocation})
                </p>
                <h3 className="text-xl font-display font-semibold text-neutral-900 mt-1">
                  {inspectedProject.projectName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedProject(null)}
                className="p-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 cursor-pointer"
                aria-label="Close project inspector"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#F8FAF9] p-4 rounded-xl border border-neutral-200 text-xs">
              <div>
                <span className="text-neutral-500 block">Approved Budget</span>
                <span className="text-base font-mono font-semibold text-neutral-900 tabular-nums">
                  KSh {inspectedProject.approvedBudgetKsh.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Total Expenditure</span>
                <span className="text-base font-mono font-semibold text-[#0B4F32] tabular-nums">
                  KSh {inspectedProject.amountSpentKsh.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Remaining Balance</span>
                <span className="text-base font-mono font-semibold text-neutral-900 tabular-nums">
                  KSh{' '}
                  {Math.max(
                    0,
                    inspectedProject.approvedBudgetKsh - inspectedProject.amountSpentKsh
                  ).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block">Physical Progress</span>
                <span className="text-base font-mono font-semibold text-neutral-900 tabular-nums">
                  {inspectedProject.percentageCompleted}% ({inspectedProject.status})
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-neutral-700 leading-relaxed">
              <p>
                <strong className="text-neutral-900">Scope of Works:</strong>{' '}
                {inspectedProject.description}
              </p>
              <p>
                <strong className="text-neutral-900">Milestones & Timeline:</strong>{' '}
                {inspectedProject.milestonesSummary} (Start: {inspectedProject.startDate} · Expected
                Completion: {inspectedProject.expectedCompletionDate})
              </p>
              <p>
                <strong className="text-neutral-900">Before / During / Completed Summary:</strong>{' '}
                Before: {inspectedProject.beforePhotoCaption} | During:{' '}
                {inspectedProject.duringPhotoCaption} | Current/After:{' '}
                {inspectedProject.afterPhotoCaption}
              </p>
            </div>

            {/* Project Expenditure Vouchers for this Project */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-neutral-900">
                Certified Expenditure Vouchers for {inspectedProject.projectId}
              </h4>
              {publicExpenditures.filter((e) => e.projectId === inspectedProject.projectId)
                .length === 0 ? (
                <p className="text-xs text-neutral-500">
                  No public expenditure vouchers recorded yet for this project.
                </p>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-600">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Amount (KSh)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {publicExpenditures
                        .filter((e) => e.projectId === inspectedProject.projectId)
                        .map((e) => (
                          <tr key={e.expenditureId}>
                            <td className="py-2.5 px-3 font-mono tabular-nums">
                              {e.expenditureDate}
                            </td>
                            <td className="py-2.5 px-3 font-mono">{e.paymentReference}</td>
                            <td className="py-2.5 px-3">{e.description}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#0B4F32] tabular-nums">
                              KSh {e.amountKsh.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: PHOTOGRAPH LIGHTBOX
      ===================================================================== */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full overflow-hidden border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[360px] sm:h-[440px] bg-neutral-900">
              <img
                src={lightboxPhoto.imageUrl}
                alt={lightboxPhoto.caption}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-lg hover:bg-black"
                aria-label="Close lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-1">
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                <span>Stage: {lightboxPhoto.stage}</span>
                <span>·</span>
                <span>Uploaded: {lightboxPhoto.uploadDate}</span>
                <span>·</span>
                <span>Credit: {lightboxPhoto.photographer}</span>
              </div>
              <h4 className="text-base font-semibold text-neutral-900">
                {lightboxPhoto.projectName}
              </h4>
              <p className="text-xs text-neutral-600">{lightboxPhoto.caption}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
