import { Router } from 'express';
import { body } from 'express-validator';
import { listTickets, createTicket, getTicket, updateTicket, deleteTicket } from '../controllers/tickets.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

router.get('/', listTickets);

router.post('/',
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('description').trim().notEmpty(),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('assignedToId').optional().isString(),
  validate,
  createTicket
);

router.get('/:id', getTicket);

router.patch('/:id',
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('assignedToId').optional(),
  validate,
  updateTicket
);

router.delete('/:id', requireAdmin, deleteTicket);

export default router;
