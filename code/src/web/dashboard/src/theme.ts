import type { CSSProperties } from 'react';

export const colors = {
  // Sidebar
  sidebarBg:        '#1e1b4b',
  sidebarActive:    '#312e81',
  sidebarIcon:      '#6366f1',
  sidebarIconActive:'#a5b4fc',

  // Canvas
  canvasBg:         '#f8fafc',
  cardBg:           '#ffffff',
  border:           '#e2e8f0',

  // Text
  textHeading:      '#1e1b4b',
  textBody:         '#1e293b',
  textSecondary:    '#64748b',
  textMuted:        '#94a3b8',

  // Primary (Makoto / Team / shared)
  primary:          '#6366f1',
  primaryHover:     '#4f46e5',
  primaryLight:     '#e0e7ff',
  primaryRing:      '#c7d2fe',

  // Pillar accents
  carbon:           '#10b981',
  carbonLight:      '#d1fae5',
  tam:              '#f59e0b',
  tamLight:         '#fef3c7',
  makoto:           '#6366f1',
  makotoLight:      '#e0e7ff',
  en:               '#8b5cf6',
  enLight:          '#ede9fe',
  kokoro:           '#0ea5e9',
  kokoroLight:      '#e0f2fe',

  // Semantic
  success:          '#22c55e',
  warning:          '#f59e0b',
  danger:           '#ef4444',
} as const;

export const radius = {
  card:   12,
  button: 8,
  badge:  6,
  pill:   999,
  input:  8,
} as const;

export const shadow = {
  card:  '0 1px 4px rgba(99, 102, 241, 0.08)',
  modal: '0 4px 24px rgba(0,0,0,.12)',
} as const;

export const card: CSSProperties = {
  background:   colors.cardBg,
  borderRadius: radius.card,
  padding:      16,
  border:       `1px solid ${colors.border}`,
  boxShadow:    shadow.card,
};

export const pageWrap: CSSProperties = {
  background: colors.canvasBg,
  minHeight:  '100vh',
  padding:    24,
};

export const pageTitle: CSSProperties = {
  margin:     0,
  fontSize:   20,
  fontWeight: 800,
  color:      colors.textHeading,
  letterSpacing: '-0.02em',
};

export const labelStyle: CSSProperties = {
  fontSize:      10,
  fontWeight:    600,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color:         colors.textMuted,
  marginBottom:  6,
};

export const primaryButton: CSSProperties = {
  background:   colors.primary,
  color:        '#fff',
  border:       'none',
  borderRadius: radius.button,
  padding:      '7px 16px',
  fontSize:     13,
  fontWeight:   600,
  cursor:       'pointer',
};

export const secondaryButton: CSSProperties = {
  background:   colors.cardBg,
  color:        colors.textSecondary,
  border:       `1px solid ${colors.border}`,
  borderRadius: radius.button,
  padding:      '7px 14px',
  fontSize:     13,
  fontWeight:   500,
  cursor:       'pointer',
};
