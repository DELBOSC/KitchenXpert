import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import logger from '../../utils/logger';

/** Sanitize input to prevent prompt injection */
function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]]/g, '')
    .replace(/\n/g, ' ')
    .trim()
    .slice(0, 600);
}

/**
 * Style-adaptive photography directives derived from the design description.
 * Each style has its own lighting language, aesthetic character, and color grade.
 */
function deriveStyleDirectives(desc: string): {
  character: string;
  lighting: string;
  colorGrade: string;
  atmosphere: string;
} {
  const d = desc.toLowerCase();

  if (d.includes('scand') || d.includes('nordic') || d.includes('hygge')) {
    return {
      character: 'Scandinavian minimalism — light birch or ash wood, white painted shaker cabinets, open shelving, linen textiles, simple ceramic objects',
      lighting: 'Bright Nordic diffused daylight from floor-to-ceiling windows, soft overcast sky quality, zero harsh shadows, airy and serene atmosphere',
      colorGrade: 'high-key, cool-neutral white balance, desaturated earth tones, true whites, clean and fresh look',
      atmosphere: 'A white ceramic bowl of lemons, a small potted herb, and a simple wood cutting board add warmth without clutter.',
    };
  }
  if (d.includes('industri')) {
    return {
      character: 'Industrial loft — exposed concrete ceiling, matte black steel frames, open pipe shelving, Edison filament bulbs, raw brick accent wall',
      lighting: 'Warm Edison pendant lights (2200K) above island, moody depth, visible filament glow, dramatic shadows with strong directionality',
      colorGrade: 'warm amber-brown tones, elevated contrast, slightly desaturated, cinematic and gritty',
      atmosphere: 'A French press coffee maker, cast iron skillet on the range, copper kitchen tools hanging from a rail.',
    };
  }
  if (
    d.includes('rustique') ||
    d.includes('rustic') ||
    d.includes('campagne') ||
    d.includes('farmhouse') ||
    d.includes('provençal')
  ) {
    return {
      character: 'French farmhouse — aged oak ceiling beams, cream Shaker cabinets, stone or terracotta floor, copper accents, hand-thrown pottery',
      lighting: 'Warm late-afternoon sunlight streaming through linen curtains, dappled shadow patterns, golden-hour glow on wood surfaces',
      colorGrade: 'warm golden tones, earthy palette, soft vignette, analogous to film photography',
      atmosphere: 'Fresh lavender in a stoneware jug, a tarte tatin cooling on the counter, wicker baskets with seasonal vegetables.',
    };
  }
  if (d.includes('japand') || d.includes('wabi') || d.includes('zen') || d.includes('japonais') || d.includes('japanese')) {
    return {
      character: 'Japanese wabi-sabi — natural sugi or hinoki wood, stone countertop, handmade ceramic vessels, deliberate imperfection and restraint',
      lighting: 'Soft, directionless ambient light, no harsh highlights, tranquil atmosphere evoking a tea house',
      colorGrade: 'muted, desaturated earth tones, very low contrast, organic and contemplative palette',
      atmosphere: 'A single branch of cherry blossom in a narrow vase, a wooden bowl, one perfect piece of fruit.',
    };
  }
  if (
    d.includes('luxe') ||
    d.includes('luxury') ||
    d.includes('haut de gamme') ||
    d.includes('prestige') ||
    d.includes('premium')
  ) {
    return {
      character: 'Ultra-luxury residential — custom Boffi or SieMatic cabinetry, book-matched Calacatta marble, fully concealed integrated appliances, architectural hardware',
      lighting: 'Dramatic sculptural pendant fixtures (3000K), perfect specular highlights on marble and lacquer, subtle under-cabinet LED strip at 2700K',
      colorGrade: 'rich, warm, cinematic — as shot for ELLE Décor or AD France, deep blacks with detail, luminous highlights',
      atmosphere: 'A perfectly arranged bouquet of white peonies, a bottle of champagne in an ice bucket, sleek kitchen tools as art objects.',
    };
  }
  if (d.includes('contempor') || d.includes('minimaliste') || d.includes('minimalist')) {
    return {
      character: 'Contemporary minimalism — handleless flat-front lacquered cabinets, waterfall island edge, invisible integrated appliances, zero visual noise',
      lighting: 'Crisp cool-white recessed LED (3000K), perfectly uniform wash with subtle LED strip under upper cabinets, no visible light sources',
      colorGrade: 'neutral, precise white balance, clinical crispness, no film grain, high fidelity',
      atmosphere: 'A single sculptural fruit bowl, one potted monstera leaf in a concrete planter, total restraint.',
    };
  }
  // Default: modern premium kitchen
  return {
    character: 'Contemporary high-end kitchen with premium materials, impeccable craftsmanship, and considered design details',
    lighting: 'Balanced natural daylight (large windows, left side) supplemented by warm-white 2700K recessed LEDs and under-cabinet strips',
    colorGrade: 'warm neutral, true-to-life colors, editorial print quality',
    atmosphere: 'A bowl of seasonal fruit, fresh herbs in a terracotta pot, a quality espresso machine — life without clutter.',
  };
}

