import { useEffect, useState } from 'react';
import { getToken, clearToken } from './useAuth';

const API_BASES: Record<string, string> = {
  dashboard: 'http://localhost:3000/api/dashboard',
  inochi:    'http://localhost:3000/api/inochi',
  tam:       'http://localhost:3000/api/tam',
  makoto:    'http://localhost:3000/api/makoto',
};

function makeUseFetch(base: string) {
  return function useFetch<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      if (!path) {
        setData(null);
        setLoading(false);
        return;
      }
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(`${base}${path}`, { headers })
        .then(r => {
          if (r.status === 401) {
            clearToken();
            window.location.href = '/login';
            throw new Error('Unauthorized');
          }
          return r.json();
        })
        .then(setData)
        .catch(e => setError(String(e)))
        .finally(() => setLoading(false));
    }, [path]);

    return { data, loading, error };
  };
}

export const useFetch = makeUseFetch(API_BASES.dashboard);
export const useInochiFetch = makeUseFetch(API_BASES.inochi);
export const useTamFetch = makeUseFetch(API_BASES.tam);
export const TAM_BASE = API_BASES.tam;
export const useMakotoFetch = makeUseFetch(API_BASES.makoto);
export const MAKOTO_BASE = API_BASES.makoto;
