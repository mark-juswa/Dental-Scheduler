import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../controllers/appointmentsController.js';

const router = Router();

// All appointment routes require authentication
router.use(requireAuth);

router.get('/',     getAppointments);
router.get('/:id',  getAppointment);
router.post('/',    requireAdmin, createAppointment);
router.put('/:id',  requireAdmin, updateAppointment);
router.delete('/:id', requireAdmin, deleteAppointment);

export default router;