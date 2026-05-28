// code/src/web/dashboard/src/pages/TamPost.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TAM_BASE } from '../hooks/useDashboard';
import { getToken } from '../hooks/useAuth';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'U-DASHBOARD-USER';

const CATEGORIES = [
  { value: 'climate',  label: '🌍 Climate' },
  { value: 'poverty',  label: '💛 Poverty' },
  { value: 'disaster', label: '🌊 Disaster' },
  { value: 'other',    label: '🤝 Other' },
];

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

export function TamPost() {
  const navigate = useNavigate();

  const [category, setCategory]     = useState<string>('climate');
  const [title, setTitle]           = useState('');
  const [description, setDesc]      = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [actionLink, setActionLink] = useState('');

  const [titleError, setTitleError] = useState('');
  const [descError, setDescError]   = useState('');
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
    if (!description.trim()) {
      setDescError('Description is required.');
      valid = false;
    } else {
      setDescError('');
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

      const body: Record<string, unknown> = {
        category,
        title: title.trim(),
        description: description.trim(),
      };
      if (coverImage.trim()) body.coverImageUrl = coverImage.trim();
      if (actionLink.trim()) body.externalUrl = actionLink.trim();

      const res = await fetch(
        `${TAM_BASE}/posts?tenantId=${TENANT_ID}&userId=${encodeURIComponent(USER_ID)}`,
        { method: 'POST', headers, body: JSON.stringify(body) },
      );

      if (res.status === 201) {
        navigate('/tam');
        return;
      }

      const text = await res.text().catch(() => '');
      setApiError(`Error ${res.status}${text ? ': ' + text : ''}`);
    } catch (err) {
      setApiError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 40px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            心 New Tâm Post
          </h1>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>Share a social impact initiative with the team</div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={card}>

            {/* Category pills */}
            <div style={{ marginBottom: 20 }}>
              <span style={labelStyle}>Category</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: '1px solid',
                      borderColor: category === cat.value ? '#0ea5a0' : '#e2e8f0',
                      background: category === cat.value ? '#f0fdfc' : '#fff',
                      color: category === cat.value ? '#0ea5a0' : '#64748b',
                      fontWeight: category === cat.value ? 600 : 400,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="tam-title">Title *</label>
              <input
                id="tam-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: titleError ? '#dc2626' : '#e2e8f0',
                }}
                placeholder="Give your post a clear title"
              />
              {titleError && <div style={errorStyle}>{titleError}</div>}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="tam-description">Description *</label>
              <textarea
                id="tam-description"
                value={description}
                onChange={e => setDesc(e.target.value)}
                rows={5}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  borderColor: descError ? '#dc2626' : '#e2e8f0',
                }}
                placeholder="Describe the initiative, its goals, and how people can help"
              />
              {descError && <div style={errorStyle}>{descError}</div>}
            </div>

            {/* Cover Image URL */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="tam-cover">Cover Image URL</label>
              <input
                id="tam-cover"
                type="url"
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                style={inputStyle}
                placeholder="https://…"
              />
            </div>

            {/* Action Link */}
            <div style={{ marginBottom: 4 }}>
              <label style={labelStyle} htmlFor="tam-action">External link for donations/volunteering</label>
              <input
                id="tam-action"
                type="url"
                value={actionLink}
                onChange={e => setActionLink(e.target.value)}
                style={inputStyle}
                placeholder="https://…"
              />
            </div>

          </div>

          {/* API error */}
          {apiError && (
            <div style={{
              ...card,
              borderLeft: '4px solid #dc2626',
              color: '#dc2626',
              fontSize: 14,
              padding: '12px 16px',
            }}>
              {apiError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/tam')}
              style={{
                padding: '10px 20px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: '#f1f5f9',
                color: '#334155',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 24px',
                borderRadius: 6,
                border: 'none',
                background: submitting ? '#7dd3cf' : '#0ea5a0',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
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
