const { body } = require('express-validator');

const signupValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['client', 'agent', 'admin']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const ticketValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title is required'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
];

const commentValidation = [
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required')
];
const assignValidation = [
  body('assigned_agent_id')
    .notEmpty()
    .withMessage('Assigned Agent ID is required')
    .isInt()
    .withMessage('Assigned Agent ID must be a number')
];
const clientValidation = [
  body('organization_name').trim().isLength({ min: 2 }).withMessage('Organization name must be at least 2 characters')
];

const statusValidation = [
  body('status').isIn(['open', 'pending', 'closed']).withMessage('Invalid status. Must be open, pending, or closed')
];

module.exports = { signupValidation, loginValidation, ticketValidation, commentValidation, assignValidation, clientValidation, statusValidation };
