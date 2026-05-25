export interface EnScoreBreakdown {
  sessionsLast90Days: number;
  positiveCorrelations: number;
  crossCulturalRatio: number;
}

export interface EnScore {
  enScore: number;
  breakdown: EnScoreBreakdown;
  trend: 'improving' | 'stable' | 'declining';
}
