// Auth placeholder – no login required initially.
// When a real auth backend is added, implement getToken() to return a JWT.

let tokenProvider: (() => string | null) | null = null;

export function setTokenProvider(provider: () => string | null): void {
  tokenProvider = provider;
}

export function getToken(): string | null {
  return tokenProvider ? tokenProvider() : null;
}
