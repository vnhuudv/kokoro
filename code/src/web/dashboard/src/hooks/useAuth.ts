const TOKEN_KEY = 'kokoro_jwt';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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
