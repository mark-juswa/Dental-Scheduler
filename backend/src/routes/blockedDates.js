import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getBlockedDates,
  blockDate,
  unblockDate,
} from '../controllers/blockedDatesController.js';

const router = Router();

router.use(requireAuth);

router.get('/',     getBlockedDates);
router.post('/',    requireAdmin, blockDate);
router.delete('/:id', requireAdmin, unblockDate);

export default router;