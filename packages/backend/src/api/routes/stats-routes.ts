/**
 * Public stats — un seul GET pour alimenter le `<LiveCounter>` du
 * marketing site.
 *
 * Mis en cache 60 s en mémoire pour ne pas marteler la base à chaque
 * tick (1 poll / 30 s × N visiteurs simultanés = vite trop). Pas de
 * Redis ici : le compteur est non-critique, le cache mémoire suffit.
 *
 * Endpoint public (pas d'authenticate). Aucune donnée personnelle —
 * uniquement des compteurs anonymisés.
 */
import { Router, type Router as RouterType, type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import logger from '../../utils/logger';

const router: RouterType = Router();

interface CachedStats {
  data: {
    kitchensDesigned: number;
    quotesGeneratedThisMonth: number;
    verifiedInstallers: number;
  };
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
let cache: CachedStats | null = null;

async function computeStats(): Promise<CachedStats['data']> {
  // Use Promise.all so the 3 queries run in parallel — sub-200ms total
  // on a warm Postgres connection.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [kitchensDesigned, quotesGeneratedThisMonth, verifiedInstallers] = await Promise.all([
    // Cuisines actives (non supprimées)
    prisma.kitchen.count({ where: { deletedAt: null } }),
    // Devis générés ce mois — uses the `Quote` model if it exists;
    // fallback to 0 if the table isn't there yet (early-stage launch).
    (prisma as unknown as { quote?: { count: (args: { where: object }) => Promise<number> } }).quote
      ?.count?.({ where: { createdAt: { gte: monthStart } } })
      .catch(() => 0) ?? 0,
    // Installateurs vérifiés et actifs sur la marketplace
    prisma.installer.count({ where: { isVerified: true, isActive: true } }).catch(() => 0),
  ]);

  return {
    kitchensDesigned: Number(kitchensDesigned) || 0,
    quotesGeneratedThisMonth: Number(quotesGeneratedThisMonth) || 0,
    verifiedInstallers: Number(verifiedInstallers) || 0,
  };
}

/**
 * @swagger
 * /api/v1/stats/public:
 *   get:
 *     summary: Public counters for the LiveCounter widget.
 *     description: |
 *       Returns 3 anonymised counters. Cached for 60 s in memory.
 *       No personal data, no auth required.
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     kitchensDesigned:           { type: integer }
 *                     quotesGeneratedThisMonth:   { type: integer }
 *                     verifiedInstallers:         { type: integer }
 */
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (!cache || cache.expiresAt < now) {
      const data = await computeStats();
      cache = { data, expiresAt: now + CACHE_TTL_MS };
    }
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).json({ success: true, data: cache.data });
  } catch (e) {
    logger.error('public stats failed', e);
    // Soft-fail: send the last known value if we have one, otherwise zeros.
    res.status(200).json({
      success: true,
      data: cache?.data ?? {
        kitchensDesigned: 0,
        quotesGeneratedThisMonth: 0,
        verifiedInstallers: 0,
      },
    });
  }
});

export default router;
