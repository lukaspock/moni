// møni · recompute-targets Edge Function (Phase 6 — PLAN.md §6.7)
//
// Adaptive TDEE: smooths the weight trend (EMA), derives the observed energy expenditure from
// intake + trend, blends it with the formula TDEE, clamps (±150 kcal/week, safety band) and
// upserts one `tdee_estimates` row per user and week. The client (src/features/targets) reads
// the latest row and uses `blended_tdee` as the TDEE behind the daily limit; `daily_targets`
// is (re)written by the client from that value, not here.
//
// Two call modes:
//  1. Cron (weekly, migration 20260927120700): `Authorization: Bearer <service_role_key>` ->
//     all users that logged a weight in the window.
//  2. Client: the user's own JWT -> only that user. Optional body `{ "today": "YYYY-MM-DD" }`
//     (the user's local date; the window ends the day before). Cron uses the UTC date.
//
// Idempotent: the row is keyed on (user_id, week_start = Monday); re-running in the same week
// with the same data overwrites it with the same values. The "previous" TDEE is always the
// latest row of an EARLIER week, so a rerun never compounds the weekly clamp.
// Not enough data -> no-op (nothing written), response carries reason `insufficient_data`.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import {
  ADAPTIVE_WINDOW_DAYS,
  computeAdaptiveTDEE,
  shiftIsoDate,
  summarizeAdaptiveWindow,
  weekStartOf,
} from "../_shared/adaptive.ts";
import { ageOn, type ActivityLevel, formulaTdee, type Sex } from "../_shared/formula.ts";

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PAGE = 1000;

type RecomputeResult =
  | { status: "updated"; user_id: string; week_start: string; blended_tdee: number; observed_tdee: number | null; reason_code: string; weekly_change_kcal: number; confidence: number }
  | { status: "skipped"; user_id: string; reason: string };