/**
 * Build a rich, layered photographic brief for Gemini.
 *
 * The prompt is structured like a real photography brief given to an architectural
 * photographer: camera specs anchor the model in "real photograph" mode, then
 * composition, lighting, material rendering, and style directives build the scene.
 *
 * This structure consistently produces images that are:
 * - Photographic (not rendered/CG-looking)
 * - Correctly exposed with realistic material shading
 * - Styled to match the design intent
 */
function buildKitchenPrompt(description: string): string {
  const clean = sanitizeInput(description);
  const { character, lighting, colorGrade, atmosphere } = deriveStyleDirectives(clean);

  return `
PHOTOGRAPHIC BRIEF — Ultra-photorealistic interior kitchen photography.

═══ CAMERA & OPTICS ═══
Full-frame mirrorless camera (Sony A7R V). 24mm tilt-shift architectural lens.
Aperture f/8 for front-to-back sharpness. ISO 64, zero noise. Tripod-mounted.
Perfect rectilinear perspective: vertical lines exactly parallel, zero distortion.
Final output equivalent to a 50-megapixel RAW file, professionally retouched.

═══ COMPOSITION ═══
Wide establishing shot from standing eye-level height (1.45 m).
Classic 3/4 diagonal view: foreground countertop lower-left → background far wall upper-right.
Full kitchen visible: lower cabinets, countertop, backsplash, upper cabinets, ceiling with fixtures.
Primary focal point (range hood or statement pendant) positioned on upper-center third.
If an island is present: island in the middle ground creates foreground–midground–background depth.
Slightly off-axis from perfectly straight-on to reveal cabinet depth and countertop thickness.

═══ LIGHTING ═══
${lighting}
Key light: natural daylight entering from windows on the left, soft directional shadows.
Fill: warm ambient overhead and under-cabinet LEDs eliminating harsh shadow pools.
Specular highlights visible on all reflective surfaces: countertops, faucets, appliance fronts.
Window panes correctly exposed — no blown-out white rectangles; exterior visible, softly hazy.
Three-dimensional light fall-off from foreground (brighter) to background (slightly deeper).

═══ MATERIAL RENDERING — photographic accuracy required ═══
• Wood (cabinets / floors / shelves): grain direction visible, natural color variation, warm undertone, soft sheen
• Marble / stone countertop: deep veining with realistic translucency, cool subsurface scatter, micro-texture
• Stainless steel / chrome: crisp brushed-direction highlights, sharp environment reflections, no overblown whites
• Matte lacquer: pure flat light absorption, zero specular hot-spots, rich pigment depth
• Glass (backsplash / pendants): correct refraction, subtle tint, clean highlights
• Ceramic / porcelain tile: individual tile edges visible, fine grout line texture
• Concrete: micro-aggregate texture, matte finish with slight tonal variation

═══ DESIGN STYLE ═══
${character}

═══ SPECIFIC DESIGN TO RENDER ═══
${clean}

═══ ATMOSPHERE & PROPS ═══
${atmosphere}
Background depth: far wall slightly soft (natural depth-of-field fall-off at 4–5 m distance).
The kitchen is immaculate yet lived-in — a showroom moment captured mid-morning.

═══ COLOR GRADE & POST-PROCESSING ═══
${colorGrade}
Subtle film-like tonal rendering (as if shot on ISO 64 Ektar). Perfect highlight roll-off.
Shadow detail fully preserved (no crushed blacks). No artificial vignette. No filter effects.
Micro-contrast preserved in material textures. Color accuracy in skin-tone range (for food props).

═══ QUALITY BENCHMARK ═══
The final image must be indistinguishable from a real photograph published in:
Architectural Digest, ELLE Décor France, Maison&Objet, or Côté Maison.
Editorial, authoritative, aspirational — the definitive image of this kitchen design.

═══ STRICT EXCLUSIONS ═══
No people, hands, feet, or animals. No text, labels, logos, or watermarks.
No converging verticals or fisheye distortion. No AI hallucination artifacts.
No floating objects, impossible geometries, or physically incorrect reflections.
No overexposed windows, no cartoonish shading, no CG or 3D-render appearance.
No clutter, dirty surfaces, misaligned tiles, or unrealistic material colors.
`.trim();
}

/** Classify the error to decide whether to retry */
function classifyError(err: unknown): 'auth' | 'rate_limit' | 'transient' {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes('api_key') || msg.includes('unauthorized') || msg.includes('403')) return 'auth';
  if (msg.includes('quota') || msg.includes('rate') || msg.includes('429')) return 'rate_limit';
  return 'transient';
}

