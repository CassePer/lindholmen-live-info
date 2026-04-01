import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TRAFIKLAB_BASE = 'https://realtime-api.trafiklab.se/v1';

// Default stop IDs (can be overridden via app_settings)
const DEFAULT_STOP_BUS = '740059410';
const DEFAULT_STOP_TRAM = '740059410';
const DEFAULT_STOP_FERRY = '740059412';

interface TrafiklabDeparture {
  scheduled: string;
  realtime?: string;
  delay: number;
  canceled: boolean;
  is_realtime: boolean;
  route: {
    name: string;
    designation: string;
    transport_mode: string;
    transport_mode_code: number;
    direction: string;
    destination: {
      id: string;
      name: string;
    };
  };
  trip: {
    trip_id: string;
    start_date: string;
  };
  stop: {
    id: string;
    name: string;
  };
  alerts: unknown[];
}

interface TrafiklabResponse {
  timestamp: string;
  query: { queryTime: string; query: string };
  stops: { id: string; name: string; transport_modes: string[] }[];
  departures: TrafiklabDeparture[];
}

function mapTransportMode(mode: string, code: number): string {
  if (code === 1000 || code === 1200) return 'Färja';
  if (code === 900) return 'Spårvagn';
  if (code === 700) return 'Buss';
  if (code === 100) return 'Tåg';

  const m = mode?.toUpperCase();
  if (m === 'FERRY' || m === 'SHIP') return 'Färja';
  if (m === 'TRAM') return 'Spårvagn';
  if (m === 'BUS') return 'Buss';
  if (m === 'TRAIN') return 'Tåg';
  return 'Buss';
}

function formatTime(isoStr: string): string {
  const match = isoStr.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : isoStr;
}

async function fetchDepartures(areaId: string, apiKey: string, time?: string | null): Promise<TrafiklabResponse | null> {
  let url = `${TRAFIKLAB_BASE}/departures/${areaId}`;
  if (time) url += `/${time}`;
  url += `?key=${apiKey}`;

  console.log('Fetching departures from:', url.replace(apiKey, '***'));
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Departures error for ${areaId}:`, res.status);
    return null;
  }
  return await res.json();
}

function mapDepartures(data: TrafiklabResponse): {
  id: string;
  line: string;
  destination: string;
  scheduledTime: string;
  estimatedTime?: string;
  delayMinutes: number;
  isRealtime: boolean;
  transportType: string;
  scheduledIso: string;
  realtimeIso?: string;
}[] {
  return (data.departures || [])
    .filter((d) => !d.canceled)
    .map((d, i) => ({
      id: `${d.trip?.trip_id || i}-${d.scheduled}`,
      line: d.route.designation,
      destination: d.route.direction || d.route.destination?.name || '',
      scheduledTime: formatTime(d.scheduled),
      estimatedTime: d.realtime ? formatTime(d.realtime) : undefined,
      delayMinutes: d.delay || 0,
      isRealtime: d.is_realtime ?? false,
      transportType: mapTransportMode(d.route.transport_mode, d.route.transport_mode_code),
      scheduledIso: d.scheduled,
      realtimeIso: d.realtime,
    }));
}

async function getStopIds(): Promise<{ bus: string; tram: string; ferry: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      console.log('No Supabase credentials, using default stop IDs');
      return { bus: DEFAULT_STOP_BUS, tram: DEFAULT_STOP_TRAM, ferry: DEFAULT_STOP_FERRY };
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['departure_stop_bus', 'departure_stop_tram', 'departure_stop_ferry']);

    if (error) {
      console.error('Error fetching stop IDs from settings:', error.message);
      return { bus: DEFAULT_STOP_BUS, tram: DEFAULT_STOP_TRAM, ferry: DEFAULT_STOP_FERRY };
    }

    const settings: Record<string, string> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return {
      bus: settings.departure_stop_bus || DEFAULT_STOP_BUS,
      tram: settings.departure_stop_tram || DEFAULT_STOP_TRAM,
      ferry: settings.departure_stop_ferry || DEFAULT_STOP_FERRY,
    };
  } catch (err) {
    console.error('Error reading stop settings:', err);
    return { bus: DEFAULT_STOP_BUS, tram: DEFAULT_STOP_TRAM, ferry: DEFAULT_STOP_FERRY };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TRAFIKLAB_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'TRAFIKLAB_API_KEY not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const time = url.searchParams.get('time');

    // Get configured stop IDs
    const stopIds = await getStopIds();
    
    // Collect unique stop IDs to fetch
    const uniqueStops = [...new Set([stopIds.bus, stopIds.tram, stopIds.ferry])];
    console.log('Fetching from stops:', uniqueStops.join(', '));

    // Fetch departures from all unique stops in parallel
    const results = await Promise.all(
      uniqueStops.map((id) => fetchDepartures(id, apiKey, time))
    );

    // Merge departures from all stops
    let allDepartures: ReturnType<typeof mapDepartures> = [];
    let timestamp = new Date().toISOString();

    for (const data of results) {
      if (data) {
        allDepartures = allDepartures.concat(mapDepartures(data));
        timestamp = data.timestamp || timestamp;
      }
    }

    // Log transport type counts for debugging
    const typeCounts: Record<string, number> = {};
    for (const d of allDepartures) {
      typeCounts[d.transportType] = (typeCounts[d.transportType] || 0) + 1;
    }
    console.log('Departure counts by type:', JSON.stringify(typeCounts));

    // Sort by scheduled time and deduplicate
    allDepartures.sort((a, b) => a.scheduledIso.localeCompare(b.scheduledIso));
    const seen = new Set<string>();
    allDepartures = allDepartures.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });

    const stopName = uniqueStops.length > 1 ? 'Lindholmen & Lindholmspiren' : 'Lindholmen';

    const result = {
      departures: allDepartures,
      updatedAt: timestamp,
      areaId: stopIds.bus,
      stopName,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching departures:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
