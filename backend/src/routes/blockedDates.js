import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getBlockedDates,
  blockDate,
  unblockDate,
} from '../controllers/blockedDatesController.js';

const router = Router();

router.use(requireAuth);

router.get('/',     getBlockedDates);
router.post('/',    blockDate);
router.delete('/:id', unblockDate);

export default router;