const express = require('express');
const router = express.Router();
const { listUsers, createUserHandler, updateUserHandler, deleteUserHandler, listClients, createClientHandler, updateClientHandler, deleteClientHandler, dashboard} = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');
const { signupValidation, clientValidation } = require('../validations/auth');
const { validateRequest } = require('../middlewares/validate');

router.get('/users', authenticate, authorize('admin'), listUsers);
router.get('/dashboard', authenticate, authorize('admin'), dashboard);
router.post('/users', authenticate, authorize('admin'), signupValidation, validateRequest, createUserHandler);
router.put('/users/:id', authenticate, authorize('admin'), updateUserHandler);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUserHandler);
router.get('/clients', authenticate, authorize('admin'), listClients);
router.post('/clients', authenticate, authorize('admin'), clientValidation, validateRequest, createClientHandler);
router.put('/clients/:id', authenticate, authorize('admin'), clientValidation, validateRequest, updateClientHandler);
router.delete('/clients/:id', authenticate, authorize('admin'), deleteClientHandler);

module.exports = router;
