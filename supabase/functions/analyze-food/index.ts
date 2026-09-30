// møni · analyze-food Edge Function
//
// PLAN.md §7.3. Verifies the caller's JWT, enforces the free-tier daily AI limit, calls
// Gemini with structured output for either a food photo or free text, plausibility-checks
// the macros, increments ai_usage, and returns the result. Does NOT write a food_log row —
// the client saves the food log only after the user confirms/edits the result on the Review
// screen.
//
// Required secrets (see supabase/README.md):
//   GEMINI_API_KEY            - Gemini API key (required)
//   GEMINI_MODEL               - e.g. "gemini-2.5-flash" (optional, has a default below)
//   FREE_AI_LIMIT_PER_DAY      - integer, default 3 (optional)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are auto-injected by the
// platform, see supabase/functions/_shared/supabase.ts.

import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
const FREE_AI_LIMIT_PER_DAY = Number(Deno.env.get("FREE_AI_LIMIT_PER_DAY") ?? "3");

const FOOD_IMAGES_BUCKET = "food-images";

// Kept in sync by hand with the Gemini `responseSchema` below and PLAN.md §7.3's response
// shape: { title, meal_guess, items: [{ name, grams, kcal, protein_g, carbs_g, fat_g }],
// confidence, clarification? }.
interface FoodItem {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface AnalyzeFoodResult {
  title: string;
  meal_guess: string | null;
  items: FoodItem[];
  confidence: number;
  clarification?: string;
}

interface RequestBody {
  image_path?: string;
  text?: string;
  locale?: string;
  /** "meal" (default): photo/text meal estimate. "label": read a packaged-food nutrition table. */
  mode?: "meal" | "label";
}

// Nutrition-label mode result (per 100 g is what the client scales; per-serving is informational).
interface LabelMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface LabelResult {
  product_name: string | null;
  serving_size_g: number | null;
  per_100g: LabelMacros | null;
  per_serving: LabelMacros | null;
  confidence: number;
}

// Minimal shape of the Gemini generateContent response we actually read.
interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    meal_guess: {
      type: "STRING",
      enum: ["breakfast", "lunch", "dinner", "snack"],
      nullable: true,
    },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          grams: { type: "NUMBER" },
          kcal: { type: "NUMBER" },
          protein_g: { type: "NUMBER" },
          carbs_g: { type: "NUMBER" },
          fat_g: { type: "NUMBER" },
        },
        required: ["name", "grams", "kcal", "protein_g", "carbs_g", "fat_g"],
      },
    },
    confidence: { type: "NUMBER" },
    clarification: { type: "STRING", nullable: true },
  },
  required: ["title", "items", "confidence"],
};

const LABEL_MACROS_SCHEMA = {
  type: "OBJECT",
  nullable: true,
  properties: {
    kcal: { type: "NUMBER" },
    protein_g: { type: "NUMBER" },
    carbs_g: { type: "NUMBER" },
    fat_g: { type: "NUMBER" },
  },
  required: ["kcal", "protein_g", "carbs_g", "fat_g"],
};

