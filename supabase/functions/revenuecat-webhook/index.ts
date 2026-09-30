// møni · revenuecat-webhook Edge Function
//
// Receives RevenueCat webhook events and upserts `public.entitlements`. PLAN.md §7.10: the
// server (this table) is the source of truth for the premium entitlement / AI limit, never
// the client's cached RevenueCat state.
//
// IMPORTANT: this function must be deployed with `verify_jwt = false` (see
// supabase/config.toml `[functions.revenuecat-webhook]` and supabase/README.md) — RevenueCat
// does not send a Supabase user JWT, it sends its OWN shared-secret header instead, which we
// verify manually below.
//
// Required secret: REVENUECAT_WEBHOOK_SECRET — set this as the "Authorization header value"
// (or webhook secret, depending on RevenueCat's current dashboard wording) when configuring
// the webhook in the RevenueCat dashboard, so RevenueCat sends it back on every request.

import { handleCors, jsonResponse } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

// Events that grant/extend premium access.
const GRANTING_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
]);

// Events that revoke premium access immediately.
const REVOKING_EVENTS = new Set(['EXPIRATION']);

// CANCELLATION means the user turned off auto-renew but keeps access until `expiration_at_ms`
// — we still update `expires_at` from the payload but do not flip is_premium off here; the
// EXPIRATION event (sent when the period actually ends) is what revokes access.
const NOTICE_ONLY_EVENTS = new Set(['CANCELLATION', 'BILLING_ISSUE']);

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  expiration_at_ms?: number | null;
  [key: string]: unknown;
}

interface RevenueCatWebhookPayload {
  event: RevenueCatEvent;
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, { status: 405 });
  }

  if (!REVENUECAT_WEBHOOK_SECRET) {
    console.error('revenuecat-webhook: REVENUECAT_WEBHOOK_SECRET is not set');
    return jsonResponse({ error: 'server_misconfigured' }, { status: 500 });
  }

  // RevenueCat sends the configured secret back as a plain Authorization header
  // ("Bearer <secret>" or just "<secret>", depending on dashboard config) — accept either.
  const authHeader = req.headers.get('Authorization') ?? '';
  const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (provided !== REVENUECAT_WEBHOOK_SECRET) {
    console.error('revenuecat-webhook: invalid shared secret');
    return jsonResponse({ error: 'unauthorized' }, { status: 401 });
  }

  let payload: RevenueCatWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid_json_body' }, { status: 400 });
  }

  const event = payload?.event;
  if (!event?.type || !event.app_user_id) {
    return jsonResponse({ error: 'invalid_event_payload' }, { status: 400 });
  }

  // app_user_id is expected to be the Supabase auth user id (the client identifies RevenueCat
  // with `Purchases.logIn(supabaseUserId)`) — see supabase/README.md for the client-side
  // convention this depends on.
  const userId = event.app_user_id;
  const expiresAt = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  const serviceClient = createServiceClient();

  let isPremium: boolean | null = null;
  if (GRANTING_EVENTS.has(event.type)) {
    isPremium = true;
  } else if (REVOKING_EVENTS.has(event.type)) {
    isPremium = false;
  }
  // NOTICE_ONLY_EVENTS and any unrecognized event type: still update expires_at (if present)
  // without changing is_premium.

  const updatePayload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (isPremium !== null) updatePayload.is_premium = isPremium;
  if (expiresAt !== null) updatePayload.expires_at = expiresAt;

  const { error } = await serviceClient
    .from('entitlements')
    .upsert(updatePayload, { onConflict: 'user_id' });

  if (error) {
    console.error('revenuecat-webhook: upsert failed', error);
    return jsonResponse({ error: 'db_error' }, { status: 500 });
  }

  if (
    !GRANTING_EVENTS.has(event.type) &&
    !REVOKING_EVENTS.has(event.type) &&
    !NOTICE_ONLY_EVENTS.has(event.type)
  ) {
    console.warn(
      'revenuecat-webhook: unrecognized event type, recorded expiry only',
      event.type,
    );
  }

  return jsonResponse({ ok: true });
});
