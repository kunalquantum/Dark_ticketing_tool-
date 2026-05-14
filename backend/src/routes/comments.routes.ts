import { Router } from 'express';
import { body } from 'express-validator';
import { listComments, createComment } from '../controllers/comments.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/', listComments);

router.post('/',
  body('body').trim().notEmpty(),
  body('isInternal').optional().isBoolean(),
  validate,
  createComment
);

export default router;