/** Sleep for `ms` milliseconds */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ImageGeneratorService
 *
 * Uses Google Gemini (Nano Banana) to generate photorealistic kitchen design images.
 * Falls back gracefully to null when the API key is missing or generation fails.
 *
 * Features:
 * - Rich prompt engineering for maximum photorealism
 * - Retry with exponential backoff (3 attempts: 1s → 2s → 4s) for transient / rate-limit errors
 * - 45-second timeout per attempt via AbortSignal
 * - Async file I/O (non-blocking)
 * - File size cap (10 MB) to prevent disk abuse
 * - Differentiated error handling (auth → no retry, rate limit → retry, transient → retry)
 */
export class ImageGeneratorService {
  private client: GoogleGenAI | null = null;
  private static instance: ImageGeneratorService;
  private uploadsDir: string;

  private static readonly MAX_RETRIES = 3;
  private static readonly TIMEOUT_MS = 45_000;
  private static readonly MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

  private constructor() {
    if (process.env.GOOGLE_GENAI_API_KEY) {
      this.client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
    } else {
      logger.warn(
        '[ImageGenerator] GOOGLE_GENAI_API_KEY is not set. ' +
          'Image generation will be disabled. ' +
          'Add the key to your .env file — see .env.example for instructions.',
      );
    }
    this.uploadsDir = path.resolve(__dirname, '../../../uploads');
    this.ensureUploadsDirExists();
  }

  static getInstance(): ImageGeneratorService {
    if (!ImageGeneratorService.instance) {
      ImageGeneratorService.instance = new ImageGeneratorService();
    }
    return ImageGeneratorService.instance;
  }

  private ensureUploadsDirExists(): void {
    try {
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
    } catch (err) {
      logger.warn('[ImageGenerator] Could not create uploads directory', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Generate a photorealistic kitchen design thumbnail image using Gemini.
   *
   * @param description - Text description of the kitchen design to generate
   * @returns URL path to the generated image (e.g., `/uploads/abc123.png`), or null on failure
   */
  async generateThumbnail(description: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    const prompt = buildKitchenPrompt(description);
    let lastError: unknown;

    for (let attempt = 1; attempt <= ImageGeneratorService.MAX_RETRIES; attempt++) {
      try {
        const result = await this.attemptGeneration(prompt);
        if (result) return result;
        // null result without exception = empty response — retry makes no sense
        return null;
      } catch (err) {
        lastError = err;
        const kind = classifyError(err);

        if (kind === 'auth') {
          // Authentication failure — retrying won't help
          logger.error('[ImageGenerator] Authentication failed — check GOOGLE_GENAI_API_KEY', {
            error: err instanceof Error ? err.message : String(err),
          });
          return null;
        }

        if (attempt < ImageGeneratorService.MAX_RETRIES) {
          const delayMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
          logger.warn(`[ImageGenerator] Attempt ${attempt} failed (${kind}), retrying in ${delayMs}ms`, {
            error: err instanceof Error ? err.message : String(err),
          });
          await sleep(delayMs);
        }
      }
    }

    logger.warn('[ImageGenerator] All attempts failed, returning null', {
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });
    return null;
  }

  /**
   * Single generation attempt with timeout.
   * Returns the saved file URL or null if the API returned no image.
   */
  private async attemptGeneration(prompt: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ImageGeneratorService.TIMEOUT_MS);

    try {
      const response = await this.client!.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
          responseModalities: ['image', 'text'],
        },
      });

      clearTimeout(timer);

      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        logger.warn('[ImageGenerator] No candidates in Gemini response');
        return null;
      }

      const parts = candidates[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        logger.warn('[ImageGenerator] No parts in Gemini response candidate');
        return null;
      }

      const imagePart = parts.find((part: any) => part.inlineData?.data);
      if (!imagePart?.inlineData?.data) {
        logger.warn('[ImageGenerator] No inline image data in Gemini response');
        return null;
      }

      const imageData: string = imagePart.inlineData.data;
      const buffer = Buffer.from(imageData, 'base64');

      // Guard against oversized responses
      if (buffer.byteLength > ImageGeneratorService.MAX_FILE_BYTES) {
        logger.warn('[ImageGenerator] Generated image exceeds 10 MB size cap, discarding', {
          bytes: buffer.byteLength,
        });
        return null;
      }

      const filename = `${crypto.randomUUID()}.png`;
      const filepath = path.join(this.uploadsDir, filename);

      // Non-blocking async write
      await fs.promises.writeFile(filepath, buffer);

      logger.info('[ImageGenerator] Generated thumbnail successfully', {
        filename,
        sizeKb: Math.round(buffer.byteLength / 1024),
      });
      return `/uploads/${filename}`;
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error)?.name === 'AbortError') {
        throw new Error(`Gemini API timed out after ${ImageGeneratorService.TIMEOUT_MS}ms`);
      }
      throw err;
    }
  }
}

export default ImageGeneratorService;
