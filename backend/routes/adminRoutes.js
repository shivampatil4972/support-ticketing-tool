const express = require('express');
const router = express.Router();
const { listUsers, createUserHandler, updateUserHandler, deleteUserHandler, listClients, createClientHandler, updateClientHandler, deleteClientHandler, dashboard, performance } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');
const { adminUserValidation, userUpdateValidation, clientValidation } = require('../validations/auth');
const { validateRequest, requireNumericId } = require('../middlewares/validate');

router.param('id', requireNumericId);

router.get('/users', authenticate, authorize('admin'), listUsers);
router.get('/dashboard', authenticate, authorize('admin'), dashboard);
router.get('/performance', authenticate, authorize('admin'), performance);
router.post('/users', authenticate, authorize('admin'), adminUserValidation, validateRequest, createUserHandler);
router.put('/users/:id', authenticate, authorize('admin'), userUpdateValidation, validateRequest, updateUserHandler);
router.delete('/users/:id', authenticate, authorize('admin'), deleteUserHandler);
router.get('/clients', authenticate, authorize('admin'), listClients);
router.post('/clients', authenticate, authorize('admin'), clientValidation, validateRequest, createClientHandler);
router.put('/clients/:id', authenticate, authorize('admin'), clientValidation, validateRequest, updateClientHandler);
router.delete('/clients/:id', authenticate, authorize('admin'), deleteClientHandler);

module.exports = router;
