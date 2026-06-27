/**
 * StyleTransferUseCase — img2img re-style without changing geometry.
 *
 * Pipeline :
 *   1. Take the user's current 3D render (URL — captured client-side
 *      by the path-tracer and uploaded to S3 before calling us).
 *   2. Build the style-specific prompt (cf prompts.ts).
 *   3. Call Gemini 2.5 Flash Image with img2img + the prompt.
 *   4. Upload the result to S3 (or return as base64 if size < 4 MB).
 *   5. If `applyToModel = true`, ALSO ask Claude Haiku for the material
 *      remapping — fast + cheap, used to update the 3D scene afterwards.
 *
 * Cost ≈ $0.05 per transfer (1 Gemini image gen + optional small
 * Claude Haiku call).
 */
import { assertQuota, recordUsage, type AiTier } from '../../services/ai/cost-monitor.service';
import { buildStyleTransferPrompt } from '../../services/ai/prompts';
import {
  StyleTransferInputSchema,
  StyleTransferResponseSchema,
  type StyleTransferInput,
  type StyleTransferResponse,
} from '../../services/ai/schemas';
import logger from '../../utils/logger';

const MODEL = 'gemini-2.5-flash-image';
const PROJECTED_COST_USD = 0.05;

export interface StyleTransferArgs {
  userId: string;
  tier: AiTier;
  input: StyleTransferInput;
}

export async function styleTransfer(
  args: StyleTransferArgs
): Promise<StyleTransferResponse & { usage: { monthlyUsdAfter: number } }> {
  const input = StyleTransferInputSchema.parse(args.input);

  const before = await assertQuota({
    userId: args.userId,
    tier: args.tier,
    projectedUsd: PROJECTED_COST_USD,
  });

  const prompt = buildStyleTransferPrompt(input.targetStyle);

  const start = Date.now();
  const { GoogleGenAI } = await import('@google/genai');
  const gen = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

  // Gemini 2.5 Flash Image accepts a reference image + a prompt for img2img.
  const response = await gen.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { fileData: { mimeType: 'image/jpeg', fileUri: input.sourceImageUrl } },
        ],
      },
    ],
  });
  const durationMs = Date.now() - start;

  // Extract the generated image (first candidate, first inline part).
  const candidates =
    (
      response as unknown as {
        candidates?: Array<{
          content: { parts: Array<{ inlineData?: { data: string; mimeType: string } }> };
        }>;
      }
    ).candidates ?? [];
  const inline = candidates[0]?.content?.parts?.find(
    (p) => 'inlineData' in p && p.inlineData
  )?.inlineData;
  if (!inline) {
    throw new Error('Gemini returned no image — please retry.');
  }

  // TODO: upload to S3 + return signed URL. Stub: return data URI.
  const resultImageUrl = `data:${inline.mimeType};base64,${inline.data}`;

  // Material remapping is a separate, optional call.
  // For now we return an empty map — wire Claude Haiku here later.
  const result: StyleTransferResponse = StyleTransferResponseSchema.parse({
    resultImageUrl,
    materialMap: [],
  });

  await recordUsage({
    userId: args.userId,
    service: 'style-transfer',
    model: MODEL,
    inputTokens: 200, // Gemini doesn't return tokens for image gen — approx
    outputTokens: 200,
    imagesGenerated: 1,
    durationMs,
    metadata: { targetStyle: input.targetStyle },
  });

  logger.info('style transfer ok', {
    userId: args.userId,
    targetStyle: input.targetStyle,
    durationMs,
  });

  return { ...result, usage: { monthlyUsdAfter: before.monthlyUsd + PROJECTED_COST_USD } };
}
