import { Router } from 'express';
import { body } from 'express-validator';
import { listUsers, createUser, updateUser } from '../controllers/users.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get('/', listUsers);

router.post('/',
  requireAdmin,
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['ADMIN', 'AGENT']),
  validate,
  createUser
);

router.patch('/:id',
  requireAdmin,
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['ADMIN', 'AGENT']),
  body('isActive').optional().isBoolean(),
  body('password').optional().isLength({ min: 8 }),
  validate,
  updateUser
);

export default router;
