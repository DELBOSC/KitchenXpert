import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { gdprController } from '../controllers/gdpr-controller';
import { authenticate } from '../middleware/auth-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

const erasureSchema = z.object({
  reason: z.string().max(500).optional(),
  confirm: z.literal(true, { errorMap: () => ({ message: 'Vous devez confirmer explicitement (confirm: true)' }) }),
});

router.get('/summary', authenticate, gdprController.getSummary);
router.get('/export', authenticate, gdprController.exportData);
router.delete('/account', authenticate, validateBody(erasureSchema), gdprController.requestErasure);

export default router;
