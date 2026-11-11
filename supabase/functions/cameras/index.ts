const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TRAFIKVERKET_API = 'https://api.trafikinfo.trafikverket.se/v2/data.json';

interface TrafikverketCamera {
  Id: string;
  Name: string;
  Description?: string;
  Location?: string;
  PhotoUrl?: string;
  PhotoTime?: string;
  Status?: string;
  Type?: string;
  CountyNo?: number[];
  Geometry?: {
    WGS84?: string;
  };
  ModifiedTime?: string;
  HasFullSizePhoto?: boolean;
  CameraGroup?: string;
  ContentType?: string;
  Direction?: number;
  Active?: boolean;
}

function buildRequestXml(apiKey: string): string {
  return `
<REQUEST>
  <LOGIN authenticationkey="${apiKey}" />
  <QUERY objecttype="Camera" schemaversion="1" limit="50">
    <FILTER>
      <EQ name="Active" value="true" />
      <IN name="CountyNo" value="14" />
    </FILTER>
    <INCLUDE>Id</INCLUDE>
    <INCLUDE>Name</INCLUDE>
    <INCLUDE>Description</INCLUDE>
    <INCLUDE>Location</INCLUDE>
    <INCLUDE>PhotoUrl</INCLUDE>
    <INCLUDE>PhotoTime</INCLUDE>
    <INCLUDE>Status</INCLUDE>
    <INCLUDE>Type</INCLUDE>
    <INCLUDE>ModifiedTime</INCLUDE>
    <INCLUDE>HasFullSizePhoto</INCLUDE>
    <INCLUDE>Direction</INCLUDE>
    <INCLUDE>ContentType</INCLUDE>
  </QUERY>
</REQUEST>`.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TRAFIKVERKET_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'TRAFIKVERKET_API_KEY not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const xmlBody = buildRequestXml(apiKey);
    console.log('Fetching cameras from Trafikverket API...');

    const response = await fetch(TRAFIKVERKET_API, {
      method: 'POST',
      redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'text/xml' },
      body: xmlBody,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Trafikverket API error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: { code: `TRAFIKVERKET_${response.status}`, message: 'Kunde inte hämta kamerabilder.' } }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const results = data?.RESPONSE?.RESULT;
    const cameraData: TrafikverketCamera[] = results?.[0]?.Camera || [];

    console.log(`Got ${cameraData.length} cameras from Trafikverket`);

    const cameras = cameraData
      .filter((c) => {
        try {
          const url = new URL(c.PhotoUrl ?? '');
          return c.Status !== 'Removed' && url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'trafikverket.se' || url.hostname.endsWith('.trafikverket.se'));
        } catch { return false; }
      })
      .map((c) => ({
        id: c.Id,
        name: c.Name || 'Okänd kamera',
        location: c.Location || 'Göteborg',
        description: c.Description || undefined,
        thumbnailUrl: c.PhotoUrl ?? '',
        fullImageUrl: c.PhotoUrl ?? '',
        updatedAt: c.PhotoTime || c.ModifiedTime || new Date().toISOString(),
        direction: c.Direction,
        type: c.Type,
      }));

    // Sort by name
    cameras.sort((a, b) => a.name.localeCompare(b.name, 'sv'));

    return new Response(JSON.stringify(cameras), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
