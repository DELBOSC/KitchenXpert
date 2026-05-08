/**
 * Export Routes
 * Provides CSV/JSON data exports for admin users.
 * GET /api/v1/export/:entity?format=csv|json
 */

import { Router, type Router as RouterType, type Request, type Response } from 'express';

import { ExportService, type ExportFormat, type ExportEntity } from '../../services/export.service';
import logger from '../../utils/logger';
import { authenticate, requireRole } from '../middleware/auth-middleware';

const router: RouterType = Router();

// All export routes require admin authentication
router.use(authenticate);
router.use(requireRole('admin'));

const VALID_ENTITIES: ExportEntity[] = [
  'users',
  'orders',
  'projects',
  'kitchens',
  'products',
];

/**
 * @swagger
 * /api/v1/export/{entity}:
 *   get:
 *     summary: Export entity data as CSV or JSON
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *           enum: [users, orders, projects, kitchens, products]
 *         description: The entity type to export
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *     responses:
 *       200:
 *         description: Exported data file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid entity or format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Export failed
 */
router.get('/:entity', async (req: Request, res: Response) => {
  try {
    const entity = req.params.entity as ExportEntity;
    const format = (req.query.format as ExportFormat) || 'csv';

    if (!VALID_ENTITIES.includes(entity)) {
      res.status(400).json({
        error: `Invalid entity. Valid entities: ${VALID_ENTITIES.join(', ')}`,
      });
      return;
    }

    if (format !== 'csv' && format !== 'json') {
      res.status(400).json({
        error: 'Invalid format. Use csv or json.',
      });
      return;
    }

    const result = await ExportService.exportData(entity, format);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`
    );
    res.send(result.data);
  } catch (error) {
    logger.error('[Export] Error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
