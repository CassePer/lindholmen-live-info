const KEY = "admin_session";
export function getAdminToken(): string | null {
  const token = sessionStorage.getItem(KEY);
  const expires = Number(token?.split(".")[0]);
  if (!token || !Number.isFinite(expires) || expires <= Date.now()) {
    sessionStorage.removeItem(KEY);
    return null;
  }
  return token;
}
export function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { "x-admin-session": token } : {};
}
export function saveAdminToken(token: string) { sessionStorage.setItem(KEY, token); }
export function removeAdminToken() { sessionStorage.removeItem(KEY); }