import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, me } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  login
);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
