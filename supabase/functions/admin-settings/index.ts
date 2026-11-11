import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isAdminRequest } from '../_shared/admin-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-admin-session, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = await isAdminRequest(req);
  if (req.method !== 'GET' && !admin) return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Logga in som administratör.' } }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response('Konfiguration saknas.', { status: 500, headers: corsHeaders });
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');
      if (error) throw error;
      const settings: Record<string, string> = {};
      for (const row of data) {
        if (!admin && row.key === 'tv_ip_range') continue;
        settings[row.key] = row.value;
      }
      return new Response(JSON.stringify(settings), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await req.json();
      const { key, value } = body;
      if (typeof key !== 'string' || !/^(lunch_|departure_|camera_|tv_)[a-z_]+$/.test(key) || typeof value !== 'string' || value.length > 2000) {
        return new Response(JSON.stringify({ error: 'key and value required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
