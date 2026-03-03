const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipToNumber(ip) & mask) === (ipToNumber(rangeIp) & mask);
}

function isIpInRange(ip: string, rangeStr: string): boolean {
  // Support comma-separated list of CIDRs or single IPs
  const ranges = rangeStr.split(',').map((r) => r.trim()).filter(Boolean);
  for (const range of ranges) {
    if (range.includes('/')) {
      if (isIpInCidr(ip, range)) return true;
    } else {
      if (ip === range) return true;
    }
  }
  return false;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP from headers
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  // Read configured IP range from app_settings
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'tv_ip_range')
    .maybeSingle();

  const configuredRange = data?.value || '';
  const isTv = configuredRange ? isIpInRange(clientIp, configuredRange) : false;

  return new Response(
    JSON.stringify({ ip: clientIp, isTv, configuredRange }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
