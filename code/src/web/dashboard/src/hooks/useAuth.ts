const TOKEN_KEY = 'kokoro_jwt';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable (e.g. private browsing) — token won't persist
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function useAuth() {
  const token = getToken();
  return {
    isAuthenticated: !!token,
    logout() {
      clearToken();
      window.location.href = '/login';
    },
  };
}
