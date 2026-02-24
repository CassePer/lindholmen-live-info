const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TRAFIKLAB_BASE = 'https://realtime-api.trafiklab.se/v1';

// Lindholmspiren area_id – we'll resolve it dynamically on first call and cache
let cachedAreaId: string | null = null;

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
  // Trafiklab codes: 100=train, 400=metro, 700=bus, 900=tram, 1000=ferry, 1200=ferry
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
  // "2025-04-01T14:30:00" -> "14:30"
  const match = isoStr.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : isoStr;
}

// Lindholmspiren rikshållplats ID
// From GTFS Sverige 2: "Lindholmen (Göteborg kn)" = 740059410
// Lindholmspiren is part of the Lindholmen rikshållplats area
const LINDHOLMSPIREN_AREA_ID = '740059410';

async function resolveAreaId(_apiKey: string): Promise<string> {
  return LINDHOLMSPIREN_AREA_ID;
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

    // Parse optional time parameter from query string
    const url = new URL(req.url);
    const time = url.searchParams.get('time'); // YYYY-MM-DDTHH:mm format

    const areaId = await resolveAreaId(apiKey);

    // Build Trafiklab URL
    let trafiklabUrl = `${TRAFIKLAB_BASE}/departures/${areaId}`;
    if (time) {
      trafiklabUrl += `/${time}`;
    }
    trafiklabUrl += `?key=${apiKey}`;

    console.log('Fetching departures from:', trafiklabUrl.replace(apiKey, '***'));

    const response = await fetch(trafiklabUrl);

    if (!response.ok) {
      const errText = await response.text();
      console.error('Trafiklab API error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: { code: `TRAFIKLAB_${response.status}`, message: 'Kunde inte hämta avgångar från Trafiklab.' } }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: TrafiklabResponse = await response.json();

    // Transform to our API contract format
    const departures = (data.departures || [])
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

    const result = {
      departures,
      updatedAt: data.timestamp || new Date().toISOString(),
      areaId,
      stopName: data.stops?.[0]?.name || 'Lindholmspiren',
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
