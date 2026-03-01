import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAuditLog, clearAuditLog } from '../controllers/auditController.js';

const router = Router();

router.use(requireAuth);

router.get('/',    getAuditLog);
router.delete('/', clearAuditLog);

export default router;