/** Reads all rows of a query, paging past PostgREST's 1000-row cap. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

async function recomputeForUser(db: SupabaseClient, userId: string, today: string): Promise<RecomputeResult> {
  const windowEnd = shiftIsoDate(today, -1); // today is still incomplete
  const windowStart = shiftIsoDate(windowEnd, -(ADAPTIVE_WINDOW_DAYS - 1));
  const weekStart = weekStartOf(today);

  const { data: profile, error: pErr } = await db
    .from("profiles")
    .select("sex, birth_date, height_cm, activity_level")
    .eq("id", userId)
    .maybeSingle();
  if (pErr) throw new Error(pErr.message);
  if (!profile?.sex || !profile.birth_date || !profile.height_cm || !profile.activity_level) {
    return { status: "skipped", user_id: userId, reason: "profile_incomplete" };
  }

  const weights = await fetchAll<{ date: string; weight_kg: number }>((from, to) =>
    db.from("weight_logs").select("date, weight_kg").eq("user_id", userId)
      .gte("date", windowStart).lte("date", windowEnd).order("date").range(from, to)
  );
  const foods = await fetchAll<{ date: string; kcal: number }>((from, to) =>
    db.from("food_logs").select("date, kcal").eq("user_id", userId)
      .gte("date", windowStart).lte("date", windowEnd).order("date").range(from, to)
  );

  const intakeKcalByDate: Record<string, number> = {};
  for (const f of foods) intakeKcalByDate[f.date] = (intakeKcalByDate[f.date] ?? 0) + Number(f.kcal);

  const summary = summarizeAdaptiveWindow({
    weights: weights.map((w) => ({ date: w.date, weightKg: Number(w.weight_kg) })),
    intakeKcalByDate,
    windowStart,
    windowEnd,
  });

  // Formula TDEE from the latest known weight (may be older than the window).
  const { data: latest, error: lErr } = await db
    .from("weight_logs").select("weight_kg").eq("user_id", userId).lte("date", today)
    .order("date", { ascending: false }).limit(1).maybeSingle();
  if (lErr) throw new Error(lErr.message);
  if (!latest) return { status: "skipped", user_id: userId, reason: "no_weight" };

  const formula = formulaTdee(
    profile.sex as Sex,
    Number(latest.weight_kg),
    Number(profile.height_cm),
    ageOn(profile.birth_date, today),
    profile.activity_level as ActivityLevel,
  );

  // Previous blended value: the latest estimate of an earlier week, else the formula.
  const { data: prev, error: vErr } = await db
    .from("tdee_estimates").select("blended_tdee").eq("user_id", userId)
    .lt("week_start", weekStart).order("week_start", { ascending: false }).limit(1).maybeSingle();
  if (vErr) throw new Error(vErr.message);
  const previousBlendedTDEE = prev?.blended_tdee != null ? Number(prev.blended_tdee) : formula;

  const result = computeAdaptiveTDEE({
    formulaTDEE: formula,
    previousBlendedTDEE,
    avgIntakeKcal: summary.avgIntakeKcal,
    trendWeightDeltaKg: summary.trendWeightDeltaKg,
    days: summary.days,
    prerequisites: summary.prerequisites,
  });

  if (result.reasonCode === "insufficient_data") {
    return { status: "skipped", user_id: userId, reason: "insufficient_data" };
  }

  const { error: uErr } = await db.from("tdee_estimates").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      formula_tdee: result.formulaTDEE,
      observed_tdee: result.observedTDEE,
      blended_tdee: result.blendedTDEE,
      confidence: result.confidence,
      reason_code: result.reasonCode,
      weekly_change_kcal: result.weeklyChangeKcal,
      weight_trend_kg: Math.round(summary.trendWeightDeltaKg * 100) / 100,
    },
    { onConflict: "user_id,week_start" },
  );
  if (uErr) throw new Error(uErr.message);

  return {
    status: "updated",
    user_id: userId,
    week_start: weekStart,
    blended_tdee: result.blendedTDEE,
    observed_tdee: result.observedTDEE,
    reason_code: result.reasonCode,
    weekly_change_kcal: result.weeklyChangeKcal,
    confidence: result.confidence,
  };
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, { status: 405 });
  }

  let body: { today?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }
  const utcToday = new Date().toISOString().slice(0, 10);

  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRoleCall = !!SERVICE_ROLE_KEY && authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
  const db = createServiceClient();

  try {
    if (isServiceRoleCall) {
      // --- Cron / all-users mode: everyone with a weight entry in the window. ----------
      const windowStart = shiftIsoDate(utcToday, -ADAPTIVE_WINDOW_DAYS);
      const rows = await fetchAll<{ user_id: string }>((from, to) =>
        db.from("weight_logs").select("user_id").gte("date", windowStart).order("user_id").range(from, to)
      );
      const userIds = [...new Set(rows.map((r) => r.user_id))];

      let updated = 0;
      let skipped = 0;
      const errors: { user_id: string; error: string }[] = [];
      for (const id of userIds) {
        try {
          const r = await recomputeForUser(db, id, utcToday);
          if (r.status === "updated") updated++;
          else skipped++;
        } catch (e) {
          errors.push({ user_id: id, error: (e as Error).message });
        }
      }
      console.log(`recompute-targets cron: processed=${userIds.length} updated=${updated} skipped=${skipped} errors=${errors.length}`);
      return jsonResponse({ ok: true, mode: "all_users", processed: userIds.length, updated, skipped, errors });
    }

    // --- Single-user mode (client JWT) --------------------------------------------------
    const { user } = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, { status: 401 });

    // The client may pass its local date; it may differ from UTC by at most a day.
    const today = isIsoDate(body.today) && Math.abs(Date.parse(body.today) - Date.parse(utcToday)) <= 2 * 86_400_000
      ? body.today
      : utcToday;

    const result = await recomputeForUser(db, user.id, today);
    return jsonResponse({ ok: true, mode: "single_user", ...result });
  } catch (e) {
    console.error("recompute-targets failed:", (e as Error).message);
    return jsonResponse({ error: "internal_error" }, { status: 500 });
  }
});
