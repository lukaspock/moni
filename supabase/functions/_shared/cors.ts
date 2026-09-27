// Shared CORS handling for møni Edge Functions.
// The native client calls these functions with a Supabase-issued JWT and no browser origin
// restrictions apply on-device, but we still answer CORS preflights cleanly for local testing
// (curl/Postman/Expo web preview) and potential future web usage.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-revenuecat-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Returns a 204 response for an OPTIONS preflight, or null if this isn't one. */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}
