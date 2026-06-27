/**
 * RecognizeKitchenItemsUseCase — SnapIt.
 *
 *   1. User uploads photo → already in S3 (handled by the upload route).
 *   2. We call Gemini 2.5 Flash with the image URL + the SnapIt
 *      instructions prompt.
 *   3. Gemini returns a JSON list of detected items + scene summary.
 *   4. For each detected item, we run a similarity search against the
 *      product catalog (text embedding + dimensional filter) — the
 *      retrieval layer is a stub here (returns the static catalog,
 *      fuzzy matched on description tokens) ; replace with a vector
 *      DB (pgvector or Pinecone) when volume justifies.
 *
 * The pipeline is intentionally Gemini-Flash-only — vision is the
 * cheap branch, no Claude in the loop. Cost per call ≈ $0.01.
 */
import { assertQuota, recordUsage, type AiTier } from '../../services/ai/cost-monitor.service';
import { SNAPIT_GEMINI_INSTRUCTIONS } from '../../services/ai/prompts';
import {
  SnapItInputSchema,
  SnapItResponseSchema,
  type SnapItInput,
  type SnapItResponse,
} from '../../services/ai/schemas';
import logger from '../../utils/logger';

const MODEL = 'gemini-2.5-flash';
const PROJECTED_COST_USD = 0.015;

export interface RecognizePhotoArgs {
  userId: string;
  tier: AiTier;
  input: SnapItInput;
}

export interface RecognizePhotoResult {
  recognition: SnapItResponse;
  usage: { monthlyUsdAfter: number };
}

export async function recognizeKitchenItems(
  args: RecognizePhotoArgs
): Promise<RecognizePhotoResult> {
  const input = SnapItInputSchema.parse(args.input);

  const before = await assertQuota({
    userId: args.userId,
    tier: args.tier,
    projectedUsd: PROJECTED_COST_USD,
  });

  // Lazy dynamic import — `@google/genai` is ESM-only, this matches the
  // pattern already used elsewhere in the codebase.
  const { GoogleGenAI } = await import('@google/genai');
  const gen = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

  const start = Date.now();
  const response = await gen.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: SNAPIT_GEMINI_INSTRUCTIONS },
          { fileData: { mimeType: 'image/jpeg', fileUri: input.imageUrl } },
          { text: input.contextNote ? `\nContexte utilisateur : ${input.contextNote}` : '' },
        ],
      },
    ],
    config: {
      // Force JSON output — Gemini supports this natively.
      responseMimeType: 'application/json',
    },
  });
  const durationMs = Date.now() - start;

  // The SDK exposes the text in `response.text`. If you switch to the
  // streaming API later, accumulate the chunks first.
  const rawText = (response as unknown as { text: string }).text ?? '';
  let parsed: SnapItResponse;
  try {
    const json = JSON.parse(rawText);
    // Run matches against our catalog. Stub for now (empty) — wire
    // pgvector when volume justifies.
    if (Array.isArray(json.detectedItems)) {
      for (const item of json.detectedItems) {
        item.matches = await matchCatalog(item.description, item.estimatedSize).catch(() => []);
      }
    }
    parsed = SnapItResponseSchema.parse(json);
  } catch (e) {
    logger.error('snapit: malformed Gemini response', { userId: args.userId, error: e });
    throw new Error('AI returned an invalid detection — please retry.');
  }

  // Gemini SDK doesn't always expose token counts — best-effort.
  const usage = (
    response as unknown as {
      usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
    }
  ).usageMetadata;
  await recordUsage({
    userId: args.userId,
    service: 'snapit',
    model: MODEL,
    inputTokens: usage?.promptTokenCount ?? 1500,
    outputTokens: usage?.candidatesTokenCount ?? 800,
    durationMs,
    metadata: { source: input.source, items: parsed.detectedItems.length },
  });

  return {
    recognition: parsed,
    usage: { monthlyUsdAfter: before.monthlyUsd + PROJECTED_COST_USD },
  };
}

/**
 * Catalog match — STUB. Replace with a real retrieval layer :
 *   - text embedding (Voyage AI ou Cohere) +
 *   - dimensional filter (±10 % de la `estimatedSize`)
 *   - return top 3 SKUs from `Product` table
 */
async function matchCatalog(
  _description: string,
  _estimatedSize?: { w: number; d: number; h: number }
): Promise<
  Array<{ sku: string; brand: string; label: string; unitPriceEur: number; score: number }>
> {
  // Returning empty so the route still produces a valid response.
  // The frontend renders "no matches yet" gracefully.
  return [];
}