const GEMINI_LABEL_SCHEMA = {
  type: "OBJECT",
  properties: {
    product_name: { type: "STRING", nullable: true },
    serving_size_g: { type: "NUMBER", nullable: true },
    per_100g: LABEL_MACROS_SCHEMA,
    per_serving: LABEL_MACROS_SCHEMA,
    confidence: { type: "NUMBER" },
  },
  required: ["confidence"],
};

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, { status: 405 });
  }

  if (!GEMINI_API_KEY) {
    console.error("analyze-food: GEMINI_API_KEY is not set");
    return jsonResponse({ error: "server_misconfigured" }, { status: 500 });
  }

  // 1. Verify JWT.
  const { user, userClient } = await getAuthenticatedUser(req);
  if (!user) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json_body" }, { status: 400 });
  }

  const { image_path, text, locale = "en" } = body;
  const mode = body.mode === "label" ? "label" : "meal";

  if (mode === "label" && !image_path) {
    return jsonResponse({ error: "label_requires_image" }, { status: 400 });
  }

  if (!image_path && !text?.trim()) {
    return jsonResponse({ error: "image_path_or_text_required" }, { status: 400 });
  }

  // image_path must live inside the caller's own storage folder ({user_id}/...) — this is
  // also enforced by the storage RLS policy, but we check it explicitly before even
  // attempting the download so a mistaken/forged path fails fast with a clear error.
  if (
    image_path &&
    (!image_path.startsWith(`${user.id}/`) || image_path.split("/").includes(".."))
  ) {
    return jsonResponse({ error: "image_path_forbidden" }, { status: 403 });
  }

  const serviceClient = createServiceClient();
  const today = new Date().toISOString().slice(0, 10); // UTC date; acceptable for a daily quota

  // 2. Entitlements + ai_usage check.
  const [{ data: entitlement }, { data: usageRow }] = await Promise.all([
    serviceClient
      .from("entitlements")
      .select("is_premium, expires_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    serviceClient
      .from("ai_usage")
      .select("count")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),
  ]);

  const isPremium =
    !!entitlement?.is_premium &&
    (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date());
  const usedToday = usageRow?.count ?? 0;

  if (!isPremium && usedToday >= FREE_AI_LIMIT_PER_DAY) {
    return jsonResponse(
      {
        error: "ai_limit_reached",
        limit: FREE_AI_LIMIT_PER_DAY,
        used: usedToday,
      },
      { status: 402 },
    );
  }

  // 3. Build the Gemini request: image (downloaded from storage, signed/inline) or text.
  let imagePart: { inline_data: { mime_type: string; data: string } } | null = null;

  if (image_path) {
    const { data: fileBlob, error: downloadError } = await userClient.storage
      .from(FOOD_IMAGES_BUCKET)
      .download(image_path);

    if (downloadError || !fileBlob) {
      return jsonResponse({ error: "image_not_found" }, { status: 404 });
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = base64Encode(new Uint8Array(arrayBuffer));
    imagePart = {
      inline_data: {
        mime_type: fileBlob.type || "image/jpeg",
        data: base64,
      },
    };
  }

  const prompt =
    mode === "label"
      ? buildLabelPrompt(locale)
      : buildPrompt({ locale, hasImage: !!imagePart, text });

  const parts: unknown[] = [{ text: prompt }];
  if (imagePart) parts.push(imagePart);

  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent` +
    `?key=${GEMINI_API_KEY}`;

  let geminiJson: GeminiGenerateContentResponse;
  try {
    const geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: mode === "label" ? GEMINI_LABEL_SCHEMA : GEMINI_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("analyze-food: Gemini error", geminiResp.status, errText);
      return jsonResponse({ error: "ai_provider_error" }, { status: 502 });
    }

    geminiJson = await geminiResp.json();
  } catch (err) {
    console.error("analyze-food: Gemini fetch failed", err);
    return jsonResponse({ error: "ai_provider_unreachable" }, { status: 502 });
  }

  const rawText: string | undefined =
    geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    console.error("analyze-food: no text in Gemini response", JSON.stringify(geminiJson));
    return jsonResponse({ error: "ai_empty_response" }, { status: 502 });
  }

  let parsed: AnalyzeFoodResult | LabelResult;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("analyze-food: could not parse Gemini JSON", rawText);
    return jsonResponse({ error: "ai_invalid_response" }, { status: 502 });
  }

  // Label mode: a table that could not be read is reported as 422 and does NOT consume quota.
  let result: PlausibilizedResult | { mode: "label"; label: LabelResult };
  if (mode === "label") {
    const label = normalizeLabel(parsed as LabelResult);
    if (!label) {
      return jsonResponse({ error: "label_not_readable" }, { status: 422 });
    }
    result = { mode: "label", label };
  } else {
    result = plausibilizeAndRound(parsed as AnalyzeFoodResult);
  }

  // 4. Increment ai_usage (service role RPC, security definer — see migration 007).
  const { error: incrementError } = await serviceClient.rpc("increment_ai_usage", {
    p_user_id: user.id,
    p_date: today,
  });
  if (incrementError) {
    // Do not fail the whole request just because the counter write failed — log and continue,
    // but this should be rare and is worth alerting on.
    console.error("analyze-food: increment_ai_usage failed", incrementError);
  }

  return jsonResponse({
    ...result,
    usage: { used: usedToday + 1, limit: isPremium ? null : FREE_AI_LIMIT_PER_DAY },
  });
});

function buildPrompt(opts: { locale: string; hasImage: boolean; text?: string }): string {
  const { locale, hasImage, text } = opts;
  // Prompt itself is in English (more reliable instruction-following); only the ingredient
  // NAMES in the response must be in the user's locale (PLAN.md §7.9).
  const base = [
    "You are a nutrition estimation assistant for a food-logging app.",
    hasImage
      ? "Analyze the attached photo of a meal."
      : `Analyze this description of a meal: "${text}".`,
    "Identify each distinct food item, estimate its portion in grams, and estimate kcal, " +
      "protein (g), carbs (g) and fat (g) for that portion.",
    `Write all ingredient "name" fields in this language/locale: ${locale}.`,
    "Also provide a short overall title for the meal (in the same locale), a best-guess " +
      "meal_guess (breakfast, lunch, dinner or snack, or null if unclear), and an overall " +
      "confidence between 0 and 1 reflecting how certain you are about the estimate.",
    "If the input is ambiguous or you need more information to give a reasonable estimate, " +
      "still provide your best-effort numbers AND set 'clarification' to a short question " +
      "(in the user's locale) the app could ask the user.",
    "Respond ONLY with JSON matching the provided schema. Do not include markdown fences.",
  ];
  return base.join(" ");
}

function buildLabelPrompt(locale: string): string {
  return [
    "You read the nutrition facts table on the attached photo of a food package.",
    "Extract energy in kcal (if only kJ is shown, convert: kcal = kJ / 4.184), protein, " +
      "carbohydrates (total, not just sugars) and fat (total) in grams.",
    "Fill per_100g with the values per 100 g (or per 100 ml) when the table has that column. " +
      "Fill per_serving with the values per serving when that column exists, and " +
      "serving_size_g with the serving weight in grams (ml counts as g). " +
      "Use null for a column that is not on the label; never invent numbers.",
    `product_name: the product name printed on the package, in its original language (user locale: ${locale}), or null.`,
    "confidence between 0 and 1 reflects how legible the table is. If no nutrition table is visible, " +
      "return null for both columns and confidence 0.",
    "Respond ONLY with JSON matching the provided schema. Do not include markdown fences.",
  ].join(" ");
}

/**
 * Validates and completes a label read. Derives per_100g from per_serving when only the
 * serving column was readable (needs serving_size_g), applies the same kcal-vs-macros
 * plausibility correction as meals, and returns null when no usable numbers were found.
 */
function normalizeLabel(raw: LabelResult): LabelResult | null {
  const servingG =
    raw.serving_size_g && raw.serving_size_g > 0 ? round(raw.serving_size_g, 1) : null;

  const clean = (m: LabelMacros | null | undefined): LabelMacros | null => {
    if (!m) return null;
    const protein_g = Math.max(0, round(m.protein_g, 1));
    const carbs_g = Math.max(0, round(m.carbs_g, 1));
    const fat_g = Math.max(0, round(m.fat_g, 1));
    const macroKcal = 4 * protein_g + 4 * carbs_g + 9 * fat_g;
    const reported = Math.max(0, m.kcal ?? 0);
    const kcal =
      macroKcal > 0 && Math.abs(reported - macroKcal) / macroKcal > 0.15
        ? round(macroKcal, 0)
        : round(reported, 0);
    if (kcal === 0 && protein_g === 0 && carbs_g === 0 && fat_g === 0) return null;
    return { kcal, protein_g, carbs_g, fat_g };
  };

  let per100 = clean(raw.per_100g);
  const perServing = clean(raw.per_serving);

  if (!per100 && perServing && servingG) {
    const f = 100 / servingG;
    per100 = {
      kcal: round(perServing.kcal * f, 0),
      protein_g: round(perServing.protein_g * f, 1),
      carbs_g: round(perServing.carbs_g * f, 1),
      fat_g: round(perServing.fat_g * f, 1),
    };
  }
  if (!per100) return null;

  return {
    product_name: raw.product_name?.trim() || null,
    serving_size_g: servingG,
    per_100g: per100,
    per_serving: perServing,
    confidence: round(clamp(raw.confidence ?? 0.5, 0, 1), 2),
  };
}

interface PlausibilizedResult extends AnalyzeFoodResult {
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
}

/**
 * Server-side plausibility check: kcal should be close to 4*protein + 4*carbs + 9*fat.
 * If a per-item or the totals are off by more than 15%, kcal is corrected to match the
 * macro-derived value (macros from a vision/text model tend to be more stable than the kcal
 * figure). All numeric fields are rounded to sane display precision.
 */
function plausibilizeAndRound(result: AnalyzeFoodResult): PlausibilizedResult {
  const items = (result.items ?? []).map((item) => {
    const grams = round(item.grams, 0);
    const protein_g = round(item.protein_g, 1);
    const carbs_g = round(item.carbs_g, 1);
    const fat_g = round(item.fat_g, 1);
    const macroKcal = 4 * protein_g + 4 * carbs_g + 9 * fat_g;
    const reportedKcal = item.kcal ?? 0;
    const kcal =
      macroKcal > 0 && Math.abs(reportedKcal - macroKcal) / macroKcal > 0.15
        ? round(macroKcal, 0)
        : round(reportedKcal, 0);
    return { name: item.name?.trim() || "?", grams, kcal, protein_g, carbs_g, fat_g };
  });

  const totals = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  const confidence = clamp(result.confidence ?? 0.5, 0, 1);

  return {
    title: result.title?.trim() || "Meal",
    meal_guess: result.meal_guess ?? null,
    items,
    confidence: round(confidence, 2),
    clarification: result.clarification?.trim() || undefined,
    // Totals are informational; the client sums food_items itself when saving.
    totals: {
      kcal: round(totals.kcal, 0),
      protein_g: round(totals.protein_g, 1),
      carbs_g: round(totals.carbs_g, 1),
      fat_g: round(totals.fat_g, 1),
    },
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value ?? 0) * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
