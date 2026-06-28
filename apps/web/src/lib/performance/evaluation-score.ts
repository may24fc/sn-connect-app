import type { PerformanceRating } from '@hr-portal/ui';

export const OKR_KPI_WEIGHT = 0.6;
export const MANAGER_ASSESSMENT_WEIGHT = 0.4;

const RATING_TO_SCORE: Record<PerformanceRating, number> = {
  exceptional: 5,
  exceeds: 4,
  meets: 3,
  needs_improvement: 2,
  unsatisfactory: 1,
};

export function toFivePointScore(rating: PerformanceRating | null | undefined): number | null {
  if (!rating) return null;
  return RATING_TO_SCORE[rating] ?? null;
}

export function fromPercentageToFivePoint(percentage: number | null | undefined): number | null {
  if (percentage === null || percentage === undefined || Number.isNaN(percentage)) return null;
  const bounded = Math.max(0, Math.min(100, percentage));
  return (bounded / 100) * 5;
}

export interface FinalEvaluationBreakdown {
  okrKpiScore5: number;
  managerAssessmentScore5: number;
  finalScore5: number;
  finalScorePercent: number;
}

export function computeFinalEvaluationScore(params: {
  okrKpiScore5: number | null;
  managerAssessmentScore5: number | null;
}): FinalEvaluationBreakdown | null {
  const { okrKpiScore5, managerAssessmentScore5 } = params;

  if (okrKpiScore5 === null || managerAssessmentScore5 === null) {
    return null;
  }

  const boundedOkrKpi = Math.max(0, Math.min(5, okrKpiScore5));
  const boundedManager = Math.max(0, Math.min(5, managerAssessmentScore5));
  const finalScore5Raw =
    boundedOkrKpi * OKR_KPI_WEIGHT + boundedManager * MANAGER_ASSESSMENT_WEIGHT;
  const finalScore5 = Math.round(finalScore5Raw * 10) / 10;
  const finalScorePercent = Math.round((finalScore5Raw / 5) * 100);

  return {
    okrKpiScore5: Math.round(boundedOkrKpi * 10) / 10,
    managerAssessmentScore5: Math.round(boundedManager * 10) / 10,
    finalScore5,
    finalScorePercent,
  };
}
