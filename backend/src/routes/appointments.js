import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
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
router.post('/',    createAppointment);
router.put('/:id',  updateAppointment);
router.delete('/:id', deleteAppointment);

export default router;