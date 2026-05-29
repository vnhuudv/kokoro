// code/src/web/dashboard/src/pages/MakotoPost.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAKOTO_BASE } from '../hooks/useDashboard';
import { getToken } from '../hooks/useAuth';
import { colors, card, pageWrap, pageTitle, radius, primaryButton, secondaryButton } from '../theme';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'U-DASHBOARD-USER';

const POST_TYPES = [
  { value: 'article',  label: '📝 Article' },
  { value: 'official', label: '📌 Official Announcement' },
] as const;

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 6,
  padding: '8px 12px', borderRadius: radius.input,
  border: `1px solid ${colors.border}`, fontSize: 13,
  boxSizing: 'border-box', fontFamily: 'inherit', color: colors.textBody,
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.danger,
  marginTop: 4,
};

export function MakotoPost() {
  const navigate = useNavigate();

  const [postType, setPostType] = useState<'article' | 'official'>('article');
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [metricRefsRaw, setMetricRefsRaw] = useState('');

  const [titleError, setTitleError] = useState('');
  const [bodyError, setBodyError]   = useState('');
  const [apiError, setApiError]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    let valid = true;
    if (!title.trim()) {
      setTitleError('Title is required.');
      valid = false;
    } else {
      setTitleError('');
    }
    if (!body.trim()) {
      setBodyError('Body is required.');
      valid = false;
    } else {
      setBodyError('');
    }
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        postType,
      };

      if (postType === 'official' && metricRefsRaw.trim()) {
        payload.metricRefs = metricRefsRaw.split(',').map(s => s.trim()).filter(Boolean);
      }

      const res = await fetch(
        `${MAKOTO_BASE}/posts?tenantId=${TENANT_ID}&userId=${encodeURIComponent(USER_ID)}`,
        { method: 'POST', headers, body: JSON.stringify(payload) },
      );

      if (res.status === 201) {
        navigate('/makoto');
        return;
      }

      const text = await res.text().catch(() => '');
      setApiError(`Error ${res.status}${text ? ': ' + text : ''}`);
    } catch {
      setApiError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ ...pageWrap }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: colors.primaryLight, color: colors.primary,
            fontSize: 11, fontWeight: 700, padding: '3px 10px',
            borderRadius: radius.pill, marginBottom: 8,
          }}>
            誠 MAKOTO PILLAR
          </div>
          <h1 style={{ ...pageTitle, margin: 0 }}>New Post</h1>
          <div style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>Share knowledge or publish an official announcement</div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ ...card, maxWidth: 600, margin: '0 auto' }}>

            {/* Post type pills */}
            <div style={{ marginBottom: 20 }}>
              <span style={labelStyle}>Post Type</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {POST_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPostType(pt.value)}
                    style={{
                      padding: '7px 20px', borderRadius: radius.pill, fontSize: 13, fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      background: postType === pt.value ? colors.primary : colors.canvasBg,
                      color:      postType === pt.value ? '#fff'          : colors.textSecondary,
                      boxShadow:  postType === pt.value ? 'none'          : `0 0 0 1px ${colors.border}`,
                    }}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="makoto-title">Title *</label>
              <input
                id="makoto-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ ...inputStyle, borderColor: titleError ? colors.danger : colors.border }}
                placeholder="Give your post a clear title"
              />
              {titleError && <div style={errorStyle}>{titleError}</div>}
            </div>

            {/* Body */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="makoto-body">Body *</label>
              <textarea
                id="makoto-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                style={{ ...inputStyle, resize: 'vertical', borderColor: bodyError ? colors.danger : colors.border }}
                placeholder={postType === 'official'
                  ? 'Write the announcement…'
                  : 'Share your knowledge, experience, or insight…'}
              />
              {bodyError && <div style={errorStyle}>{bodyError}</div>}
            </div>

            {/* Metric refs — official only */}
            {postType === 'official' && (
              <div style={{ marginBottom: 4 }}>
                <label style={labelStyle} htmlFor="makoto-metrics">
                  Metric References (optional)
                </label>
                <input
                  id="makoto-metrics"
                  type="text"
                  value={metricRefsRaw}
                  onChange={e => setMetricRefsRaw(e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. en_score, carbon (comma-separated)"
                />
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  Valid keys: en_score, carbon
                </div>
              </div>
            )}

          </div>

          {apiError && (
            <div style={{
              ...card, maxWidth: 600, margin: '12px auto 0',
              borderLeft: `4px solid ${colors.danger}`,
              color: colors.danger, fontSize: 14, padding: '12px 16px',
            }}>
              {apiError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', maxWidth: 600, margin: '16px auto 0' }}>
            <button
              type="button"
              onClick={() => navigate('/makoto')}
              style={{ ...secondaryButton }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...primaryButton,
                background: submitting ? colors.primaryRing : colors.primary,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}
