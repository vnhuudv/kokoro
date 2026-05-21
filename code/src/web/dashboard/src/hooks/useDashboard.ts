import { useEffect, useState } from 'react';

const API = 'http://localhost:3000/api/dashboard';
const INOCHI_API = 'http://localhost:3000/api/inochi';

export function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}${path}`)
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [path]);

  return { data, loading, error };
}

export function useInochiFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${INOCHI_API}${path}`)
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [path]);

  return { data, loading, error };
}
