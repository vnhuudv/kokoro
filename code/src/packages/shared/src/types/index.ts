export type Language = 'vi' | 'ja';
export type Register = 'formal' | 'neutral' | 'informal';
export type EventType =
  | 'annotation_viewed'
  | 'suggestion_used'
  | 'suggestion_dismissed'
  | 'pattern_understood'
  | 'coaching_panel_opened'
  | 'pre_send_flag_viewed'
  | 'pre_send_original_sent'
  | 'pre_send_suggestion_used';

export interface Tenant {
  tenantId: string;
  name: string;
  kmsKeyId: string;
  pilotStart?: Date;
  pilotEnd?: Date;
  createdAt: Date;
}

export interface User {
  userId: string;
  tenantId: string;
  slackUserId: string;
  language: Language;
  fluencyScore: number;
  optedInAt: Date;
  optedOutAt?: Date;
  preferences: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuggestionChip {
  label: string;
  register: Register;
  text: string;
}

export interface AnnotationResult {
  register: Register;
  intentLabel: string;
  riskCategory?: string;
  annotationText: string;
  coachingRationale: string;
  suggestions: SuggestionChip[];
}

export interface CulturalPair {
  pairId: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  register: Register;
  phrasePattern: string;
  intentLabel: string;
  riskCategory?: string;
  annotationTemplate: string;
  coachingRationale: string;
  culturalConcept?: string;
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FluencyEvent {
  eventId: string;
  userId: string;
  eventType: EventType;
  pairId?: string;
  createdAt: Date;
}
