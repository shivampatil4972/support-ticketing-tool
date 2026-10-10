const { validationResult } = require('express-validator');
const { sendResponse } = require('../utils/response');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendResponse(res, 400, false, null, 'Validation failed', errors.array());
  }
  next();
};

module.exports = { validateRequest };
