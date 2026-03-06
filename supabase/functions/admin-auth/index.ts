const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// In-memory rate limiter: max 5 attempts per IP per 15 minutes
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; firstAttempt: number }>();

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    // Window expired or first attempt
    attempts.set(ip, { count: 1, firstAttempt: now });
    return { limited: false, retryAfterSec: 0 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((record.firstAttempt + WINDOW_MS - now) / 1000);
    return { limited: true, retryAfterSec };
  }

  record.count++;
  return { limited: false, retryAfterSec: 0 };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const ip = getClientIp(req);
  const { limited, retryAfterSec } = isRateLimited(ip);

  if (limited) {
    return new Response(
      JSON.stringify({
        error: { code: 'RATE_LIMITED', message: `För många försök. Försök igen om ${retryAfterSec} sekunder.` },
      }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) },
      }
    );
  }

  try {
    const { password } = await req.json();
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!adminPassword) {
      return new Response(JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'Admin password not configured' } }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const valid = password === adminPassword;
    return new Response(JSON.stringify({ valid }), {
      status: valid ? 200 : 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'Invalid request' } }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
