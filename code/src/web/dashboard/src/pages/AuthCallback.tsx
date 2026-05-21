import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveToken } from '../hooks/useAuth';

export function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      saveToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login?error=auth_failed', { replace: true });
    }
  }, [params, navigate]);

  return (
    <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>
      Signing in…
    </div>
  );
}
