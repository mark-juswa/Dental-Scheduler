import express from 'express';
import multer from 'multer';
import { exportBackup, restoreBackup, purgeBackup } from '../controllers/backupController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/export', exportBackup);
router.post('/restore', upload.single('backupFile'), restoreBackup);
router.delete('/purge', purgeBackup);

export default router;
