import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { getAuditLog, clearAuditLog } from '../controllers/auditController.js';

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/',    getAuditLog);
router.delete('/', clearAuditLog);

export default router;