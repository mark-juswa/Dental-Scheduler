import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from '../controllers/clientsController.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/',     getClients);
router.get('/:id',  getClient);
router.post('/',    createClient);
router.put('/:id',  updateClient);
router.delete('/:id', deleteClient);

export default router;