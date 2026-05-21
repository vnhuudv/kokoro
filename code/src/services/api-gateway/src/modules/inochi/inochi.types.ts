/** kg CO₂e per 1,000 tokens — input and output combined.
 *  Sources: provider sustainability reports (conservative estimates).
 *  Update when providers publish revised figures. */
export const CARBON_INTENSITY: Record<string, number> = {
  anthropic: 0.000029,
  google:    0.000022,
  openai:    0.000043,
  other:     0.000035,
};

/** Default flat-rate tokens per seat per month for web tools with no billing API. */
export const DEFAULT_ESTIMATE_TOKENS: Record<string, number> = {
  claude_web:         500_000,
  gemini_workspace:   400_000,
};

/** Cost per tonne CO₂e in USD (midpoint of Gold Standard range $8–$20). */
export const OFFSET_RATE_USD_PER_TONNE = 15;

/** Average petrol car kg CO₂ per km. */
const PETROL_CAR_KG_PER_KM = 0.171;

export function calculateCarbon(
  inputTokens: number,
  outputTokens: number,
  provider: string,
): number {
  const intensity = CARBON_INTENSITY[provider] ?? CARBON_INTENSITY.other;
  return ((inputTokens + outputTokens) / 1000) * intensity;
}

export function toKmEquivalent(kgCo2e: number): number {
  return Math.round((kgCo2e / PETROL_CAR_KG_PER_KM) * 10) / 10;
}

export function estimateOffsetCost(kgCo2e: number): number {
  return Math.round((kgCo2e / 1000) * OFFSET_RATE_USD_PER_TONNE * 100) / 100;
}

// ── Response shapes ──────────────────────────────────────────────────────────

export interface ToolBreakdown {
  tool: string;
  provider: string;
  source: 'gateway' | 'billing_api' | 'estimate';
  input_tokens: number;
  output_tokens: number;
  carbon_kg: number;
}

export interface PersonalCarbonSummary {
  period_month: string;
  total_kg_co2e: number;
  total_tokens: number;
  km_equivalent: number;
  offset_cost_usd_estimate: number;
  tools: ToolBreakdown[];
  offset_covered: boolean;
}

export interface TeamBreakdown {
  team_label: string;
  kg_co2e: number;
  total_tokens: number;
  member_count: number;
}

export interface OffsetRecord {
  id: string;
  kg_co2e: number;
  provider: string;
  cert_id: string | null;
  cost_usd: number | null;
  purchased_at: string;
  covers_from: string;
  covers_to: string;
  notes: string | null;
}

export interface CompanyCarbonSummary {
  period_month: string;
  total_kg_co2e: number;
  total_tokens: number;
  teams: TeamBreakdown[];
  offsets: OffsetRecord[];
  offset_covered: boolean;
}

export interface CreateOffsetDto {
  kg_co2e: number;
  provider: string;
  cert_id?: string;
  cost_usd?: number;
  purchased_at: string;
  covers_from: string;
  covers_to: string;
  notes?: string;
}
