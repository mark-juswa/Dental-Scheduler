import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { getSettings, saveSettings } from '../controllers/settingsController.js';

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/',  getSettings);
router.put('/',  saveSettings);

export default router;