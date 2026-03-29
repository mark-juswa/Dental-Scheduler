import { Router } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';
import { getUsers, updateUserRole, deleteUser } from '../controllers/usersController.js';

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/', getUsers);
router.put('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);

export default router;
