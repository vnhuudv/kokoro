// code/src/web/dashboard/src/pages/MakotoPost.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAKOTO_BASE } from '../hooks/useDashboard';
import { getToken } from '../hooks/useAuth';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'U-DASHBOARD-USER';

const POST_TYPES = [
  { value: 'article',  label: '📝 Article' },
  { value: 'official', label: '📌 Official Announcement' },
] as const;

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  fontSize: 14,
  color: '#1e293b',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  outline: 'none',
  background: '#fff',
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#dc2626',
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
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 40px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            誠 New Post
          </h1>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>Share knowledge or publish an official announcement</div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={card}>

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
                      padding: '6px 16px',
                      borderRadius: 20,
                      border: '1px solid',
                      borderColor: postType === pt.value ? '#0ea5a0' : '#e2e8f0',
                      background: postType === pt.value ? '#f0fdfc' : '#fff',
                      color: postType === pt.value ? '#0ea5a0' : '#64748b',
                      fontWeight: postType === pt.value ? 600 : 400,
                      fontSize: 13,
                      cursor: 'pointer',
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
                style={{ ...inputStyle, borderColor: titleError ? '#dc2626' : '#e2e8f0' }}
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
                style={{ ...inputStyle, resize: 'vertical', borderColor: bodyError ? '#dc2626' : '#e2e8f0' }}
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
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Valid keys: en_score, carbon
                </div>
              </div>
            )}

          </div>

          {apiError && (
            <div style={{ ...card, borderLeft: '4px solid #dc2626', color: '#dc2626', fontSize: 14, padding: '12px 16px' }}>
              {apiError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/makoto')}
              style={{
                padding: '10px 20px', borderRadius: 6, border: '1px solid #e2e8f0',
                background: '#f1f5f9', color: '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 24px', borderRadius: 6, border: 'none',
                background: submitting ? '#7dd3cf' : '#0ea5a0',
                color: '#fff', fontSize: 14, fontWeight: 600,
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
