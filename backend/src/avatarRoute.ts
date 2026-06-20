/**
 * avatarRoute.ts
 * AI Eco-Avatar generation endpoint.
 *
 * Security:
 * - multer configured with strict MIME-type whitelist and 5MB size cap.
 * - File is stored only in memory (never written to disk).
 * - Replicate API key read from environment variable (never hardcoded).
 *
 * AI Prompt contract (per spec):
 * The exact prompt below is hardcoded and must not be altered.
 */

import { Router, Request, Response } from 'express';
import multer, { memoryStorage } from 'multer';

/* ── Multer configuration ──────────────────────────────────────────────────── */

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted.'));
    }
  },
});

/* ── Exact AI Prompt (specified in feature contract — do not modify) ─────── */

const ECO_AVATAR_PROMPT =
  'Eco-warrior portrait, lush tropical jungle background, soft golden hour rim lighting, ' +
  'photorealistic, 8K resolution. ' +
  'CRITICAL: The subject\'s clothing and costume must remain completely unchanged from the ' +
  'reference photo. Face quality must be heavily enhanced to maintain exact natural likeness ' +
  '— do not generate a generic face. All shadows must be completely removed from all facial ' +
  'features for a clean, flat-lit, radiant appearance.';

const ECO_AVATAR_NEGATIVE_PROMPT =
  'blurry, low quality, generic face, different clothing, shadows on face, dark shadows, ' +
  'cartoon, anime, illustration, deformed, ugly, extra limbs, bad anatomy';

/* ── Router ────────────────────────────────────────────────────────────────── */

export const avatarRouter = Router();

/**
 * POST /api/avatar/generate
 *
 * Accepts a multipart/form-data upload with a single field `photo`.
 * Converts the image to a base64 data URI and sends it to the
 * Replicate img2img endpoint.
 *
 * Required env: REPLICATE_API_TOKEN
 */
avatarRouter.post(
  '/generate',
  upload.single('photo'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No image file received. Please upload a valid JPEG, PNG, or WebP.',
          code:  'NO_FILE',
        });
      }

      const apiToken = process.env.REPLICATE_API_TOKEN;
      if (!apiToken) {
        return res.status(503).json({
          error: 'AI avatar service is not configured. Set REPLICATE_API_TOKEN.',
          code:  'SERVICE_UNAVAILABLE',
        });
      }

      // Convert buffer to base64 data URI for Replicate API
      const mimeType   = req.file.mimetype;
      const base64Data = req.file.buffer.toString('base64');
      const dataUri    = `data:${mimeType};base64,${base64Data}`;

      // ── Call Replicate API (SDXL img2img) ────────────────────────────────
      const replicateResponse = await fetch(
        'https://api.replicate.com/v1/models/stability-ai/sdxl/predictions',
        {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type':  'application/json',
            'Prefer':        'wait', // Wait for result (sync mode, max 60s)
          },
          body: JSON.stringify({
            input: {
              image:           dataUri,
              prompt:          ECO_AVATAR_PROMPT,
              negative_prompt: ECO_AVATAR_NEGATIVE_PROMPT,
              prompt_strength: 0.65,    // 65% prompt adherence — preserves subject features
              num_outputs:     1,
              guidance_scale:  7.5,
              num_inference_steps: 40,
            },
          }),
        },
      );

      if (!replicateResponse.ok) {
        const errBody = await replicateResponse.text();
        console.error('[AvatarRoute] Replicate API error:', errBody);
        return res.status(502).json({
          error: 'AI generation service returned an error. Please try again.',
          code:  'AI_UPSTREAM_ERROR',
        });
      }

      const prediction = await replicateResponse.json() as {
        status: string;
        output: string[] | null;
        error?: string;
      };

      if (prediction.status === 'failed' || prediction.error) {
        return res.status(502).json({
          error: prediction.error || 'AI generation failed.',
          code:  'AI_GENERATION_FAILED',
        });
      }

      const outputUrl = prediction.output?.[0];
      if (!outputUrl) {
        return res.status(504).json({
          error: 'AI generation timed out or produced no output.',
          code:  'AI_TIMEOUT',
        });
      }

      return res.status(200).json({ success: true, imageUrl: outputUrl });

    } catch (err) {
      console.error('[AvatarRoute] Unhandled error:', err);
      return res.status(500).json({
        error: 'Internal server error during avatar generation.',
        code:  'INTERNAL_SERVER_ERROR',
      });
    }
  },
);
