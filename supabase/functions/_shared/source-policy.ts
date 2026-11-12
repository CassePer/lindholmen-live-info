const HOSTS = new Set(['bistrot.se', 'www.bistrot.se', 'districtone.se', 'www.districtone.se', 'kooperativet.se', 'www.kooperativet.se', 'ericssonbynordrest.se', 'www.ericssonbynordrest.se', 'compass-group.se', 'www.compass-group.se', 'restaurangophelia.se', 'www.restaurangophelia.se']);
export function allowedSource(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && HOSTS.has(url.hostname);
  } catch { return false; }
}