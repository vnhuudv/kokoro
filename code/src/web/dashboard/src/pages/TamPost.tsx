// code/src/web/dashboard/src/pages/TamPost.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TAM_BASE } from '../hooks/useDashboard';
import { getToken } from '../hooks/useAuth';
import { colors, card, pageWrap, pageTitle, primaryButton, secondaryButton, radius } from '../theme';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'U-DASHBOARD-USER';

const CATEGORIES = [
  { value: 'climate',  label: '🌍 Climate' },
  { value: 'poverty',  label: '💛 Poverty' },
  { value: 'disaster', label: '🌊 Disaster' },
  { value: 'other',    label: '🤝 Other' },
];

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: colors.textBody,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  padding: '8px 12px',
  borderRadius: radius.input,
  border: `1px solid ${colors.border}`,
  fontSize: 13,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: colors.textBody,
  background: colors.cardBg,
};

const errorStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.danger,
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
    <main style={{ ...pageWrap }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: colors.tamLight, color: colors.tam,
            fontSize: 11, fontWeight: 700, padding: '3px 10px',
            borderRadius: radius.pill, marginBottom: 8,
          }}>
            心 TÂM PILLAR
          </div>
          <h1 style={{ ...pageTitle, margin: 0 }}>New Tâm Post</h1>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Share a social impact initiative with the team
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ ...card, maxWidth: 600, margin: '0 auto' }}>

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
                      padding: '5px 14px',
                      borderRadius: radius.pill,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      background: category === cat.value ? colors.tam    : colors.cardBg,
                      color:      category === cat.value ? '#fff'         : colors.textSecondary,
                      boxShadow:  category === cat.value ? 'none'         : `0 0 0 1px ${colors.border}`,
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
                  borderColor: titleError ? colors.danger : colors.border,
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
                  borderColor: descError ? colors.danger : colors.border,
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
              borderLeft: `4px solid ${colors.danger}`,
              color: colors.danger,
              fontSize: 14,
              padding: '12px 16px',
              maxWidth: 600,
              margin: '12px auto',
            }}>
              {apiError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', maxWidth: 600, margin: '16px auto 0' }}>
            <button
              type="button"
              onClick={() => navigate('/tam')}
              style={{ ...secondaryButton }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...primaryButton,
                background: submitting ? `${colors.tam}99` : colors.tam,
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
