import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSettings, saveSettings } from '../controllers/settingsController.js';

const router = Router();

router.use(requireAuth);

router.get('/',  getSettings);
router.put('/',  saveSettings);

export default router;