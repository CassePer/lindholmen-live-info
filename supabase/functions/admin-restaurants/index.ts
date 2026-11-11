import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isAdminRequest } from '../_shared/admin-session.ts';
import { allowedSource } from '../_shared/source-policy.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-admin-session, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!(await isAdminRequest(req))) return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Logga in som administratör.' } }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return new Response('Konfiguration saknas.', { status: 500, headers: corsHeaders });
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();

      // Handle action-based requests (delete, clear_cache)
      if (body.action === 'clear_cache') {
        const { error } = await supabase.from('lunch_menu_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, cleared: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (body.action === 'delete') {
        if (!body.id) {
          return new Response(JSON.stringify({ error: 'id required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { error } = await supabase.from('restaurants').delete().eq('id', body.id);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default POST: create restaurant
      const { name, website_url, menu_url } = body;
      if (typeof name !== 'string' || !name.trim() || name.length > 150 || !allowedSource(menu_url) || (website_url && !allowedSource(website_url))) {
        return new Response(JSON.stringify({ error: 'name and menu_url required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await supabase
        .from('restaurants')
        .insert({ name, website_url: website_url || menu_url, menu_url })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = await req.json();
      const { id, ...updates } = body;
      const permitted = ['name', 'website_url', 'menu_url', 'rss_url', 'active', 'weekly_menu'];
      const invalid = Object.entries(updates).some(([key, value]) => !permitted.includes(key) || (['website_url', 'menu_url', 'rss_url'].includes(key) && !allowedSource(value)) || (['active', 'weekly_menu'].includes(key) && typeof value !== 'boolean') || (key === 'name' && (typeof value !== 'string' || !value.trim() || value.length > 150)));
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id) || invalid) {
        return new Response(JSON.stringify({ error: 'id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'DELETE') {
      const rawBody = await req.text();
      let body: Record<string, unknown> = {};
      try { body = JSON.parse(rawBody); } catch { /* empty */ }
      const id = body.id as string | undefined;
      const clearCache = body.clear_cache;

      // Clear lunch cache
      if (clearCache) {
        const { error } = await supabase.from('lunch_menu_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, cleared: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Also check URL params as fallback
      const url = new URL(req.url);
      const urlId = url.searchParams.get('id');
      const urlClearCache = url.searchParams.get('clear_cache');

      if (urlClearCache === 'true') {
        const { error } = await supabase.from('lunch_menu_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true, cleared: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const finalId = id || urlId;
      if (!finalId) {
        return new Response(JSON.stringify({ error: 'id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { error } = await supabase.from('restaurants').delete().eq('id', finalId);
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
