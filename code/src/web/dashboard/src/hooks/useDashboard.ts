import { useEffect, useState } from 'react';

const API_BASES: Record<string, string> = {
  dashboard: 'http://localhost:3000/api/dashboard',
  inochi:    'http://localhost:3000/api/inochi',
};

function makeUseFetch(base: string) {
  return function useFetch<T>(path: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      fetch(`${base}${path}`)
        .then(r => r.json())
        .then(setData)
        .catch(e => setError(String(e)))
        .finally(() => setLoading(false));
    }, [path]);

    return { data, loading, error };
  };
}

export const useFetch = makeUseFetch(API_BASES.dashboard);
export const useInochiFetch = makeUseFetch(API_BASES.inochi);
