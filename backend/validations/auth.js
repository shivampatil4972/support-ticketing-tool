const { body } = require('express-validator');

const roles = ['client', 'agent', 'admin'];

const signupValidation = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  body('email').isEmail().isLength({ max: 255 }).withMessage('Valid email is required'),
  body('password').isString().isLength({ min: 6, max: 72 }).withMessage('Password must be between 6 and 72 characters')
];

// Admin-created accounts must state a role; public signup is always a client
const adminUserValidation = [
  ...signupValidation,
  body('role').isIn(roles).withMessage('Invalid role'),
  body('client_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Client ID must be a number')
];

const userUpdateValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  body('email').optional().isEmail().isLength({ max: 255 }).withMessage('Valid email is required'),
  body('role').optional().isIn(roles).withMessage('Invalid role'),
  body('client_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Client ID must be a number')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required')
];

const ticketValidation = [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters'),
  body('description').trim().isLength({ min: 10, max: 10000 }).withMessage('Description must be between 10 and 10000 characters'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
];

const commentValidation = [
  body('message').trim().isLength({ min: 1, max: 10000 }).withMessage('Message must be between 1 and 10000 characters')
];
// A null assigned_agent_id returns the ticket to the unassigned queue
const assignValidation = [
  body('assigned_agent_id')
    .custom((value) => value === null || /^[1-9]\d{0,9}$/.test(String(value)))
    .withMessage('Assigned Agent ID must be a number, or null to unassign')
];
const clientValidation = [
  body('organization_name').trim().isLength({ min: 2, max: 255 }).withMessage('Organization name must be between 2 and 255 characters')
];

const statusValidation = [
  body('status').isIn(['open', 'pending', 'closed']).withMessage('Invalid status. Must be open, pending, or closed')
];

module.exports = { signupValidation, adminUserValidation, userUpdateValidation, loginValidation, ticketValidation, commentValidation, assignValidation, clientValidation, statusValidation };
