/**
 * GenerateLayoutFromPromptUseCase — orchestrate the 3-step auto-layout
 * pipeline.
 *
 *   1. Claude Sonnet 4.6 parses the user's free-text brief and returns
 *      3 layout proposals (zod-validated).
 *   2. We re-verify totals + that each item fits within room bounds.
 *   3. (Optional, premium tier only) Gemini Flash Image generates a
 *      photoreal preview for each proposal — 3 images at $0.025 each.
 *
 * Cost guard : `assertQuota()` is called BEFORE the Claude request with
 * a projected cost. If the user is sandbox-tier or already over the
 * monthly cap, we return 402 Payment Required.
 */
import Anthropic from '@anthropic-ai/sdk';

import {
  assertQuota,
  recordUsage,
  computeCostUsd,
  type AiTier,
} from '../../services/ai/cost-monitor.service';
import { AUTO_LAYOUT_SYSTEM_PROMPT } from '../../services/ai/prompts';
import {
  AutoLayoutInputSchema,
  AutoLayoutResponseSchema,
  type AutoLayoutInput,
  type AutoLayoutResponse,
} from '../../services/ai/schemas';
import logger from '../../utils/logger';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000; // 3 proposals of ~30 items each = ~5k output tokens
const PROJECTED_COST_USD = 0.04; // 2k input + 5k output at sonnet pricing ≈ 0.04 USD

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export interface GenerateLayoutArgs {
  userId: string;
  tier: AiTier;
  input: AutoLayoutInput;
  /** If true AND tier ∈ {premium, studio}, also call Gemini for 3 preview images. */
  generatePreviews?: boolean;
}

export interface GenerateLayoutResult {
  layouts: AutoLayoutResponse;
  /** Per-proposal preview URL, only present if `generatePreviews` ran. */
  previewUrls?: string[];
  /** Echoed usage info for the frontend usage meter. */
  usage: {
    monthlyUsdAfter: number;
    monthlyUsdLimit: number | null;
  };
}

export async function generateLayoutFromPrompt(
  args: GenerateLayoutArgs,
): Promise<GenerateLayoutResult> {
  const input = AutoLayoutInputSchema.parse(args.input);

  // 1. Quota pre-check — fail fast before we burn tokens.
  const usageBefore = await assertQuota({
    userId: args.userId,
    tier: args.tier,
    projectedUsd: PROJECTED_COST_USD,
  });

  // 2. Call Claude.
  const start = Date.now();
  const userPrompt = buildUserPrompt(input);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: AUTO_LAYOUT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const durationMs = Date.now() - start;

  // 3. Extract the JSON from the assistant message.
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content');
  }

  let parsed: AutoLayoutResponse;
  try {
    parsed = AutoLayoutResponseSchema.parse(JSON.parse(textBlock.text));
  } catch (e) {
    logger.error('auto-layout: malformed Claude response', {
      userId: args.userId,
      raw: textBlock.text.slice(0, 500),
      error: e,
    });
    throw new Error('AI returned an invalid layout — please retry.');
  }

  // 4. Verify totals + bounds.
  for (const proposal of parsed.proposals) {
    const computedTotal = proposal.items.reduce((acc, it) => acc + it.unitPriceEur, 0);
    if (Math.abs(computedTotal - proposal.totalEur) > 50) {
      proposal.totalEur = computedTotal; // trust our math, not Claude's
    }
    for (const item of proposal.items) {
      if (
        item.position.x < 0 || item.position.x > proposal.room.widthCm ||
        item.position.y < 0 || item.position.y > proposal.room.depthCm ||
        item.position.z < 0 || item.position.z > proposal.room.heightCm
      ) {
        logger.warn('auto-layout: item out of bounds (clipped)', { userId: args.userId, sku: item.sku });
        // Clip to the wall — better than rejecting the whole proposal.
        item.position.x = Math.max(0, Math.min(item.position.x, proposal.room.widthCm - item.size.w));
        item.position.y = Math.max(0, Math.min(item.position.y, proposal.room.depthCm - item.size.d));
        item.position.z = Math.max(0, Math.min(item.position.z, proposal.room.heightCm - item.size.h));
      }
    }
  }

  // 5. Record usage.
  const actualCost = computeCostUsd({
    model: MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  });
  await recordUsage({
    userId: args.userId,
    service: 'auto-layout',
    model: MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    durationMs,
    metadata: { prompt: input.prompt.slice(0, 200), parsedStyle: parsed.parsed.style },
  });

  // 6. (Optional) Gemini previews — TODO when the image pipeline ships.
  //    For now we return undefined and the frontend renders a placeholder.
  const previewUrls = args.generatePreviews && (args.tier === 'premium' || args.tier === 'studio')
    ? await generatePreviewsStub(parsed)
    : undefined;

  return {
    layouts: parsed,
    previewUrls,
    usage: {
      monthlyUsdAfter: usageBefore.monthlyUsd + actualCost,
      monthlyUsdLimit: getCapForTier(args.tier),
    },
  };
}

function buildUserPrompt(input: AutoLayoutInput): string {
  // Pre-format the parameters Claude would otherwise have to parse out
  // of the free text. Cheaper + more reliable.
  const lines = [`<user_brief>`, input.prompt.trim(), `</user_brief>`, ''];

  if (input.room) {
    lines.push(`<room>`);
    if (input.room.widthCm)  {lines.push(`  width_cm: ${input.room.widthCm}`);}
    if (input.room.depthCm)  {lines.push(`  depth_cm: ${input.room.depthCm}`);}
    lines.push(`  height_cm: ${input.room.heightCm ?? 270}`);
    lines.push(`</room>`);
  }
  if (input.preferredLayout) {lines.push(`<preferred_layout>${input.preferredLayout}</preferred_layout>`);}
  if (input.budgetEur)       {lines.push(`<budget_eur>${input.budgetEur}</budget_eur>`);}
  if (input.preferredBrand)  {lines.push(`<preferred_brand>${input.preferredBrand}</preferred_brand>`);}

  lines.push('');
  lines.push('Produis exactement 3 propositions au format JSON spécifié dans le system prompt.');

  return lines.join('\n');
}

async function generatePreviewsStub(_parsed: AutoLayoutResponse): Promise<string[]> {
  // TODO: wire the Gemini Flash Image pipeline once the image-generation
  // service is consolidated. Skeleton :
  //
  //   const { GoogleGenAI } = await import('@google/genai');
  //   const gen = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
  //   const urls = await Promise.all(parsed.proposals.map(async (p) => {
  //     const prompt = `${p.rationale} ${p.layout} kitchen, photorealistic, soft daylight, 8k`;
  //     const result = await gen.models.generateImages({ model: 'gemini-2.5-flash-image', prompt });
  //     return uploadToS3(result.images[0].base64);
  //   }));
  //   return urls;
  return [];
}

function getCapForTier(tier: AiTier): number | null {
  const caps: Record<AiTier, number | null> = {
    sandbox: 0.20, free: 1.00, premium: 20.00, studio: null,
  };
  return caps[tier];
}
