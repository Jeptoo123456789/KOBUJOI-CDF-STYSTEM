import { EligibilityCriteria, sanitizeString } from '../types/cdf.ts';

export interface EligibilityAssessmentInput {
  ward: string;
  householdSituation: string;
  fatherEmploymentStatus: string;
  motherEmploymentStatus: string;
  householdMonthlyIncomeKsh: number;
  previousPerformance: string;
  feeBalanceKsh: number;
  amountRequestedKsh: number;
  schoolType: string;
  hasUploadedDocuments: boolean;
}

export interface EligibilityAssessmentResult {
  score: number;
  category: string;
  qualified: boolean;
  recommendedAwardKsh: number;
  priorityLevel: 'Critical' | 'High' | 'Standard';
  breakdown: string;
  factors: {
    label: string;
    points: number;
    maxPoints: number;
    reason: string;
  }[];
}

export function evaluateBursaryEligibility(
  input: EligibilityAssessmentInput,
  activeCriteria: EligibilityCriteria[]
): EligibilityAssessmentResult {
  const factors: EligibilityAssessmentResult['factors'] = [];
  let totalScore = 0;

  // 1. Ward Residency Check (Up to 15 pts)
  const isKobujoiResident =
    input.ward.trim().toLowerCase().includes('kobujoi') ||
    input.ward.trim().toLowerCase().includes('aldai');
  const residencyPoints = isKobujoiResident ? 15 : 5;
  totalScore += residencyPoints;
  factors.push({
    label: 'Ward Residency Verification',
    points: residencyPoints,
    maxPoints: 15,
    reason: isKobujoiResident
      ? 'Verified resident of Kobujoi Ward, Aldai Constituency (+15 pts)'
      : 'Non-primary ward residency (+5 pts)',
  });

  // 2. Match Household Situation against Configurable Criteria (Up to 40 pts)
  const activeList = activeCriteria.filter((c) => c.isActive);
  let matchedCriterion: EligibilityCriteria | undefined;

  const sitLower = input.householdSituation.toLowerCase();
  if (sitLower.includes('orphan')) {
    matchedCriterion = activeList.find(
      (c) =>
        c.categoryCode.toUpperCase().includes('ORPHAN') ||
        c.categoryName.toLowerCase().includes('orphan')
    );
  } else if (sitLower.includes('single')) {
    matchedCriterion = activeList.find(
      (c) =>
        c.categoryCode.toUpperCase().includes('SINGLE') ||
        c.categoryName.toLowerCase().includes('single')
    );
  } else if (sitLower.includes('disability') || sitLower.includes('special')) {
    matchedCriterion = activeList.find(
      (c) =>
        c.categoryCode.toUpperCase().includes('VULN') ||
        c.categoryName.toLowerCase().includes('special') ||
        c.categoryName.toLowerCase().includes('vulnerability')
    );
  } else {
    matchedCriterion = activeList.find(
      (c) =>
        c.categoryCode.toUpperCase().includes('LOW_INCOME') ||
        c.categoryName.toLowerCase().includes('income') ||
        c.categoryName.toLowerCase().includes('economic')
    );
  }

  if (!matchedCriterion && activeList.length > 0) {
    matchedCriterion = activeList[0];
  }

  let householdPoints = 20;
  let categoryName = matchedCriterion?.categoryName || 'Category 2 — Economically Vulnerable Family';
  let priorityLevel: 'Critical' | 'High' | 'Standard' = matchedCriterion?.priorityLevel || 'Standard';

  if (sitLower.includes('total orphan')) {
    householdPoints = Math.min(40, matchedCriterion?.maxPoints || 40);
    priorityLevel = 'Critical';
  } else if (sitLower.includes('partial orphan')) {
    householdPoints = Math.min(36, matchedCriterion?.maxPoints || 36);
    priorityLevel = 'Critical';
  } else if (sitLower.includes('disability') || sitLower.includes('special')) {
    householdPoints = Math.min(38, matchedCriterion?.maxPoints || 38);
    priorityLevel = 'Critical';
  } else if (sitLower.includes('single') || sitLower.includes('guardian')) {
    householdPoints = Math.min(32, matchedCriterion?.maxPoints || 32);
    priorityLevel = 'High';
  } else {
    householdPoints = Math.min(24, matchedCriterion?.maxPoints || 25);
  }

  totalScore += householdPoints;
  factors.push({
    label: 'Household Vulnerability Category',
    points: householdPoints,
    maxPoints: 40,
    reason: `${input.householdSituation} matched to [${categoryName}] (+${householdPoints} pts)`,
  });

  // 3. Economic / Household Income Threshold Check (Up to 25 pts)
  const incomeThreshold = matchedCriterion?.maxHouseholdIncomeKsh || 25000;
  const bothParentsFormal =
    input.fatherEmploymentStatus.toLowerCase().includes('formal') &&
    input.motherEmploymentStatus.toLowerCase().includes('formal');

  let incomePoints = 0;
  if (input.householdMonthlyIncomeKsh <= incomeThreshold * 0.4 && !bothParentsFormal) {
    incomePoints = 25;
  } else if (input.householdMonthlyIncomeKsh <= incomeThreshold && !bothParentsFormal) {
    incomePoints = 20;
  } else if (input.householdMonthlyIncomeKsh <= incomeThreshold * 1.5) {
    incomePoints = 12;
  } else {
    incomePoints = 4;
  }

  totalScore += incomePoints;
  factors.push({
    label: 'Household Financial Need Assessment',
    points: incomePoints,
    maxPoints: 25,
    reason: `Monthly income KSh ${input.householdMonthlyIncomeKsh.toLocaleString()} vs threshold KSh ${incomeThreshold.toLocaleString()} (+${incomePoints} pts)`,
  });

  // 4. Academic Performance & Merit Evaluation (Up to 20 pts)
  const perfLower = input.previousPerformance.toLowerCase();
  let academicPoints = 12;
  if (perfLower.includes('excellent') || perfLower.includes('a') || perfLower.includes('first class')) {
    academicPoints = 20;
    const meritCriterion = activeList.find(
      (c) =>
        c.categoryCode.toUpperCase().includes('ACADEMIC') ||
        c.categoryName.toLowerCase().includes('academic')
    );
    if (meritCriterion && householdPoints < 28) {
      categoryName = meritCriterion.categoryName;
    }
  } else if (perfLower.includes('good') || perfLower.includes('b')) {
    academicPoints = 16;
  } else if (perfLower.includes('average') || perfLower.includes('c')) {
    academicPoints = 12;
  } else {
    academicPoints = 8;
  }

  totalScore += academicPoints;
  factors.push({
    label: 'Academic Performance & Continuity',
    points: academicPoints,
    maxPoints: 20,
    reason: `Performance "${input.previousPerformance}" evaluated (+${academicPoints} pts)`,
  });

  const finalScore = Math.min(100, Math.max(0, totalScore));
  const minRequiredScore = matchedCriterion?.minAcademicScore || 50;
  const qualified =
    isKobujoiResident &&
    finalScore >= minRequiredScore &&
    input.feeBalanceKsh > 0;

  // Calculate recommended award based on configured limit and school type
  const configuredMax = matchedCriterion?.maxAwardKsh || 25000;
  const schoolBaseCap =
    input.schoolType === 'University'
      ? Math.max(configuredMax, 30000)
      : input.schoolType === 'TVET' || input.schoolType === 'College'
      ? Math.max(configuredMax, 20000)
      : configuredMax;

  let recommendedAwardKsh = 0;
  if (qualified) {
    const scoreMultiplier = finalScore >= 85 ? 0.85 : finalScore >= 70 ? 0.7 : 0.55;
    const rawTarget = Math.min(input.feeBalanceKsh, input.amountRequestedKsh || input.feeBalanceKsh);
    recommendedAwardKsh = Math.min(
      schoolBaseCap,
      Math.round((rawTarget * scoreMultiplier) / 500) * 500
    );
    recommendedAwardKsh = Math.max(5000, Math.min(recommendedAwardKsh, input.feeBalanceKsh));
  }

  const breakdownSummary = sanitizeString(
    `Score: ${finalScore}/100 (Threshold: ${minRequiredScore}) · ${
      qualified ? 'QUALIFIES' : 'DOES NOT QUALIFY'
    } under ${categoryName}. ` +
      factors.map((f) => `${f.label}: ${f.points}/${f.maxPoints}`).join(' | ') +
      (qualified
        ? ` · Recommended Allocation: KSh ${recommendedAwardKsh.toLocaleString()} (Subject to CDF Staff document verification & Committee approval).`
        : !isKobujoiResident
        ? ' · Reason: Applicant must be a resident of Kobujoi Ward / Aldai Constituency.'
        : input.feeBalanceKsh <= 0
        ? ' · Reason: Verified school fee balance must be greater than KSh 0.'
        : ' · Reason: Composite financial-need and academic score below configured threshold.'),
    595
  );

  return {
    score: finalScore,
    category: sanitizeString(categoryName, 80),
    qualified,
    recommendedAwardKsh,
    priorityLevel,
    breakdown: breakdownSummary,
    factors,
  };
}
